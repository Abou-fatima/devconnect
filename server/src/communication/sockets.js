const mongoose = require('mongoose');
const Utilisateur = require('../models/Utilisateur');
const Echange = require('../models/Echange');
const { verifyToken } = require('../utils/jwt');
const { parseCanal } = require('./canaux');
const { notifierMentions, notifierMessagePrive, notifierReaction } = require('./notifications/notifier');
const { apercuMessage } = require('../services/prives');
const { emojiValide, appliquer, grouper } = require('../services/reactions');
const { transcriptionDe } = require('../services/audio');
const { imageDe, formeUrlValide } = require('../services/imagesChat');
const Salon = require('../models/Salon');
const { verifierAcces } = require('../services/salons');

const MAX_CONTENU = 2000;
const LIMITE_MSG = { max: 20, fenetreMs: 10_000 }; // 20 messages / 10 s / socket

// Un audio ne peut venir que de notre propre upload (étape E : /api/audio)
const audioValide = (u) => typeof u === 'string' && /^\/uploads\/[\w./-]+$/.test(u) && !u.includes('..');

// Exécute le callback d'acquittement s'il existe
const reponse = (ack, data) => { if (typeof ack === 'function') ack(data); };

module.exports = (io) => {
  // 1. Authentification : socket.handshake.auth.token (JWT émis par /api/auth)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error('Authentification requise'));
      let payload;
      try { payload = verifyToken(token); } catch { return next(new Error('Token invalide ou expiré')); }
      const user = await Utilisateur.findById(payload.sub).select('pseudo');
      if (!user) return next(new Error('Compte introuvable'));
      socket.data.user = { id: String(user._id), pseudo: user.pseudo };
      next();
    } catch (e) { next(new Error('Erreur d\'authentification')); }
  });

  io.on('connection', (socket) => {
    const { id: userId, pseudo } = socket.data.user;
    socket.join(`user:${userId}`); // salle personnelle : reçoit les événements « notification »

    let envoyes = [];
    const tropRapide = () => {
      const now = Date.now();
      envoyes = envoyes.filter((t) => now - t < LIMITE_MSG.fenetreMs);
      if (envoyes.length >= LIMITE_MSG.max) return true;
      envoyes.push(now);
      return false;
    };

    // join_canal { canal }  ->  ack { ok, canal } | { ok:false, erreur }
    socket.on('join_canal', async (payload, ack) => {
      try {
        const c = parseCanal(payload && payload.canal, userId);
        if (c.erreur) return reponse(ack, { ok: false, erreur: c.erreur });
        const acces = await verifierAcces(c, userId); // salon créé par un utilisateur : réservé aux membres
        if (acces.erreur) return reponse(ack, { ok: false, erreur: acces.erreur });
        socket.join(c.canal);
        reponse(ack, { ok: true, canal: c.canal });
      } catch (e) {
        console.error('[socket join_canal]', e.message);
        reponse(ack, { ok: false, erreur: 'Erreur serveur' });
      }
    });

    // leave_canal { canal }
    socket.on('leave_canal', (payload, ack) => {
      const c = parseCanal(payload && payload.canal, userId);
      if (c.erreur) return reponse(ack, { ok: false, erreur: c.erreur });
      socket.leave(c.canal);
      reponse(ack, { ok: true, canal: c.canal });
    });

    // message { canal, contenu?, audio_url?, image_url? }  ->  diffusé à tout le canal (expéditeur compris)
    socket.on('message', async (payload, ack) => {
      try {
        const c = parseCanal(payload && payload.canal, userId);
        if (c.erreur) return reponse(ack, { ok: false, erreur: c.erreur });
        if (!socket.rooms.has(c.canal)) return reponse(ack, { ok: false, erreur: 'Rejoignez d\'abord le canal (join_canal)' });

        const contenu = typeof payload.contenu === 'string' ? payload.contenu.trim() : '';
        const audio = payload.audio_url;
        const imageUrl = payload.image_url;
        if (!contenu && !audio && !imageUrl) return reponse(ack, { ok: false, erreur: 'Message vide' });
        if (contenu.length > MAX_CONTENU) return reponse(ack, { ok: false, erreur: `Maximum ${MAX_CONTENU} caractères` });
        if (audio && !audioValide(audio)) return reponse(ack, { ok: false, erreur: 'audio_url invalide' });
        if (imageUrl && !formeUrlValide(imageUrl)) return reponse(ack, { ok: false, erreur: 'image_url invalide' });
        if (tropRapide()) return reponse(ack, { ok: false, erreur: 'Trop de messages, ralentissez' });
        const image = imageUrl ? await imageDe(imageUrl, userId) : undefined; // doit être une image envoyée par cette personne
        if (imageUrl && !image) return reponse(ack, { ok: false, erreur: 'image_url invalide' });

        const doc = await Echange.create({
          type: 'message',
          auteur_id: userId,
          cible_type: c.cible_type,
          ...(c.cible_id ? { cible_id: c.cible_id } : {}),
          contenu: contenu || undefined,
          audio_url: audio || undefined,
          image_url: image,
          transcription: audio ? await transcriptionDe(audio, userId) : undefined,
          metadata: { canal: c.canal }
        });

        const message = {
          id: String(doc._id),
          canal: c.canal,
          auteur: { id: userId, pseudo },
          contenu: doc.contenu || null,
          audio_url: doc.audio_url || null,
          image_url: doc.image_url || null,
          transcription: doc.transcription || null,
          created_at: doc.created_at
        };
        io.to(c.canal).emit('message', message);
        if (c.salon_id) {
          // Trie « mes salons » et prévient chaque autre membre (salle personnelle) pour son compteur de messages non lus.
          Salon.findOneAndUpdate({ _id: c.salon_id }, { $set: { derniere_activite: new Date() } }).select('membres.user_id').lean()
            .then((s) => (s?.membres || []).forEach((m) => {
              const id = String(m.user_id);
              if (id !== String(userId)) io.to(`user:${id}`).emit('salon_message', { canal: c.canal, salon_id: String(c.salon_id) });
            }))
            .catch(() => {});
        }
        if (c.cible_type === 'user' && c.cible_id) {
          // Message privé : prévient le destinataire en direct (compteur + liste) et par une notification, sauf s'il a déjà la conversation ouverte.
          const dest = String(c.cible_id);
          (async () => {
            const ouverte = (await io.in(c.canal).fetchSockets()).some((s) => s.data.user && s.data.user.id === dest);
            io.to(`user:${dest}`).emit('prive_message', {
              canal: c.canal, message_id: String(doc._id), auteur: { id: userId, pseudo }, apercu: apercuMessage(message), created_at: doc.created_at, ouverte
            });
            if (!ouverte) await notifierMessagePrive({ destinataireId: dest, acteurId: userId, pseudo, canal: c.canal, messageId: doc._id });
          })().catch((e) => console.error('[socket message privé]', e.message));
        }
        notifierMentions({ contenu, acteurId: userId, pseudo, canal: c.canal, messageId: doc._id }); // F-20 : @pseudo
        reponse(ack, { ok: true, message });
      } catch (e) {
        console.error('[socket message]', e.message);
        reponse(ack, { ok: false, erreur: 'Erreur serveur' });
      }
    });

    // reaction { message_id, emoji }  ->  ajoute, remplace ou retire MA réaction ; le canal entier reçoit 'reaction'
    socket.on('reaction', async (payload, ack) => {
      try {
        const messageId = payload && payload.message_id;
        if (!mongoose.isValidObjectId(messageId) || !emojiValide(payload.emoji)) return reponse(ack, { ok: false, erreur: 'Réaction invalide' });
        const doc = await Echange.findOne({ _id: messageId, type: 'message' }).select('auteur_id reactions metadata.canal').lean();
        const canalDoc = doc && doc.metadata && doc.metadata.canal;
        if (!canalDoc) return reponse(ack, { ok: false, erreur: 'Message introuvable' });
        const c = parseCanal(canalDoc, userId);
        if (c.erreur) return reponse(ack, { ok: false, erreur: c.erreur });
        const acces = await verifierAcces(c, userId); // même règle que pour lire le canal
        if (acces.erreur) return reponse(ack, { ok: false, erreur: acces.erreur });

        const { reactions, action } = appliquer(doc.reactions, userId, payload.emoji);
        await Echange.updateOne({ _id: messageId }, { $set: { reactions } });
        const groupees = grouper(reactions);
        io.to(c.canal).emit('reaction', { message_id: String(messageId), canal: c.canal, reactions: groupees });

        // Prévient l'auteur (pas pour soi-même, pas pour un retrait, pas s'il a déjà la conversation ouverte).
        const auteurId = doc.auteur_id ? String(doc.auteur_id) : null;
        if (action !== 'retiree' && auteurId && auteurId !== String(userId)) {
          (async () => {
            const ouverte = (await io.in(c.canal).fetchSockets()).some((s) => s.data.user && s.data.user.id === auteurId);
            if (!ouverte) await notifierReaction({ destinataireId: auteurId, acteurId: userId, pseudo, emoji: payload.emoji, canal: c.canal, messageId });
          })().catch((e) => console.error('[socket reaction]', e.message));
        }
        reponse(ack, { ok: true, action, reactions: groupees });
      } catch (e) {
        console.error('[socket reaction]', e.message);
        reponse(ack, { ok: false, erreur: 'Erreur serveur' });
      }
    });

    // typing { canal, actif }  ->  les autres membres reçoivent 'typing'
    socket.on('typing', (payload) => {
      const c = parseCanal(payload && payload.canal, userId);
      if (c.erreur || !socket.rooms.has(c.canal)) return;
      // mode « vocal » : la personne enregistre une note vocale (au lieu d'écrire)
      socket.to(c.canal).emit('typing', { canal: c.canal, user_id: userId, pseudo, actif: payload.actif !== false, mode: payload.mode === 'vocal' ? 'vocal' : 'texte' });
    });

    socket.on('disconnect', () => { /* les salles sont quittées automatiquement */ });
  });
};
