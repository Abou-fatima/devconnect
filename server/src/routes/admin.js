const express = require('express');
const mongoose = require('mongoose');

const Echange = require('../models/Echange');
const Utilisateur = require('../models/Utilisateur');
const AppError = require('../utils/AppError');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { publicUser } = require('../utils/serialize');
const v = require('../validators/echanges');
const { AUTEUR_FIELDS, formater, supprimerEchange } = require('../services/echanges');

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const idValide = (req, _res, next) => (mongoose.isValidObjectId(req.params.id) && String(req.params.id).length === 24
  ? next() : next(new AppError(400, 'Identifiant invalide')));

// Tout ce module est réservé aux modérateurs et administrateurs.
router.use(auth, requireRole('admin', 'moderateur'));

// Contenus signalés, les plus signalés d'abord
router.get('/signalements', asyncRoute(async (req, res) => {
  const q = v.pagination.parse(req.query);
  const filtre = { 'metadata.nb_signalements': { $gt: 0 } };
  const [docs, total] = await Promise.all([
    Echange.find(filtre).sort({ 'metadata.nb_signalements': -1, created_at: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).populate('auteur_id', AUTEUR_FIELDS).lean(),
    Echange.countDocuments(filtre)
  ]);
  const data = docs.map((d) => ({
    ...formater(d, { resume: true, admin: true }),
    signalements: ((d.metadata && d.metadata.signalements) || []).map((s) => ({ user_id: String(s.user_id), motif: s.motif, date: s.date }))
  }));
  res.json({ data, page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) });
}));

// Supprimer un contenu (et ses réponses, commentaires, votes)
router.delete('/echanges/:id', idValide, asyncRoute(async (req, res) => {
  const doc = await Echange.findOne({ _id: req.params.id, type: { $in: ['post', 'reponse', 'commentaire'] } });
  if (!doc) throw new AppError(404, 'Contenu introuvable');
  res.json({ ok: true, supprimes: await supprimerEchange(doc) });
}));

// Classer un signalement (contenu jugé correct) : remet le compteur à zéro
router.put('/echanges/:id/signalements/classer', idValide, asyncRoute(async (req, res) => {
  const r = await Echange.updateOne({ _id: req.params.id }, { $unset: { 'metadata.signalements': '', 'metadata.nb_signalements': '' } });
  if (!r.matchedCount) throw new AppError(404, 'Contenu introuvable');
  res.json({ ok: true });
}));

// Changer le rôle d'un utilisateur : administrateurs uniquement
router.put('/users/:id/role', idValide, requireRole('admin'), asyncRoute(async (req, res) => {
  const { role } = v.role.parse(req.body);
  if (req.params.id === req.userId) throw new AppError(400, 'Vous ne pouvez pas modifier votre propre rôle');
  const user = await Utilisateur.findByIdAndUpdate(req.params.id, { $set: { role } }, { new: true });
  if (!user) throw new AppError(404, 'Utilisateur introuvable');
  res.json({ utilisateur: { ...publicUser(user), role: user.role } });
}));

module.exports = router;
