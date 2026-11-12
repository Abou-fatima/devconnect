// Jeu de données de démonstration : utilisateurs, questions, projets, mentorat, chat (FR/EN).
//   npm run seed                 -> ajoute les données de démo (remplace celles d'une exécution précédente)
//   npm run seed -- --clean      -> supprime uniquement les données de démo
//   npm run seed -- --users 300 --questions 80 --projets 40 --graine 7
// Les comptes de démo ont un e-mail en @demo.devconnect.local et le mot de passe ci-dessous.
// Sécurité : refuse de tourner sur une base distante sans --force (pour ne jamais polluer la production par erreur).
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const env = require("../src/config/env");
const Utilisateur = require("../src/models/Utilisateur");
const Echange = require("../src/models/Echange");
const Projet = require("../src/models/Projet");
const { genererJeu, DOMAINE } = require("./seed/generateur");
const { lireArguments, estLocale } = require("./seed/options");

const MOT_DE_PASSE = "devconnect2026";
const oid = (x) => new mongoose.Types.ObjectId(x);

async function supprimerDemo() {
  const comptes = await Utilisateur.find({
    email: new RegExp(`@${DOMAINE.replace(/\./g, "\\.")}$`),
  })
    .select("_id")
    .lean();
  const ids = comptes.map((u) => u._id);
  if (!ids.length) return { utilisateurs: 0, echanges: 0, projets: 0 };
  const projets = await Projet.find({ porteur_id: { $in: ids } })
    .select("_id")
    .lean();
  const pids = projets.map((p) => p._id);
  const e = await Echange.deleteMany({
    $or: [
      { auteur_id: { $in: ids } },
      { cible_id: { $in: ids } },
      { cible_id: { $in: pids } },
    ],
  });
  const p = await Projet.deleteMany({ _id: { $in: pids } });
  const u = await Utilisateur.deleteMany({ _id: { $in: ids } });
  return {
    utilisateurs: u.deletedCount,
    echanges: e.deletedCount,
    projets: p.deletedCount,
  };
}

// Les identifiants du jeu sont des chaînes : on les convertit en ObjectId (y compris dans metadata, de type libre).
function versMongo(jeu) {
  const meta = (m = {}) => {
    const r = { ...m };
    if (r.suiveurs) r.suiveurs = r.suiveurs.map(oid);
    if (r.reponse_acceptee_id)
      r.reponse_acceptee_id = oid(r.reponse_acceptee_id);
    if (r.sujet?.id) r.sujet = { ...r.sujet, id: oid(r.sujet.id) };
    return r;
  };
  const utilisateurs = jeu.utilisateurs.map(({ lang, ...u }) => ({
    ...u,
    _id: oid(u._id),
    reputation: Math.max(0, u.reputation),
  }));
  const echanges = jeu.echanges.map((e) => ({
    ...e,
    _id: oid(e._id),
    auteur_id: oid(e.auteur_id),
    ...(e.parent_id && { parent_id: oid(e.parent_id) }),
    ...(e.cible_id && { cible_id: oid(e.cible_id) }),
    metadata: meta(e.metadata),
  }));
  const projets = jeu.projets.map((p) => ({
    ...p,
    _id: oid(p._id),
    porteur_id: oid(p.porteur_id),
    membres: p.membres.map((m) => ({ ...m, user_id: oid(m.user_id) })),
    taches: p.taches.map((t) => ({
      ...t,
      _id: oid(t._id),
      ...(t.assigne_a && { assigne_a: oid(t.assigne_a) }),
    })),
  }));
  return { utilisateurs, echanges, projets };
}

async function main() {
  const a = lireArguments(process.argv.slice(2));
  if (!a.force && (!estLocale(env.mongoUri) || env.nodeEnv === "production")) {
    throw new Error(
      "Base distante ou NODE_ENV=production : ajoute --force si tu es sûr de vouloir écrire les données de démo ici.",
    );
  }
  await mongoose.connect(env.mongoUri);
  console.log(`Base : ${mongoose.connection.name}`);

  const avant = await supprimerDemo();
  if (avant.utilisateurs)
    console.log(
      `Anciennes données de démo supprimées : ${avant.utilisateurs} comptes, ${avant.projets} projets, ${avant.echanges} échanges.`,
    );
  if (a.clean) return;

  const jeu = genererJeu({
    utilisateurs: a.utilisateurs,
    questions: a.questions,
    projets: a.projets,
    graine: a.graine,
  });
  const hash = await bcrypt.hash(MOT_DE_PASSE, 10);
  const doc = versMongo(jeu);
  doc.utilisateurs.forEach((u) => {
    u.mot_de_passe_hash = hash;
  });

  // Les index uniques (pseudo, un vote par cible…) valident aussi le jeu : une erreur ici signale un défaut du générateur.
  await Utilisateur.syncIndexes().catch(() => {});
  await Utilisateur.insertMany(doc.utilisateurs);
  await Projet.insertMany(doc.projets);
  for (let i = 0; i < doc.echanges.length; i += 500)
    await Echange.insertMany(doc.echanges.slice(i, i + 500));

  const par = {};
  jeu.echanges.forEach((e) => {
    par[e.type] = (par[e.type] || 0) + 1;
  });
  console.log(
    `Ajouté : ${doc.utilisateurs.length} utilisateurs, ${par.post} questions, ${par.reponse} réponses, ${doc.projets.length} projets, ${par.mentorat} demandes de mentorat, ${par.message} messages.`,
  );
  console.log(
    `Connexion de démo : e-mail d'un compte (ex. ${jeu.utilisateurs[0].email}) ou son pseudo, mot de passe « ${MOT_DE_PASSE} ».`,
  );
}

if (require.main === module) {
  main()
    .then(() => mongoose.disconnect())
    .catch(async (e) => {
      console.error("Seed impossible :", e.message);
      await mongoose.disconnect().catch(() => {});
      process.exit(1);
    });
}
module.exports = { versMongo };
