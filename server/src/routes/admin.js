const express = require("express");
const mongoose = require("mongoose");

const Echange = require("../models/Echange");
const Utilisateur = require("../models/Utilisateur");
const AppError = require("../utils/AppError");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { publicUser } = require("../utils/serialize");
const v = require("../validators/echanges");
const {
  AUTEUR_FIELDS,
  formater,
  supprimerEchange,
} = require("../services/echanges");
const Projet = require("../models/Projet");
const stats = require("../services/stats");

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
const idValide = (req, _res, next) =>
  mongoose.isValidObjectId(req.params.id) && String(req.params.id).length === 24
    ? next()
    : next(new AppError(400, "Identifiant invalide"));

// Tout ce module est réservé aux modérateurs et administrateurs.
router.use(auth, requireRole("admin", "moderateur"));

// Contenus signalés, les plus signalés d'abord
router.get(
  "/signalements",
  asyncRoute(async (req, res) => {
    const q = v.pagination.parse(req.query);
    const filtre = { "metadata.nb_signalements": { $gt: 0 } };
    const [docs, total] = await Promise.all([
      Echange.find(filtre)
        .sort({ "metadata.nb_signalements": -1, created_at: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate("auteur_id", AUTEUR_FIELDS)
        .lean(),
      Echange.countDocuments(filtre),
    ]);
    // Pour une réponse ou un commentaire signalé : retrouver la question à ouvrir.
    const parentIds = docs
      .filter((d) => d.type !== "post" && d.parent_id)
      .map((d) => d.parent_id);
    const parents = new Map(
      (parentIds.length
        ? await Echange.find({ _id: { $in: parentIds } })
            .select("type parent_id")
            .lean()
        : []
      ).map((p) => [String(p._id), p]),
    );
    const data = docs.map((d) => ({
      ...formater(d, { resume: true, admin: true }),
      question_id: stats.idQuestion(d, parents),
      signalements: ((d.metadata && d.metadata.signalements) || []).map(
        (s) => ({ user_id: String(s.user_id), motif: s.motif, date: s.date }),
      ),
    }));
    res.json({
      data,
      page: q.page,
      limit: q.limit,
      total,
      pages: Math.ceil(total / q.limit),
    });
  }),
);

// Chiffres de la plateforme (page « Statistiques »)
router.get(
  "/stats",
  asyncRoute(async (_req, res) => {
    const maintenant = new Date();
    const jours = stats.derniersJours(14, maintenant);
    const depuis14 = stats.debutPeriode(14, maintenant);
    const depuis7 = new Date(maintenant.getTime() - 7 * 24 * 3600 * 1000);
    const parJour = (champ) => [
      { $match: { [champ]: { $gte: depuis14 } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: `$${champ}`,
              timezone: "UTC",
            },
          },
          n: { $sum: 1 },
        },
      },
    ];
    const E = (filtre) => Echange.countDocuments(filtre);

    const [
      total,
      nouveaux,
      roles,
      inscrits,
      questionsJour,
      topPays,
      topTags,
      questions,
      reponses,
      commentaires,
      resolues,
      sansReponse,
      messages,
      vocaux,
      candidatures,
      mentorats,
      signales,
      projets,
      projetsStatut,
    ] = await Promise.all([
      Utilisateur.countDocuments({}),
      Utilisateur.countDocuments({ created_at: { $gte: depuis7 } }),
      Utilisateur.aggregate([{ $group: { _id: "$role", n: { $sum: 1 } } }]),
      Utilisateur.aggregate(parJour("created_at")),
      Echange.aggregate([
        { $match: { type: "post" } },
        ...parJour("created_at"),
      ]),
      Utilisateur.aggregate([
        { $match: { pays: { $nin: [null, ""] } } },
        { $group: { _id: "$pays", n: { $sum: 1 } } },
        { $sort: { n: -1, _id: 1 } },
        { $limit: 5 },
      ]),
      Echange.aggregate([
        { $match: { type: "post" } },
        { $unwind: "$metadata.tags" },
        { $group: { _id: "$metadata.tags", n: { $sum: 1 } } },
        { $sort: { n: -1, _id: 1 } },
        { $limit: 5 },
      ]),
      E({ type: "post" }),
      E({ type: "reponse" }),
      E({ type: "commentaire" }),
      E({ type: "post", "metadata.statut": "resolu" }),
      E({ type: "post", "metadata.nb_reponses": 0 }),
      E({ type: "message" }),
      E({ type: "message", audio_url: { $nin: [null, ""] } }),
      E({ type: "candidature" }),
      E({ type: "mentorat" }),
      E({ "metadata.nb_signalements": { $gt: 0 } }),
      Projet.countDocuments({}),
      Projet.aggregate([{ $group: { _id: "$statut", n: { $sum: 1 } } }]),
    ]);

    const statuts = Object.fromEntries(projetsStatut.map((x) => [x._id, x.n]));
    res.json({
      genere_le: maintenant,
      utilisateurs: {
        total,
        nouveaux_7j: nouveaux,
        par_role: stats.parRole(roles),
      },
      forum: {
        questions,
        reponses,
        commentaires,
        resolues,
        sans_reponse: sansReponse,
      },
      projets: {
        total: projets,
        idee: statuts.idee || 0,
        en_cours: statuts.en_cours || 0,
        termine: statuts.termine || 0,
      },
      communication: { messages, vocaux },
      collaboration: { candidatures, mentorats },
      moderation: { signalements_en_attente: signales },
      inscriptions_14j: stats.completerSerie(inscrits, jours),
      questions_14j: stats.completerSerie(questionsJour, jours),
      top_pays: topPays.map((x) => ({ code: x._id, n: x.n })),
      top_tags: topTags.map((x) => ({ tag: x._id, n: x.n })),
    });
  }),
);

// Supprimer un contenu (et ses réponses, commentaires, votes)
router.delete(
  "/echanges/:id",
  idValide,
  asyncRoute(async (req, res) => {
    const doc = await Echange.findOne({
      _id: req.params.id,
      type: { $in: ["post", "reponse", "commentaire"] },
    });
    if (!doc) throw new AppError(404, "Contenu introuvable");
    res.json({ ok: true, supprimes: await supprimerEchange(doc) });
  }),
);

// Classer un signalement (contenu jugé correct) : remet le compteur à zéro
router.put(
  "/echanges/:id/signalements/classer",
  idValide,
  asyncRoute(async (req, res) => {
    const r = await Echange.updateOne(
      { _id: req.params.id },
      {
        $unset: { "metadata.signalements": "", "metadata.nb_signalements": "" },
      },
    );
    if (!r.matchedCount) throw new AppError(404, "Contenu introuvable");
    res.json({ ok: true });
  }),
);

// Changer le rôle d'un utilisateur : administrateurs uniquement
router.put(
  "/users/:id/role",
  idValide,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const { role } = v.role.parse(req.body);
    if (req.params.id === req.userId)
      throw new AppError(400, "Vous ne pouvez pas modifier votre propre rôle");
    const user = await Utilisateur.findByIdAndUpdate(
      req.params.id,
      { $set: { role } },
      { new: true },
    );
    if (!user) throw new AppError(404, "Utilisateur introuvable");
    res.json({ utilisateur: { ...publicUser(user), role: user.role } });
  }),
);

module.exports = router;
