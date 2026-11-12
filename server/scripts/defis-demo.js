// Défis de démonstration : un par semaine (le premier commence maintenant).
//   npm run defis                -> crée les 3 défis (remplace ceux d'une exécution précédente)
//   npm run defis -- --clean     -> supprime uniquement les défis de démonstration
// Refuse de tourner sur une base distante sans --force (comme `npm run seed`).
require("dotenv").config();
const mongoose = require("mongoose");
const env = require("../src/config/env");
const Defi = require("../src/models/Defi");
const Participation = require("../src/models/DefiParticipation");
const Utilisateur = require("../src/models/Utilisateur");
const { DEFIS_DEMO } = require("./defis-donnees");
const { estLocale } = require("./seed/options");

const SEMAINE = 7 * 24 * 3600 * 1000;

async function main() {
  const clean = process.argv.includes("--clean");
  const force = process.argv.includes("--force");
  if (!estLocale(env.mongoUri) && !force) {
    console.error("Base distante : ajoutez --force si c'est voulu.");
    process.exit(1);
  }
  await mongoose.connect(env.mongoUri);
  const anciens = await Defi.find({ demo: true }).select("_id").lean();
  if (anciens.length) {
    await Participation.deleteMany({ defi_id: { $in: anciens.map((d) => d._id) } });
    await Defi.deleteMany({ demo: true });
  }
  if (clean) { console.log(`${anciens.length} défi(s) de démonstration supprimé(s).`); return; }

  const auteur = (await Utilisateur.findOne({ role: "admin" })) || (await Utilisateur.findOne());
  if (!auteur) { console.error("Aucun compte : créez-en un (ou lancez npm run seed) avant."); process.exit(1); }
  const maintenant = Date.now();
  for (let i = 0; i < DEFIS_DEMO.length; i += 1) {
    const { solution, ...d } = DEFIS_DEMO[i];
    await Defi.create({
      ...d,
      code_depart: `function ${d.nom_fonction}() {\n  // Écrivez votre solution ici\n}\n`,
      debut: new Date(maintenant + i * SEMAINE),
      fin: new Date(maintenant + (i + 1) * SEMAINE),
      auteur_id: auteur._id,
      demo: true,
    });
  }
  console.log(`${DEFIS_DEMO.length} défis créés (auteur : ${auteur.pseudo}). Le premier est en cours.`);
}

main().then(() => mongoose.disconnect()).catch((e) => { console.error(e); process.exit(1); });
