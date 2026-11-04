const express = require("express");
const mongoose = require("mongoose");

const Salon = require("../models/Salon");
const Echange = require("../models/Echange");
const Utilisateur = require("../models/Utilisateur");
const AppError = require("../utils/AppError");
const { auth } = require("../middleware/auth");
const { ecritureLimiter } = require("../middleware/rateLimit");
const v = require("../validators/salons");
const s = require("../services/salons");

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
const escapeRegex = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const idValide = (req, _res, next) =>
  mongoose.isValidObjectId(req.params.id) && String(req.params.id).length === 24
    ? next()
    : next(new AppError(400, "Identifiant invalide"));
const idUserValide = (req, _res, next) =>
  mongoose.isValidObjectId(req.params.userId) &&
  String(req.params.userId).length === 24
    ? next()
    : next(new AppError(400, "Identifiant invalide"));

router.use(auth);

const charger = async (id) => {
  const salon = await Salon.findById(id);
  if (!salon) throw new AppError(404, "Salon introuvable");
  return salon;
};
const exigerProprietaire = (salon, userId) => {
  if (!s.estProprietaire(salon, userId))
    throw new AppError(403, "Réservé au créateur du salon");
};

// Entrer dans un salon (atomique : pas de dépassement de la limite de membres même si deux personnes arrivent ensemble).
async function entrer(salon, userId, codeValide) {
  const r = s.peutRejoindre(salon, userId, { codeValide });
  if (!r.ok) throw new AppError(r.status, r.erreur);
  if (r.deja) return salon;
  if (
    (await Salon.countDocuments({ "membres.user_id": userId })) >=
    s.LIMITES.salons_rejoints
  ) {
    throw new AppError(
      409,
      `Tu es déjà dans ${s.LIMITES.salons_rejoints} salons (maximum)`,
    );
  }
  const maj = await Salon.findOneAndUpdate(
    {
      _id: salon._id,
      "membres.user_id": { $ne: userId },
      nb_membres: { $lt: s.LIMITES.membres },
    },
    {
      $push: { membres: { user_id: userId, role: "membre" } },
      $inc: { nb_membres: 1 },
    },
    { new: true },
  );
  if (maj) return maj;
  const frais = await Salon.findById(salon._id);
  if (frais && s.estMembre(frais, userId)) return frais;
  throw new AppError(409, "Ce salon est complet");
}

// Supprime le salon, ses messages, et déconnecte ses membres du canal en direct.
async function supprimerSalon(salon, io) {
  const canal = s.canalDe(salon);
  if (io) {
    (salon.membres || []).forEach((m) =>
      io.to(`user:${m.user_id}`).emit("salon_supprime", { canal }),
    );
    io.in(canal).socketsLeave(canal);
  }
  await Echange.deleteMany({ type: "message", "metadata.canal": canal });
  await Salon.deleteOne({ _id: salon._id });
}

const resoudreMembres = async (salon) => {
  const ids = salon.membres.map((m) => m.user_id);
  const users = await Utilisateur.find({ _id: { $in: ids } })
    .select("pseudo profil.photo")
    .lean();
  const par = new Map(users.map((u) => [String(u._id), u]));
  return salon.membres.map((m) => {
    const u = par.get(String(m.user_id));
    return {
      id: String(m.user_id),
      pseudo: u ? u.pseudo : "—",
      photo: (u && u.profil && u.profil.photo) || null,
      role: m.role,
      depuis: m.depuis,
    };
  });
};

/* ---------------------------------------------------------------- Listes */

// Mes salons, les plus actifs d'abord
router.get(
  "/mes",
  asyncRoute(async (req, res) => {
    const docs = await Salon.find({ "membres.user_id": req.userId })
      .sort({ derniere_activite: -1, created_at: -1 })
      .limit(60)
      .lean();
    res.json({ data: docs.map((d) => s.formater(d, req.userId)) });
  }),
);

// Salons publics à découvrir : ?q=mot&page=1
router.get(
  "/publics",
  asyncRoute(async (req, res) => {
    const q = v.liste.parse(req.query);
    const filtre = { visibilite: "public" };
    if (q.q) filtre.nom = { $regex: escapeRegex(q.q), $options: "i" };
    const [docs, total] = await Promise.all([
      Salon.find(filtre)
        .sort({ nb_membres: -1, derniere_activite: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .lean(),
      Salon.countDocuments(filtre),
    ]);
    res.json({
      data: docs.map((d) => s.formater(d, req.userId)),
      page: q.page,
      limit: q.limit,
      total,
      pages: Math.ceil(total / q.limit),
    });
  }),
);

/* ---------------------------------------------------------------- Lien d'invitation */

router.get(
  "/invitation/:code",
  asyncRoute(async (req, res) => {
    const code = v.code.parse(req.params.code);
    const salon = await Salon.findOne({ code }).lean();
    if (!salon)
      throw new AppError(404, "Ce lien d'invitation n'est plus valide");
    res.json({ salon: s.apercu(salon, req.userId) });
  }),
);

router.post(
  "/invitation/:code/rejoindre",
  ecritureLimiter,
  asyncRoute(async (req, res) => {
    const code = v.code.parse(req.params.code);
    const salon = await Salon.findOne({ code });
    if (!salon)
      throw new AppError(404, "Ce lien d'invitation n'est plus valide");
    const maj = await entrer(salon, req.userId, true);
    res.json({ salon: s.formater(maj, req.userId) });
  }),
);

/* ---------------------------------------------------------------- Création et gestion */

router.post(
  "/",
  ecritureLimiter,
  asyncRoute(async (req, res) => {
    const b = v.creer.parse(req.body);
    if (
      (await Salon.countDocuments({ proprietaire_id: req.userId })) >=
      s.LIMITES.salons_crees
    ) {
      throw new AppError(
        409,
        `Tu as déjà créé ${s.LIMITES.salons_crees} salons (maximum)`,
      );
    }
    if (
      (await Salon.countDocuments({ "membres.user_id": req.userId })) >=
      s.LIMITES.salons_rejoints
    ) {
      throw new AppError(
        409,
        `Tu es déjà dans ${s.LIMITES.salons_rejoints} salons (maximum)`,
      );
    }
    const salon = await Salon.create({
      nom: b.nom,
      description: b.description || "",
      visibilite: b.visibilite,
      code: s.genererCode(),
      proprietaire_id: req.userId,
      membres: [{ user_id: req.userId, role: "proprietaire" }],
      nb_membres: 1,
    });
    res.status(201).json({ salon: s.formater(salon, req.userId) });
  }),
);

// Détail : les membres voient tout (liste, lien) ; un salon public se consulte avant d'entrer ; un salon sur invitation reste fermé.
router.get(
  "/:id",
  idValide,
  asyncRoute(async (req, res) => {
    const salon = await charger(req.params.id);
    if (s.estMembre(salon, req.userId))
      return res.json({
        salon: s.formater(salon, req.userId),
        membres: await resoudreMembres(salon),
      });
    if (salon.visibilite === "public")
      return res.json({ salon: s.formater(salon, req.userId) });
    throw new AppError(
      403,
      "Ce salon est sur invitation : demande le lien à un membre",
    );
  }),
);

router.put(
  "/:id",
  idValide,
  ecritureLimiter,
  asyncRoute(async (req, res) => {
    const b = v.modifier.parse(req.body);
    const salon = await charger(req.params.id);
    exigerProprietaire(salon, req.userId);
    Object.assign(salon, b);
    await salon.save();
    res.json({ salon: s.formater(salon, req.userId) });
  }),
);

router.post(
  "/:id/rejoindre",
  idValide,
  ecritureLimiter,
  asyncRoute(async (req, res) => {
    const salon = await charger(req.params.id);
    const maj = await entrer(salon, req.userId, false);
    res.json({ salon: s.formater(maj, req.userId) });
  }),
);

router.post(
  "/:id/quitter",
  idValide,
  ecritureLimiter,
  asyncRoute(async (req, res) => {
    const salon = await charger(req.params.id);
    if (!s.estMembre(salon, req.userId))
      throw new AppError(400, "Tu n'es pas dans ce salon");
    const io = req.app.get("io");
    const r = s.apresDepart(salon, req.userId);
    if (r.supprimer) {
      await supprimerSalon(salon, io);
    } else {
      salon.membres = r.membres;
      salon.proprietaire_id = r.proprietaire_id;
      salon.nb_membres = r.membres.length;
      await salon.save();
      if (io) io.in(`user:${req.userId}`).socketsLeave(s.canalDe(salon));
    }
    res.json({ ok: true });
  }),
);

router.delete(
  "/:id",
  idValide,
  ecritureLimiter,
  asyncRoute(async (req, res) => {
    const salon = await charger(req.params.id);
    exigerProprietaire(salon, req.userId);
    await supprimerSalon(salon, req.app.get("io"));
    res.json({ ok: true });
  }),
);

// Le créateur retire un membre
router.delete(
  "/:id/membres/:userId",
  idValide,
  idUserValide,
  ecritureLimiter,
  asyncRoute(async (req, res) => {
    const salon = await charger(req.params.id);
    exigerProprietaire(salon, req.userId);
    if (req.params.userId === req.userId)
      throw new AppError(400, "Utilise « Quitter le salon » pour partir");
    const maj = await Salon.findOneAndUpdate(
      { _id: salon._id, "membres.user_id": req.params.userId },
      {
        $pull: { membres: { user_id: req.params.userId } },
        $inc: { nb_membres: -1 },
      },
      { new: true },
    );
    if (!maj) throw new AppError(404, "Cette personne n'est pas dans le salon");
    const io = req.app.get("io");
    if (io) {
      io.to(`user:${req.params.userId}`).emit("salon_retire", {
        canal: s.canalDe(salon),
      });
      io.in(`user:${req.params.userId}`).socketsLeave(s.canalDe(salon));
    }
    res.json({ ok: true });
  }),
);

// Nouveau lien d'invitation : l'ancien cesse de fonctionner
router.post(
  "/:id/code",
  idValide,
  ecritureLimiter,
  asyncRoute(async (req, res) => {
    const salon = await charger(req.params.id);
    exigerProprietaire(salon, req.userId);
    salon.code = s.genererCode();
    await salon.save();
    res.json({ code: salon.code });
  }),
);

module.exports = router;
