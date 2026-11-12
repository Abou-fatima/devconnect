const express = require("express");
const { NIVEAUX, OBJECTIFS, STACKS_SUGGEREES } = require("../utils/constants");
const Utilisateur = require("../models/Utilisateur");
const { normaliser } = require("../services/cartePays");

const router = express.Router();

// Listes pour alimenter les formulaires et filtres du frontend
router.get("/options", (_req, res) =>
  res.json({
    niveaux: NIVEAUX,
    objectifs: OBJECTIFS,
    stacks: STACKS_SUGGEREES,
  }),
);

// Carte d'Afrique : nombre de membres par pays (public, aucune donnée personnelle). Court cache : la carte n'a pas besoin d'être à la seconde.
router.get("/pays", async (_req, res, next) => {
  try {
    const rangees = await Utilisateur.aggregate([
      { $match: { pays: { $type: "string", $ne: "" } } },
      { $group: { _id: { $toUpper: "$pays" }, total: { $sum: 1 } } },
    ]);
    res.set("Cache-Control", "public, max-age=60").json(normaliser(rangees));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
