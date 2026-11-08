// Défi de la semaine. Le code est exécuté dans le navigateur ; ici : création (admin/modérateur), départ du chronomètre,
// contrôle des soumissions et classement.
const express = require("express");
const mongoose = require("mongoose");

const Defi = require("../models/Defi");
const Participation = require("../models/DefiParticipation");
const AppError = require("../utils/AppError");
const v = require("../validators/defis");
const svc = require("../services/defis");
const { auth, optionalAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { envoyer } = require("../communication/notifications/notifier");
const { ecritureLimiter } = require("../middleware/rateLimit");

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const PEUPLE = "pseudo pays profil.photo";

const serialiserRang = (p) => ({
  rang: p.rang,
  duree_s: p.duree_s,
  essais: p.essais,
  user: p.user_id && p.user_id._id
    ? { id: String(p.user_id._id), pseudo: p.user_id.pseudo, pays: p.user_id.pays, profil: { photo: p.user_id.profil && p.user_id.profil.photo } }
    : null,
});

// Tout ce qu'une page de défi affiche : le défi, les compteurs, le classement et ma participation.
async function charger(defi, userId) {
  const parts = await Participation.find({ defi_id: defi._id }).populate("user_id", PEUPLE).lean();
  const classement = svc.classer(parts);
  const moi = userId ? parts.find((p) => p.user_id && String(p.user_id._id) === String(userId)) : null;
  const monRang = moi ? classement.find((p) => String(p._id) === String(moi._id)) : null;
  return {
    defi: svc.serialiserDefi(defi),
    participants: parts.length,
    reussis: classement.length,
    classement: classement.slice(0, 10).map(serialiserRang),
    // Mon rang quand je suis hors du top 10 (sinon il est déjà dans la liste)
    mon_classement: monRang && monRang.rang > 10 ? serialiserRang(monRang) : null,
    ma_participation: moi
      ? { commence: true, reussi: Boolean(moi.reussi), essais: moi.essais, tests_reussis: moi.tests_reussis, duree_s: moi.duree_s || null, rang: monRang ? monRang.rang : null, debut_at: moi.debut_at, code: moi.code || "" }
      : { commence: false },
  };
}

/* À la fin d'un défi, les trois premiers reçoivent une notification, une seule fois (le drapeau est posé de façon atomique,
   donc deux visites simultanées ne la dupliquent pas). Pas de tâche planifiée : la vérification se fait à la consultation. */
async function cloturerEchus() {
  try {
    const echus = await Defi.find({ fin: { $lte: new Date() }, cloture_notifiee: { $ne: true } }).select("_id").limit(5).lean();
    for (const { _id } of echus) {
      const defi = await Defi.findOneAndUpdate({ _id, cloture_notifiee: { $ne: true } }, { $set: { cloture_notifiee: true } });
      if (!defi) continue; // une autre requête l'a déjà fait
      const parts = await Participation.find({ defi_id: _id }).lean();
      for (const g of svc.podium(svc.classer(parts), defi)) {
        await envoyer({ destinataireId: g.user_id, acteurId: defi.auteur_id, kind: "defi_podium", message: `Podium du défi « ${defi.titre} » : place n°${g.rang}`, sujet: g.sujet });
      }
    }
  } catch (e) { console.error("[defis] clôture", e.message); }
}

/* GET /api/defis/courant : le défi en cours (sinon le dernier terminé, sinon le prochain) */
router.get("/courant", optionalAuth, asyncRoute(async (req, res) => {
  await cloturerEchus();
  const maintenant = new Date();
  let defi = await Defi.findOne({ debut: { $lte: maintenant }, fin: { $gt: maintenant } }).sort({ debut: -1 });
  if (!defi) defi = await Defi.findOne({ fin: { $lte: maintenant } }).sort({ fin: -1 });
  if (!defi) defi = await Defi.findOne({ debut: { $gt: maintenant } }).sort({ debut: 1 });
  if (!defi) return res.json({ defi: null });
  res.json(await charger(defi, req.userId));
}));

/* GET /api/defis : liste (récents d'abord) */
router.get("/", asyncRoute(async (_req, res) => {
  const defis = await Defi.find().sort({ debut: -1 }).limit(30);
  const comptes = await Participation.aggregate([
    { $match: { defi_id: { $in: defis.map((d) => d._id) } } },
    { $group: { _id: "$defi_id", participants: { $sum: 1 }, reussis: { $sum: { $cond: ["$reussi", 1, 0] } } } },
  ]);
  const par = Object.fromEntries(comptes.map((c) => [String(c._id), c]));
  res.json({
    defis: defis.map((d) => ({
      ...svc.serialiserDefi(d),
      exemples: undefined,
      participants: (par[String(d._id)] || {}).participants || 0,
      reussis: (par[String(d._id)] || {}).reussis || 0,
    })),
  });
}));

async function defiParId(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, "Défi introuvable");
  const defi = await Defi.findById(id);
  if (!defi) throw new AppError(404, "Défi introuvable");
  return defi;
}

/* GET /api/defis/:id */
router.get("/:id", optionalAuth, asyncRoute(async (req, res) => {
  await cloturerEchus();
  res.json(await charger(await defiParId(req.params.id), req.userId));
}));

/* POST /api/defis : création (admin ou modérateur) */
router.post("/", auth, requireRole("admin", "moderateur"), ecritureLimiter, asyncRoute(async (req, res) => {
  const body = v.creer.parse(req.body);
  const debut = body.debut ? new Date(body.debut) : new Date();
  const fin = new Date(debut.getTime() + body.jours * 24 * 3600 * 1000);
  const defi = await Defi.create({
    titre: body.titre,
    enonce: body.enonce,
    nom_fonction: body.nom_fonction,
    code_depart: body.code_depart || `function ${body.nom_fonction}() {\n  // Écrivez votre solution ici\n}\n`,
    tags: body.tags,
    tests: body.tests,
    debut,
    fin,
    auteur_id: req.userId,
  });
  res.status(201).json({ defi: svc.serialiserDefi(defi) });
}));

/* POST /api/defis/:id/demarrer : lance mon chronomètre (une seule fois) et donne les tests à exécuter dans le navigateur */
router.post("/:id/demarrer", auth, ecritureLimiter, asyncRoute(async (req, res) => {
  const defi = await defiParId(req.params.id);
  if (svc.statut(defi) !== "en_cours") throw new AppError(409, "Ce défi n’est pas en cours");
  const p = await Participation.findOneAndUpdate(
    { defi_id: defi._id, user_id: req.userId },
    { $setOnInsert: { debut_at: new Date(), total: defi.tests.length } },
    { upsert: true, new: true },
  );
  if (p.reussi) return res.json({ deja_reussi: true });
  res.json({
    debut_at: p.debut_at,
    code: p.code || "",
    tests: defi.tests.map((t) => ({ entree: t.entree, attendu: t.attendu, visible: t.visible })),
  });
}));

/* POST /api/defis/:id/soumettre : { code, tests_reussis, total, essais, paste_bloques } */
router.post("/:id/soumettre", auth, ecritureLimiter, asyncRoute(async (req, res) => {
  const defi = await defiParId(req.params.id);
  const s = v.soumettre.parse(req.body);
  const p = await Participation.findOne({ defi_id: defi._id, user_id: req.userId });
  if (p && p.reussi) throw new AppError(409, "Vous avez déjà réussi ce défi");
  const verdict = svc.verifierSoumission({ defi, participation: p, s });
  if (verdict.status) throw new AppError(verdict.status, verdict.message);

  p.essais = Math.max(p.essais || 0, s.essais);
  p.tests_reussis = Math.max(p.tests_reussis || 0, s.tests_reussis);
  p.total = s.total;
  p.code = s.code;
  p.paste_bloques = Math.max(p.paste_bloques || 0, s.paste_bloques);
  if (verdict.reussi) { p.reussi = true; p.valide_at = new Date(); p.duree_s = verdict.duree_s; }
  await p.save();
  res.json(await charger(defi, req.userId));
}));

module.exports = router;
