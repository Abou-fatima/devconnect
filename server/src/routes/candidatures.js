const express = require("express");
const mongoose = require("mongoose");

const Projet = require("../models/Projet");
const Echange = require("../models/Echange");
const AppError = require("../utils/AppError");
const v = require("../validators/candidatures");
const collab = require("../services/collaboration");
const { auth } = require("../middleware/auth");
const { ecritureLimiter } = require("../middleware/rateLimit");

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Une seule candidature EN ATTENTE par personne et par projet (créé ici pour ne pas modifier le modèle Echange ; Mongoose attend la connexion).
Echange.collection
  .createIndex(
    { auteur_id: 1, cible_id: 1 },
    {
      unique: true,
      partialFilterExpression: {
        type: "candidature",
        "metadata.statut": "en_attente",
      },
      name: "candidature_unique_en_attente",
    },
  )
  .catch((e) => console.error("[candidatures] index :", e.message));

const CANDIDAT = "pseudo profil.photo reputation pays ville stacks";
const FILTRE_PROJET = (projetId) => ({
  type: "candidature",
  cible_type: "projet",
  cible_id: projetId,
});

const idValide = (id, quoi) => {
  if (!mongoose.isValidObjectId(id))
    throw new AppError(404, `${quoi} introuvable`);
};

async function trouverProjet(id) {
  idValide(id, "Projet");
  const projet = await Projet.findById(id);
  if (!projet) throw new AppError(404, "Projet introuvable");
  return projet;
}

function verifierProprietaire(projet, userId) {
  if (String(projet.porteur_id) !== String(userId))
    throw new AppError(403, "Action réservée au porteur du projet");
}

async function trouverCandidature(id) {
  idValide(id, "Candidature");
  const cand = await Echange.findOne({
    _id: id,
    type: "candidature",
    cible_type: "projet",
  });
  if (!cand) throw new AppError(404, "Candidature introuvable");
  const projet = await Projet.findById(cand.cible_id);
  if (!projet) throw new AppError(404, "Projet introuvable");
  return { cand, projet };
}

/* POST /api/projets/:id/candidatures  { message, role? }
   Se proposer pour rejoindre un projet. Le porteur est prévenu. */
router.post(
  "/projets/:id/candidatures",
  auth,
  ecritureLimiter,
  asyncRoute(async (req, res) => {
    const projet = await trouverProjet(req.params.id);
    const body = v.candidater.parse(req.body);

    const base = { ...FILTRE_PROJET(projet._id), auteur_id: req.userId };
    const [enAttente, nbPrecedentes] = await Promise.all([
      Echange.exists({ ...base, "metadata.statut": "en_attente" }),
      Echange.countDocuments(base),
    ]);
    const refus = collab.verifierCandidature({
      projet,
      userId: req.userId,
      enAttente: Boolean(enAttente),
      nbPrecedentes,
    });
    if (refus) throw new AppError(refus.status, refus.message);

    let doc;
    try {
      doc = await Echange.create({
        type: "candidature",
        auteur_id: req.userId,
        cible_type: "projet",
        cible_id: projet._id,
        contenu: body.message,
        metadata: {
          statut: "en_attente",
          ...(body.role ? { role: body.role } : {}),
        },
      });
    } catch (e) {
      if (e.code === 11000)
        throw new AppError(
          409,
          "Tu as déjà une candidature en attente pour ce projet",
        ); // deux clics simultanés
      throw e;
    }

    await collab.notifierCollab({
      kind: "candidature",
      destinataireId: projet.porteur_id,
      acteur: req.user,
      projet,
    });
    res.status(201).json({ candidature: collab.serialiserCandidature(doc) });
  }),
);

/* GET /api/projets/:id/candidatures?statut=en_attente   (porteur uniquement) */
router.get(
  "/projets/:id/candidatures",
  auth,
  asyncRoute(async (req, res) => {
    const projet = await trouverProjet(req.params.id);
    verifierProprietaire(projet, req.userId);
    const filtre = FILTRE_PROJET(projet._id);
    if (["en_attente", "acceptee", "refusee"].includes(req.query.statut))
      filtre["metadata.statut"] = req.query.statut;
    const docs = await Echange.find(filtre)
      .sort({ created_at: -1 })
      .limit(100)
      .populate("auteur_id", CANDIDAT)
      .lean();
    const data = docs.map((d) => collab.serialiserCandidature(d, d.auteur_id));
    res.json({ data, total: data.length });
  }),
);

// Décision du porteur : accepter ou refuser. L'état n'est modifié que s'il est encore « en_attente » (pas de double décision).
async function decider(req, res, accepte) {
  const { cand, projet } = await trouverCandidature(req.params.id);
  verifierProprietaire(projet, req.userId);
  const { role } = v.decision.parse(req.body ?? {});
  const roleDonne = collab.roleFinal(cand, role);

  const maj = await Echange.findOneAndUpdate(
    { _id: cand._id, "metadata.statut": "en_attente" },
    {
      $set: {
        "metadata.statut": accepte ? "acceptee" : "refusee",
        "metadata.decide_le": new Date(),
        ...(accepte ? { "metadata.role_final": roleDonne } : {}),
      },
    },
    { new: true },
  );
  if (!maj) throw new AppError(409, "Cette candidature a déjà été traitée");

  if (accepte) {
    // Jamais deux fois la même personne dans l'équipe
    await Projet.updateOne(
      { _id: projet._id, "membres.user_id": { $ne: cand.auteur_id } },
      { $push: { membres: { user_id: cand.auteur_id, role: roleDonne } } },
    );
  }
  await collab.notifierCollab({
    kind: accepte ? "candidature_acceptee" : "candidature_refusee",
    destinataireId: cand.auteur_id,
    acteur: req.user,
    projet,
  });
  res.json({ candidature: collab.serialiserCandidature(maj) });
}
router.put(
  "/candidatures/:id/accepter",
  auth,
  ecritureLimiter,
  asyncRoute((req, res) => decider(req, res, true)),
);
router.put(
  "/candidatures/:id/refuser",
  auth,
  ecritureLimiter,
  asyncRoute((req, res) => decider(req, res, false)),
);

/* DELETE /api/candidatures/:id : le candidat retire sa candidature tant qu'elle est en attente. */
router.delete(
  "/candidatures/:id",
  auth,
  ecritureLimiter,
  asyncRoute(async (req, res) => {
    const { cand } = await trouverCandidature(req.params.id);
    if (String(cand.auteur_id) !== String(req.userId))
      throw new AppError(403, "Tu ne peux retirer que ta propre candidature");
    const r = await Echange.deleteOne({
      _id: cand._id,
      "metadata.statut": "en_attente",
    });
    if (!r.deletedCount)
      throw new AppError(409, "Cette candidature a déjà été traitée");
    res.json({ message: "Candidature retirée" });
  }),
);

/* PUT /api/projets/:id/membres/:userId  { role }   (porteur) : changer le rôle d'un membre */
router.put(
  "/projets/:id/membres/:userId",
  auth,
  ecritureLimiter,
  asyncRoute(async (req, res) => {
    const projet = await trouverProjet(req.params.id);
    verifierProprietaire(projet, req.userId);
    idValide(req.params.userId, "Membre");
    const { role } = v.changerRole.parse(req.body);
    const r = await Projet.updateOne(
      { _id: projet._id, "membres.user_id": req.params.userId },
      { $set: { "membres.$.role": role } },
    );
    if (!r.matchedCount)
      throw new AppError(404, "Ce membre ne fait pas partie du projet");
    res.json({ message: "Rôle mis à jour", role });
  }),
);

/* DELETE /api/projets/:id/membres/:userId : le porteur retire un membre, ou le membre quitte lui-même l'équipe. */
router.delete(
  "/projets/:id/membres/:userId",
  auth,
  ecritureLimiter,
  asyncRoute(async (req, res) => {
    const projet = await trouverProjet(req.params.id);
    idValide(req.params.userId, "Membre");
    const quitte = String(req.params.userId) === String(req.userId);
    if (!quitte) verifierProprietaire(projet, req.userId);
    const r = await Projet.updateOne(
      { _id: projet._id },
      { $pull: { membres: { user_id: req.params.userId } } },
    );
    if (!r.modifiedCount)
      throw new AppError(404, "Ce membre ne fait pas partie du projet");
    res.json({ message: quitte ? "Tu as quitté le projet" : "Membre retiré" });
  }),
);

module.exports = router;
