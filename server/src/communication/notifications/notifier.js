// Notifications (F-20) : réponse, réponse acceptée, mention, vote, candidature, mentorat.
// Une notification = un document `echanges` : type "notification", auteur_id = qui a agi,
// cible_type "user" + cible_id = destinataire, contenu = texte, metadata = { kind, lue, sujet }.
const mongoose = require('mongoose');
const Echange = require('../../models/Echange');
const Utilisateur = require('../../models/Utilisateur');
const { envoyerPush } = require('../../services/push');

const KINDS = ['reponse', 'reponse_acceptee', 'mention', 'vote', 'candidature', 'candidature_acceptee', 'candidature_refusee', 'mentorat', 'tache', 'message_prive', 'reaction', 'reponse_chat', 'defi_podium'];
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
    // Push système seulement si la personne n'est connectée nulle part (sinon elle a déjà le toast et le bip) :
    // pas d'attente, et jamais d'erreur remontée à l'appelant.
    (async () => {
      const enLigne = io ? (await io.in(`user:${destinataireId}`).fetchSockets()).length > 0 : false;
      if (!enLigne) await envoyerPush(destinataireId, payload);
    })().catch(() => {});
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
    const lieu = canal.startsWith('prive:') ? 'une conversation privée' : canal.startsWith('salon:') ? 'un salon' : canal;
    let users = await Utilisateur.find({ pseudo: { $in: noms } }).select('_id');
    // Dans un salon ou une conversation privée, seuls ses membres sont prévenus (sinon un lien vers un lieu fermé).
    if (canal.startsWith('prive:')) {
      const ids = canal.slice(6).split('_');
      users = users.filter((u) => ids.includes(String(u._id)));
    } else if (canal.startsWith('salon:')) {
      const salon = await require('../../models/Salon').findById(canal.slice(6)).select('membres.user_id').lean();
      const ids = new Set(((salon && salon.membres) || []).map((m) => String(m.user_id)));
      users = users.filter((u) => ids.has(String(u._id)));
    }
    await Promise.all(users.map((u) => envoyer({
      destinataireId: u._id, acteurId, kind: 'mention',
      message: `${pseudo} vous a mentionné dans ${lieu}`,
      sujet: { type: 'canal', canal, message_id: String(messageId) }
    })));
  } catch (e) { console.error('[notifier] mentions :', e.message); }
}

/* Message privé reçu : une notification par conversation tant qu'elle n'est pas lue (les suivants alimentent seulement le compteur).
   N'interrompt jamais l'envoi du message. */
async function notifierMessagePrive({ destinataireId, acteurId, pseudo, canal, messageId }) {
  try {
    const existe = await Echange.exists({
      type: 'notification', cible_type: 'user', cible_id: destinataireId,
      'metadata.kind': 'message_prive', 'metadata.sujet.canal': canal, 'metadata.lue': { $ne: true }
    });
    if (existe) return null;
    return await envoyer({
      destinataireId, acteurId, kind: 'message_prive',
      message: `${pseudo} vous a envoyé un message`,
      sujet: { type: 'canal', canal, message_id: String(messageId) }
    });
  } catch (e) { console.error('[notifier] message privé :', e.message); return null; }
}

/* Réaction à un message : « X a réagi 👍 à votre message ». Une seule notification non lue par message
   (changer d'emoji ou réagir de nouveau n'en crée pas d'autre). N'interrompt jamais la réaction. */
async function notifierReaction({ destinataireId, acteurId, pseudo, emoji, canal, messageId }) {
  try {
    const existe = await Echange.exists({
      type: 'notification', cible_type: 'user', cible_id: destinataireId,
      'metadata.kind': 'reaction', 'metadata.sujet.message_id': String(messageId), 'metadata.lue': { $ne: true }
    });
    if (existe) return null;
    return await envoyer({
      destinataireId, acteurId, kind: 'reaction',
      message: `${pseudo} a réagi ${emoji} à votre message`,
      sujet: { type: 'canal', canal, message_id: String(messageId), emoji }
    });
  } catch (e) { console.error('[notifier] réaction :', e.message); return null; }
}

/* Réponse à un message précis : « X a répondu à votre message ». Une seule notification non lue par message cité.
   N'interrompt jamais l'envoi du message. */
async function notifierReponse({ destinataireId, acteurId, pseudo, canal, parentId, messageId }) {
  try {
    const existe = await Echange.exists({
      type: 'notification', cible_type: 'user', cible_id: destinataireId,
      'metadata.kind': 'reponse_chat', 'metadata.sujet.parent_id': String(parentId), 'metadata.lue': { $ne: true }
    });
    if (existe) return null;
    return await envoyer({
      destinataireId, acteurId, kind: 'reponse_chat',
      message: `${pseudo} a répondu à votre message`,
      sujet: { type: 'canal', canal, message_id: String(messageId), parent_id: String(parentId) }
    });
  } catch (e) { console.error('[notifier] réponse :', e.message); return null; }
}

module.exports = { KINDS, setIo, envoyer, serialiser, extraireMentions, notifierMentions, notifierMessagePrive, notifierReaction, notifierReponse };
