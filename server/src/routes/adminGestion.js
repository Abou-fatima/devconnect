const express = require("express");
const mongoose = require("mongoose");
const { z } = require("zod");

const Echange = require("../models/Echange");
const Projet = require("../models/Projet");
const Utilisateur = require("../models/Utilisateur");
const PushAbonnement = require("../models/PushAbonnement");
const DefiParticipation = require("../models/DefiParticipation");
const AppError = require("../utils/AppError");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { formater, AUTEUR_FIELDS, supprimerEchange } = require("../services/echanges");

/* Gestion complète du site par l'équipe d'administration.
   - Modérateurs : voir, bloquer / débloquer les développeurs, modifier ou supprimer des contenus.
   - Administrateurs : tout, y compris changer un rôle, modifier un profil et supprimer un compte. */

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const idValide = (req, _res, next) =>
  mongoose.isValidObjectId(req.params.id) && String(req.params.id).length === 24
    ? next()
    : next(new AppError(400, "Identifiant invalide"));

router.use(auth, requireRole("admin", "moderateur"));

const echapper = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};
const reponsePage = (data, total, { page, limit }) => ({ data, page, limit, total, pages: Math.ceil(total / limit) });

const vueUtilisateur = (u) => ({
  id: String(u._id),
  pseudo: u.pseudo,
  email: u.email || null,
  telephone: u.telephone || null,
  role: u.role,
  pays: u.pays || null,
  ville: u.ville || null,
  bio: (u.profil && u.profil.bio) || "",
  photo: (u.profil && u.profil.photo) || null,
  reputation: u.reputation || 0,
  bloque: Boolean(u.bloque),
  bloque_motif: u.bloque_motif || null,
  bloque_le: u.bloque_le || null,
  created_at: u.created_at,
});

/* ------------------------------------------------------------------ Utilisateurs */

router.get(
  "/users",
  asyncRoute(async (req, res) => {
    const p = pagination(req);
    const filtre = {};
    const q = String(req.query.q || "").trim().slice(0, 60);
    if (q) {
      const re = new RegExp(echapper(q), "i");
      filtre.$or = [{ pseudo: re }, { email: re }, { telephone: re }];
    }
    if (["dev", "moderateur", "admin"].includes(req.query.role)) filtre.role = req.query.role;
    if (req.query.bloque === "true") filtre.bloque = true;
    const [docs, total] = await Promise.all([
      Utilisateur.find(filtre).sort({ created_at: -1 }).skip(p.skip).limit(p.limit).lean(),
      Utilisateur.countDocuments(filtre),
    ]);
    res.json(reponsePage(docs.map(vueUtilisateur), total, p));
  }),
);

// Bloquer ou débloquer un compte (la personne est déconnectée de fait : son jeton est refusé).
router.put(
  "/users/:id/blocage",
  idValide,
  asyncRoute(async (req, res) => {
    const { bloque, motif } = z
      .object({ bloque: z.boolean(), motif: z.string().trim().max(200).optional() })
      .parse(req.body);
    if (req.params.id === req.userId) throw new AppError(400, "Vous ne pouvez pas bloquer votre propre compte.");
    const cible = await Utilisateur.findById(req.params.id);
    if (!cible) throw new AppError(404, "Utilisateur introuvable");
    if (req.user.role !== "admin" && cible.role !== "dev")
      throw new AppError(403, "Seul un administrateur peut bloquer un modérateur ou un administrateur.");
    if (cible.role === "admin" && req.user.role === "admin" && bloque)
      throw new AppError(403, "Retirez d'abord le rôle d'administrateur de ce compte avant de le bloquer.");
    if (bloque) {
      cible.bloque = true;
      cible.bloque_motif = motif || undefined;
      cible.bloque_le = new Date();
    } else {
      cible.bloque = false;
      cible.bloque_motif = undefined;
      cible.bloque_le = undefined;
    }
    await cible.save();
    if (bloque) await PushAbonnement.deleteMany({ user_id: cible._id }).catch(() => {}); // plus d'alertes sur ses appareils
    res.json({ utilisateur: vueUtilisateur(cible) });
  }),
);

// Modifier un profil (administrateurs)
router.put(
  "/users/:id",
  idValide,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const d = z
      .object({
        pseudo: z.string().trim().min(2).max(30).optional(),
        pays: z.string().trim().max(2).optional(),
        ville: z.string().trim().max(60).optional(),
        bio: z.string().trim().max(500).optional(),
      })
      .parse(req.body);
    const maj = {};
    if (d.pseudo !== undefined) maj.pseudo = d.pseudo;
    if (d.pays !== undefined) maj.pays = d.pays.toUpperCase() || undefined;
    if (d.ville !== undefined) maj.ville = d.ville;
    if (d.bio !== undefined) maj["profil.bio"] = d.bio;
    if (!Object.keys(maj).length) throw new AppError(400, "Rien à modifier.");
    let user;
    try {
      user = await Utilisateur.findByIdAndUpdate(req.params.id, { $set: maj }, { new: true });
    } catch (e) {
      if (e && e.code === 11000) throw new AppError(409, "Ce pseudo est déjà pris.");
      throw e;
    }
    if (!user) throw new AppError(404, "Utilisateur introuvable");
    res.json({ utilisateur: vueUtilisateur(user) });
  }),
);

// Supprimer un compte et ses contenus (administrateurs). Un administrateur doit d'abord perdre son rôle.
router.delete(
  "/users/:id",
  idValide,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    if (req.params.id === req.userId) throw new AppError(400, "Vous ne pouvez pas supprimer votre propre compte.");
    const cible = await Utilisateur.findById(req.params.id);
    if (!cible) throw new AppError(404, "Utilisateur introuvable");
    if (cible.role === "admin") throw new AppError(403, "Retirez d'abord le rôle d'administrateur de ce compte avant de le supprimer.");

    const publications = await Echange.find({ auteur_id: cible._id, type: { $in: ["post", "reponse", "commentaire"] } })
      .select("_id")
      .lean();
    for (const { _id } of publications) {
      const d = await Echange.findById(_id); // peut déjà avoir disparu avec sa question
      if (d) await supprimerEchange(d);
    }
    await Echange.deleteMany({ auteur_id: cible._id });
    await Projet.deleteMany({ porteur_id: cible._id });
    await Projet.updateMany({ "membres.user_id": cible._id }, { $pull: { membres: { user_id: cible._id } } });
    await PushAbonnement.deleteMany({ user_id: cible._id }).catch(() => {});
    await DefiParticipation.deleteMany({ user_id: cible._id }).catch(() => {});
    await Utilisateur.deleteOne({ _id: cible._id });
    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------------ Contenus du forum */

router.get(
  "/echanges",
  asyncRoute(async (req, res) => {
    const p = pagination(req);
    const type = ["post", "reponse", "commentaire"].includes(req.query.type) ? req.query.type : null;
    const filtre = { type: type || { $in: ["post", "reponse", "commentaire"] } };
    const q = String(req.query.q || "").trim().slice(0, 60);
    if (q) {
      const re = new RegExp(echapper(q), "i");
      filtre.$or = [{ titre: re }, { contenu: re }];
    }
    const [docs, total] = await Promise.all([
      Echange.find(filtre).sort({ created_at: -1 }).skip(p.skip).limit(p.limit).populate("auteur_id", AUTEUR_FIELDS).lean(),
      Echange.countDocuments(filtre),
    ]);
    const data = docs.map((d) => ({ ...formater(d, { resume: true, admin: true }), titre: d.titre || null, contenu: d.contenu || "" }));
    res.json(reponsePage(data, total, p));
  }),
);

router.put(
  "/echanges/:id",
  idValide,
  asyncRoute(async (req, res) => {
    const d = z
      .object({ titre: z.string().trim().min(1).max(200).optional(), contenu: z.string().trim().min(1).max(20000).optional() })
      .parse(req.body);
    const doc = await Echange.findOne({ _id: req.params.id, type: { $in: ["post", "reponse", "commentaire"] } });
    if (!doc) throw new AppError(404, "Contenu introuvable");
    if (d.titre !== undefined && doc.type === "post") doc.titre = d.titre;
    if (d.contenu !== undefined) doc.contenu = d.contenu;
    await doc.save();
    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------------ Projets */

router.get(
  "/projets",
  asyncRoute(async (req, res) => {
    const p = pagination(req);
    const filtre = {};
    const q = String(req.query.q || "").trim().slice(0, 60);
    if (q) {
      const re = new RegExp(echapper(q), "i");
      filtre.$or = [{ titre: re }, { description: re }];
    }
    const [docs, total] = await Promise.all([
      Projet.find(filtre).sort({ created_at: -1 }).skip(p.skip).limit(p.limit).populate("porteur_id", "pseudo").lean(),
      Projet.countDocuments(filtre),
    ]);
    const data = docs.map((x) => ({
      id: String(x._id),
      titre: x.titre,
      description: x.description || "",
      statut: x.statut,
      porteur: x.porteur_id && x.porteur_id.pseudo ? x.porteur_id.pseudo : null,
      membres: (x.membres || []).length,
      created_at: x.created_at,
    }));
    res.json(reponsePage(data, total, p));
  }),
);

router.put(
  "/projets/:id",
  idValide,
  asyncRoute(async (req, res) => {
    const d = z
      .object({
        titre: z.string().trim().min(1).max(120).optional(),
        description: z.string().trim().max(5000).optional(),
        statut: z.enum(["idee", "en_cours", "termine"]).optional(),
      })
      .parse(req.body);
    const projet = await Projet.findByIdAndUpdate(req.params.id, { $set: d }, { new: true });
    if (!projet) throw new AppError(404, "Projet introuvable");
    res.json({ ok: true });
  }),
);

router.delete(
  "/projets/:id",
  idValide,
  asyncRoute(async (req, res) => {
    const r = await Projet.deleteOne({ _id: req.params.id });
    if (!r.deletedCount) throw new AppError(404, "Projet introuvable");
    await Echange.deleteMany({ type: "candidature", cible_type: "projet", cible_id: req.params.id });
    res.json({ ok: true });
  }),
);

module.exports = router;
