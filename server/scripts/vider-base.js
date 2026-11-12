// Vide TOUTES les données (utilisateurs, forum, projets, chat, salons, défis…) pour repartir d'une base propre.
//   npm run vider -- --oui          -> efface les données (les index sont conservés)
// Sécurité : sans --oui, rien n'est effacé ; sur une base distante (pas localhost), il faut aussi --force.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const env = require("../src/config/env");

const args = process.argv.slice(2);
const oui = args.includes("--oui");
const force = args.includes("--force");
const locale = /localhost|127\.0\.0\.1|\[::1\]/.test(env.mongoUri);

async function main() {
  if (!oui) {
    console.log("Rien n'a été effacé. Cette commande supprime toutes les données : relancez avec  --oui  pour confirmer.");
    return;
  }
  if (!locale && !force) {
    console.error("Cette base n'est pas locale : ajoutez --force si vous voulez vraiment la vider.");
    process.exitCode = 1;
    return;
  }
  const dossier = path.join(__dirname, "../src/models");
  fs.readdirSync(dossier).filter((f) => f.endsWith(".js")).forEach((f) => require(path.join(dossier, f)));
  await mongoose.connect(env.mongoUri);
  console.log(`Base : ${mongoose.connection.name}`);
  for (const nom of Object.keys(mongoose.models).sort()) {
    const r = await mongoose.models[nom].deleteMany({});
    console.log(`  ${nom} : ${r.deletedCount} supprimé(s)`);
  }
  console.log("Base vide. Redémarrez le serveur, puis créez un compte.");
}

main()
  .catch((e) => { console.error(e.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect().catch(() => {}));
