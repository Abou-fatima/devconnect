const Utilisateur = require('../models/Utilisateur');
const { badgesPour } = require('./bareme');

// Ajoute (ou retire) des points de réputation, jamais en dessous de 0, puis attribue les badges gagnés.
// badgesExtra : badges à donner indépendamment des paliers (ex. 'resolveur').
async function changer(userId, delta, badgesExtra = []) {
  if (!userId || (!delta && !badgesExtra.length)) return;
  const user = await Utilisateur.findOneAndUpdate(
    { _id: userId },
    [{ $set: { reputation: { $max: [0, { $add: [{ $ifNull: ['$reputation', 0] }, delta] }] } } }],
    { new: true, projection: 'reputation badges' }
  );
  if (!user) return;
  const manquants = [...badgesPour(user.reputation), ...badgesExtra].filter((b) => !(user.badges || []).includes(b));
  if (manquants.length) await Utilisateur.updateOne({ _id: userId }, { $addToSet: { badges: { $each: manquants } } });
}

module.exports = { changer };
