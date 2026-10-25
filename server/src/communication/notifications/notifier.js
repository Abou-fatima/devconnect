// Notifications (F-20) : réponse, réponse acceptée, mention, vote, candidature, mentorat.
// Une notification = un document `echanges` : type "notification", auteur_id = qui a agi,
// cible_type "user" + cible_id = destinataire, contenu = texte, metadata = { kind, lue, sujet }.
const mongoose = require('mongoose');
const Echange = require('../../models/Echange');
const Utilisateur = require('../../models/Utilisateur');

const KINDS = ['reponse', 'reponse_acceptee', 'mention', 'vote', 'candidature', 'candidature_acceptee', 'candidature_refusee', 'mentorat'];
const MAX_MENTIONS = 5;

let io = null;
const setIo = (instance) => { io = instance; };

// Format envoyé au client (Socket.IO « notification » et API REST).
function serialiser(doc, acteur) {
  const m = doc.metadata || {};
  return {
    id: String(doc._id),
    kind: m.kind,
    message: doc.contenu || null,
    lue: m.lue === true,
    sujet: m.sujet || null,
    acteur: acteur ? { id: String(acteur._id), pseudo: acteur.pseudo } : null,
    created_at: doc.created_at
  };
}

/* Crée la notification et la pousse en temps réel au destinataire.
   envoyer({ destinataireId, acteurId, kind, message, sujet? })
   - sujet : objet libre pour retrouver l'élément concerné, ex. { type: 'post', id } ou { type: 'projet', id }
   - ne fait rien (retourne null) si le destinataire est l'acteur lui-même
   - lève une erreur si kind ou les identifiants sont invalides (erreur de programmation) ;
     un incident de base ou de socket est journalisé sans interrompre l'appelant. */
async function envoyer({ destinataireId, acteurId, kind, message, sujet = null }) {
  if (!KINDS.includes(kind)) throw new Error(`notifier : kind inconnu « ${kind} »`);
  if (!mongoose.isValidObjectId(destinataireId) || !mongoose.isValidObjectId(acteurId)) throw new Error('notifier : identifiants invalides');
  if (String(destinataireId) === String(acteurId)) return null;
  try {
    const acteur = await Utilisateur.findById(acteurId).select('pseudo');
    if (!acteur) return null;
    const doc = await Echange.create({
      type: 'notification',
      auteur_id: acteurId,
      cible_type: 'user',
      cible_id: destinataireId,
      contenu: message,
      metadata: { kind, lue: false, ...(sujet ? { sujet } : {}) }
    });
    const payload = serialiser(doc, acteur);
    if (io) io.to(`user:${destinataireId}`).emit('notification', payload);
    return payload;
  } catch (e) {
    console.error('[notifier]', e.message);
    return null;
  }
}

// « @pseudo » dans un texte (sans les adresses email), sans doublon, au plus 5.
function extraireMentions(texte) {
  if (typeof texte !== 'string') return [];
  const noms = [...texte.matchAll(/(?<![\w@])@([A-Za-z0-9_]{3,30})/g)].map((m) => m[1]);
  return [...new Set(noms)].slice(0, MAX_MENTIONS);
}

// Notifie les développeurs mentionnés dans un message du chat. N'interrompt jamais l'envoi du message.
async function notifierMentions({ contenu, acteurId, pseudo, canal, messageId }) {
  try {
    const noms = extraireMentions(contenu);
    if (!noms.length) return;
    const lieu = canal.startsWith('prive:') ? 'une conversation privée' : canal;
    const users = await Utilisateur.find({ pseudo: { $in: noms } }).select('_id');
    await Promise.all(users.map((u) => envoyer({
      destinataireId: u._id, acteurId, kind: 'mention',
      message: `${pseudo} t’a mentionné dans ${lieu}`,
      sujet: { type: 'canal', canal, message_id: String(messageId) }
    })));
  } catch (e) { console.error('[notifier] mentions :', e.message); }
}

module.exports = { KINDS, setIo, envoyer, serialiser, extraireMentions, notifierMentions };
