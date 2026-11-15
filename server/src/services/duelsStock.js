// Sauvegarde des duels dans MongoDB (le jeu se passe en mémoire ; ceci permet de retrouver et de reprendre ses duels).
const Sauvegarde = require("../models/DuelSauvegarde");
const svc = require("./duels");

const cle = (code) => String(code || "").toUpperCase();

async function sauvegarder(duel) {
  try {
    await Sauvegarde.updateOne(
      { code: duel.code },
      { $set: { donnees: duel, joueurs_ids: duel.joueurs.map((j) => j.id) }, $setOnInsert: { cree_at: new Date(duel.cree_at) } },
      { upsert: true },
    );
  } catch (e) { console.error("[duels] sauvegarde", e.message); }
}

// Remet un duel sauvegardé en mémoire (après un redémarrage).
async function charger(code) {
  try {
    const doc = await Sauvegarde.findOne({ code: cle(code) }).lean();
    if (!doc) return null;
    svc._duels.set(doc.donnees.code, doc.donnees);
    return doc.donnees;
  } catch (e) { console.error("[duels] chargement", e.message); return null; }
}

async function mesDuels(userId) {
  const docs = await Sauvegarde.find({ joueurs_ids: String(userId) }).sort({ cree_at: -1 }).limit(20).lean();
  return docs.map((d) => svc._duels.get(d.donnees.code) || d.donnees);
}

async function supprimer(code) {
  svc.retirer(code);
  try { await Sauvegarde.deleteOne({ code: cle(code) }); } catch (e) { console.error("[duels] suppression", e.message); }
}

module.exports = { sauvegarder, charger, mesDuels, supprimer };
