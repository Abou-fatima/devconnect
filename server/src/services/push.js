// Notifications push (Web Push, protocole standard + clés VAPID) : la notification arrive sur l'appareil
// même quand DevConnect est fermé. Bibliothèque : web-push (MIT). Sans clés VAPID, tout est simplement désactivé.

// Config VAPID lue à la demande (testable sans charger toute la configuration du serveur).
function vapid() {
  try { return require('../config/env').vapid; } catch {
    return { publicKey: process.env.VAPID_PUBLIC_KEY || '', privateKey: process.env.VAPID_PRIVATE_KEY || '', subject: process.env.VAPID_SUBJECT || 'mailto:contact@devconnect.local' };
  }
}

const MAX_APPAREILS = 10;
const TEXTES = {
  reponse: 'a répondu à ta question', reponse_acceptee: 'a accepté ta réponse', vote: 'a voté pour ta contribution',
  mention: 't’a mentionné dans le chat', candidature: 'veut rejoindre ton projet', candidature_acceptee: 'a accepté ta candidature',
  candidature_refusee: 'a décliné ta candidature', mentorat: 't’a contacté pour du mentorat', tache: 'a mis à jour une tâche',
  message_prive: 't’a envoyé un message', reaction: 'a réagi à ton message'
};

const pushActif = () => { const v = vapid(); return Boolean(v && v.publicKey && v.privateKey); };

// Vérifie le format d'un abonnement envoyé par le navigateur (fonction pure).
function abonnementValide(a) {
  if (!a || typeof a !== 'object') return false;
  const { endpoint, keys } = a;
  if (typeof endpoint !== 'string' || endpoint.length > 600 || !/^https:\/\//.test(endpoint)) return false;
  if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') return false;
  return keys.p256dh.length > 10 && keys.p256dh.length <= 200 && keys.auth.length > 5 && keys.auth.length <= 100;
}

// Lien ouvert au clic sur la notification (même logique que la cloche côté client).
function lienPush(n) {
  const s = n.sujet;
  if (s && s.type === 'canal' && s.canal) return `/messages/${encodeURIComponent(s.canal)}`;
  if (s && s.type === 'post' && s.id) return `/forum/questions/${s.id}`;
  if (s && s.type === 'projet' && s.id) return `/projets/${s.id}`;
  if (s && s.type === 'mentorat') return '/mentorat?onglet=demandes';
  return '/notifications';
}

// Contenu de la notification système. On n'y met jamais le texte d'un message privé : seulement qui écrit.
function construirePush(n) {
  const pseudo = n.acteur && n.acteur.pseudo;
  const corps = n.message || (pseudo && TEXTES[n.kind] ? `${pseudo} ${TEXTES[n.kind]}` : 'Tu as une nouvelle notification');
  return { title: 'DevConnect', body: corps, url: lienPush(n), tag: (n.sujet && n.sujet.canal) || n.id || n.kind };
}

let wp = null;
function webpush() {
  if (wp) return wp;
  wp = require('web-push');
  const v = vapid();
  wp.setVapidDetails(v.subject, v.publicKey, v.privateKey);
  return wp;
}

// Envoie la notification à tous les appareils de la personne. Les abonnements expirés (404/410) sont supprimés.
// Ne lève jamais d'erreur : un incident de push ne doit pas casser l'envoi du message.
async function envoyerPush(userId, notification, deps = {}) {
  if (!deps.lib && !pushActif()) return { envoyes: 0 };
  try {
    const Abonnement = deps.Abonnement || require('../models/PushAbonnement');
    const lib = deps.lib || webpush();
    const appareils = await Abonnement.find({ user_id: userId }).lean();
    if (!appareils.length) return { envoyes: 0 };
    const charge = JSON.stringify(construirePush(notification));
    let envoyes = 0;
    await Promise.all(appareils.map(async (a) => {
      try {
        await lib.sendNotification({ endpoint: a.endpoint, keys: a.keys }, charge, { TTL: 24 * 3600, urgency: 'high' });
        envoyes += 1;
      } catch (e) {
        if (e && (e.statusCode === 404 || e.statusCode === 410)) await Abonnement.deleteOne({ _id: a._id }).catch(() => {});
        else console.error('[push]', e && e.statusCode, e && e.message);
      }
    }));
    return { envoyes };
  } catch (e) { console.error('[push]', e.message); return { envoyes: 0 }; }
}

async function enregistrer(userId, abonnement, userAgent = '') {
  const Abonnement = require('../models/PushAbonnement');
  await Abonnement.findOneAndUpdate(
    { endpoint: abonnement.endpoint },
    { $set: { user_id: userId, keys: { p256dh: abonnement.keys.p256dh, auth: abonnement.keys.auth }, user_agent: String(userAgent).slice(0, 200) } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  // Au plus MAX_APPAREILS par personne : on retire les plus anciens
  const tous = await Abonnement.find({ user_id: userId }).sort({ created_at: -1 }).select('_id').lean();
  if (tous.length > MAX_APPAREILS) await Abonnement.deleteMany({ _id: { $in: tous.slice(MAX_APPAREILS).map((x) => x._id) } });
}

async function retirer(userId, endpoint) {
  const Abonnement = require('../models/PushAbonnement');
  await Abonnement.deleteOne({ user_id: userId, endpoint });
}

module.exports = { pushActif, abonnementValide, lienPush, construirePush, envoyerPush, enregistrer, retirer, MAX_APPAREILS };
