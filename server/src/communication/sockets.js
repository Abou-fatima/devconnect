const Utilisateur = require('../models/Utilisateur');
const Echange = require('../models/Echange');
const { verifyToken } = require('../utils/jwt');
const { parseCanal } = require('./canaux');
const { notifierMentions } = require('./notifications/notifier');

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
    socket.on('join_canal', (payload, ack) => {
      const c = parseCanal(payload && payload.canal, userId);
      if (c.erreur) return reponse(ack, { ok: false, erreur: c.erreur });
      socket.join(c.canal);
      reponse(ack, { ok: true, canal: c.canal });
    });

    // leave_canal { canal }
    socket.on('leave_canal', (payload, ack) => {
      const c = parseCanal(payload && payload.canal, userId);
      if (c.erreur) return reponse(ack, { ok: false, erreur: c.erreur });
      socket.leave(c.canal);
      reponse(ack, { ok: true, canal: c.canal });
    });

    // message { canal, contenu?, audio_url? }  ->  diffusé à tout le canal (expéditeur compris)
    socket.on('message', async (payload, ack) => {
      try {
        const c = parseCanal(payload && payload.canal, userId);
        if (c.erreur) return reponse(ack, { ok: false, erreur: c.erreur });
        if (!socket.rooms.has(c.canal)) return reponse(ack, { ok: false, erreur: 'Rejoignez d\'abord le canal (join_canal)' });

        const contenu = typeof payload.contenu === 'string' ? payload.contenu.trim() : '';
        const audio = payload.audio_url;
        if (!contenu && !audio) return reponse(ack, { ok: false, erreur: 'Message vide' });
        if (contenu.length > MAX_CONTENU) return reponse(ack, { ok: false, erreur: `Maximum ${MAX_CONTENU} caractères` });
        if (audio && !audioValide(audio)) return reponse(ack, { ok: false, erreur: 'audio_url invalide' });
        if (tropRapide()) return reponse(ack, { ok: false, erreur: 'Trop de messages, ralentissez' });

        const doc = await Echange.create({
          type: 'message',
          auteur_id: userId,
          cible_type: c.cible_type,
          ...(c.cible_id ? { cible_id: c.cible_id } : {}),
          contenu: contenu || undefined,
          audio_url: audio || undefined,
          metadata: { canal: c.canal }
        });

        const message = {
          id: String(doc._id),
          canal: c.canal,
          auteur: { id: userId, pseudo },
          contenu: doc.contenu || null,
          audio_url: doc.audio_url || null,
          transcription: doc.transcription || null,
          created_at: doc.created_at
        };
        io.to(c.canal).emit('message', message);
        notifierMentions({ contenu, acteurId: userId, pseudo, canal: c.canal, messageId: doc._id }); // F-20 : @pseudo
        reponse(ack, { ok: true, message });
      } catch (e) {
        console.error('[socket message]', e.message);
        reponse(ack, { ok: false, erreur: 'Erreur serveur' });
      }
    });

    // typing { canal, actif }  ->  les autres membres reçoivent 'typing'
    socket.on('typing', (payload) => {
      const c = parseCanal(payload && payload.canal, userId);
      if (c.erreur || !socket.rooms.has(c.canal)) return;
      socket.to(c.canal).emit('typing', { canal: c.canal, user_id: userId, pseudo, actif: payload.actif !== false });
    });

    socket.on('disconnect', () => { /* les salles sont quittées automatiquement */ });
  });
};
