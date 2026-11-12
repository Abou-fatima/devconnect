// Présence : qui est en ligne, et depuis quand une personne n'est plus là.
// « En ligne » = au moins une connexion Socket.IO ouverte dans sa salle personnelle (user:<id>).
// À la dernière déconnexion, on enregistre l'heure (derniere_activite) et on prévient les conversations privées ouvertes.
let io = null;
const setIo = (instance) => { io = instance; };

// Conversations privées (salles « prive:<idA>_<idB> ») dont fait partie la personne. rooms : io.sockets.adapter.rooms (Map).
function sallesPrivees(rooms, userId) {
  return [...rooms.keys()].filter((k) => k.startsWith('prive:') && k.slice(6).split('_').includes(String(userId)));
}

async function enLigne(userId) {
  if (!io) return false;
  return (await io.in(`user:${userId}`).fetchSockets()).length > 0;
}

async function vuLe(userId) {
  const Utilisateur = require('../models/Utilisateur');
  const u = await Utilisateur.findById(userId).select('derniere_activite').lean();
  return (u && u.derniere_activite) || null;
}

// État de présence d'une personne : { en_ligne, vu_le }
async function etat(userId) {
  if (await enLigne(userId)) return { en_ligne: true, vu_le: null };
  return { en_ligne: false, vu_le: await vuLe(userId) };
}

function annoncer(userId, payload) {
  if (!io) return;
  for (const salle of sallesPrivees(io.sockets.adapter.rooms, userId)) io.to(salle).emit('presence', { user_id: String(userId), ...payload });
}

const surConnexion = (userId) => annoncer(userId, { en_ligne: true, vu_le: null });

// Appelée quand une connexion se ferme : si c'était la dernière, la personne est hors ligne.
async function surDeconnexion(userId) {
  if (await enLigne(userId)) return;
  const maintenant = new Date();
  const Utilisateur = require('../models/Utilisateur');
  await Utilisateur.updateOne({ _id: userId }, { $set: { derniere_activite: maintenant } });
  annoncer(userId, { en_ligne: false, vu_le: maintenant });
}

module.exports = { setIo, sallesPrivees, enLigne, etat, surConnexion, surDeconnexion };
