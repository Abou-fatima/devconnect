// Conversations privées : liste de mes conversations, messages non lus, marquage « lu ».
// Les fonctions pures (autreParticipant, apercuMessage, assembler) sont testées sans base de données.

const MAX_CONVERSATIONS = 50;
const APERCU_MAX = 80;

// L'autre personne d'une conversation « prive:<idA>_<idB> ».
function autreParticipant(canal, moiId) {
  if (!/^prive:/.test(String(canal || ''))) return null;
  const ids = String(canal).slice(6).split('_');
  return ids.find((i) => i !== String(moiId)) || null;
}

// Aperçu court du dernier message : le client écrit lui-même « Message vocal » ou « Image » dans la bonne langue.
function apercuMessage(m) {
  const texte = String((m && m.contenu) || '').trim();
  if (!texte && m && m.image_url) return { type: 'image', texte: '' };
  if (!texte && m && m.audio_url) return { type: 'audio', texte: '' };
  return { type: 'texte', texte: texte.length > APERCU_MAX ? `${texte.slice(0, APERCU_MAX - 1)}…` : texte };
}

/* Assemble la réponse à partir des données lues en base.
   derniers : [{ canal, dernier: { auteur_id, contenu, audio_url, image_url, created_at } }]
   utilisateurs : { <id>: { pseudo, photo } }      nonLus : { <canal>: nombre } */
function assembler({ derniers, utilisateurs, nonLus, moiId }) {
  const conversations = [];
  for (const d of derniers) {
    const autreId = autreParticipant(d.canal, moiId);
    const autre = autreId && utilisateurs[autreId];
    if (!autre) continue; // compte supprimé : on n'affiche pas une conversation sans interlocuteur
    conversations.push({
      canal: d.canal,
      autre: { id: autreId, pseudo: autre.pseudo, photo: autre.photo || null },
      dernier: { de_moi: String(d.dernier.auteur_id) === String(moiId), apercu: apercuMessage(d.dernier), created_at: d.dernier.created_at },
      non_lus: nonLus[d.canal] || 0
    });
  }
  conversations.sort((a, b) => new Date(b.dernier.created_at) - new Date(a.dernier.created_at));
  return { conversations, total_non_lus: conversations.reduce((s, c) => s + c.non_lus, 0) };
}

async function listerConversations(userId, deps = {}) {
  const Echange = deps.Echange || require('../models/Echange');
  const Utilisateur = deps.Utilisateur || require('../models/Utilisateur');
  const Lecture = deps.Lecture || require('../models/Lecture');
  const mongoose = require('mongoose');
  const moi = new mongoose.Types.ObjectId(String(userId));

  // Dernier message de chaque conversation privée où je suis expéditeur ou destinataire
  const groupes = await Echange.aggregate([
    { $match: { type: 'message', 'metadata.canal': { $regex: '^prive:' }, $or: [{ auteur_id: moi }, { cible_id: moi }] } },
    { $sort: { created_at: -1 } },
    { $group: { _id: '$metadata.canal', dernier: { $first: '$$ROOT' } } },
    { $sort: { 'dernier.created_at': -1 } },
    { $limit: MAX_CONVERSATIONS }
  ]);
  const derniers = groupes.map((g) => ({ canal: g._id, dernier: g.dernier }));
  if (!derniers.length) return { conversations: [], total_non_lus: 0 };

  const canaux = derniers.map((d) => d.canal);
  const autresIds = [...new Set(canaux.map((c) => autreParticipant(c, userId)).filter(Boolean))];
  const [users, lectures] = await Promise.all([
    Utilisateur.find({ _id: { $in: autresIds } }).select('pseudo profil.photo').lean(),
    Lecture.find({ user_id: moi, canal: { $in: canaux } }).lean()
  ]);
  const utilisateurs = Object.fromEntries(users.map((u) => [String(u._id), { pseudo: u.pseudo, photo: u.profil && u.profil.photo }]));
  const luJusqua = Object.fromEntries(lectures.map((l) => [l.canal, l.lu_jusqua]));

  // Non lus = messages reçus (pas les miens) après ma dernière lecture de la conversation
  const comptes = await Promise.all(canaux.map((canal) => Echange.countDocuments({
    type: 'message', 'metadata.canal': canal, cible_id: moi, auteur_id: { $ne: moi }, created_at: { $gt: luJusqua[canal] || new Date(0) }
  })));
  const nonLus = Object.fromEntries(canaux.map((c, i) => [c, comptes[i]]));

  return assembler({ derniers, utilisateurs, nonLus, moiId: userId });
}

// Je viens de lire la conversation : remet son compteur à zéro et marque lues ses notifications.
async function marquerLu(userId, canal, deps = {}) {
  const Echange = deps.Echange || require('../models/Echange');
  const Lecture = deps.Lecture || require('../models/Lecture');
  const mongoose = require('mongoose');
  const moi = new mongoose.Types.ObjectId(String(userId));
  await Lecture.updateOne({ user_id: moi, canal }, { $set: { lu_jusqua: new Date() } }, { upsert: true });
  await Echange.updateMany(
    { type: 'notification', cible_type: 'user', cible_id: moi, 'metadata.kind': 'message_prive', 'metadata.sujet.canal': canal, 'metadata.lue': { $ne: true } },
    { $set: { 'metadata.lue': true } }
  );
}

module.exports = { autreParticipant, apercuMessage, assembler, listerConversations, marquerLu, MAX_CONVERSATIONS };
