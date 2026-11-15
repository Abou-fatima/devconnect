// Duel de code en direct : créer, rejoindre, suivre l'avancée de l'adversaire (interrogation toutes les ~1,5 s), envoyer son résultat,
// retrouver ses duels pour les reprendre ou les supprimer.
const express = require("express");
const { z } = require("zod");

const AppError = require("../utils/AppError");
const svc = require("../services/duels");
const stock = require("../services/duelsStock");
const reputation = require("../services/reputation");
const { auth } = require("../middleware/auth");
const { ecritureLimiter } = require("../middleware/rateLimit");

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(auth);

const duelOuErreur = async (code) => {
  const d = svc.trouver(code) || (await stock.charger(code));
  if (!d) throw new AppError(404, "Duel introuvable ou expiré. Demandez un nouveau lien à votre adversaire.");
  return d;
};

// Mes duels (les plus récents d'abord)
router.get("/", asyncRoute(async (req, res) => {
  const liste = await stock.mesDuels(req.userId);
  res.json({ duels: liste.map((d) => svc.resume(d, req.userId)) });
}));

router.post("/", ecritureLimiter, asyncRoute(async (req, res) => {
  const duel = svc.creer(req.user);
  await stock.sauvegarder(duel);
  res.status(201).json(svc.vue(duel, req.userId));
}));

router.post("/:code/rejoindre", ecritureLimiter, asyncRoute(async (req, res) => {
  const duel = await duelOuErreur(req.params.code);
  if (!svc.rejoindre(duel, req.user)) throw new AppError(409, "Ce duel a déjà deux joueurs.");
  await stock.sauvegarder(duel);
  res.json(svc.vue(duel, req.userId));
}));

// Supprimer un duel : réservé à celui qui l'a créé.
router.delete("/:code", ecritureLimiter, asyncRoute(async (req, res) => {
  const duel = await duelOuErreur(req.params.code);
  if (duel.joueurs[0].id !== req.userId) throw new AppError(403, "Seul le créateur du duel peut le supprimer.");
  await stock.supprimer(duel.code);
  res.json({ ok: true });
}));

router.get("/:code", asyncRoute(async (req, res) => {
  const duel = await duelOuErreur(req.params.code);
  res.json(svc.vue(duel, req.userId));
}));

router.post("/:code/progres", asyncRoute(async (req, res) => {
  const duel = await duelOuErreur(req.params.code);
  const body = z.object({ tests_reussis: z.number().int(), total: z.number().int() }).parse(req.body);
  const r = svc.progres(duel, req.userId, body);
  if (r.status) throw new AppError(r.status, r.message);
  if (r.gagne && !duel.points_donnes) {
    duel.points_donnes = true; // une seule attribution, même si deux requêtes arrivent ensemble
    const perdant = duel.joueurs.find((j) => j.id !== duel.gagnant_id);
    try {
      await reputation.changer(duel.gagnant_id, svc.PTS_GAGNANT);
      if (perdant) await reputation.changer(perdant.id, svc.PTS_PERDANT);
    } catch (e) { console.error("[duels] points", e.message); }
  }
  if (r.gagne) await stock.sauvegarder(duel);
  res.json(svc.vue(duel, req.userId));
}));

module.exports = router;
