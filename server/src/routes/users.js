const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const Utilisateur = require('../models/Utilisateur');
const AppError = require('../utils/AppError');
const { auth } = require('../middleware/auth');
const { publicUser, privateUser, PUBLIC_FIELDS } = require('../utils/serialize');
const v = require('../validators/users');

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Transforme { profil: { liens: { site } } } en { 'profil.liens.site': ... } pour ne pas écraser le reste.
// Une chaîne vide supprime le champ.
function flatten(obj, prefix = '', set = {}, unset = {}) {
  Object.entries(obj).forEach(([k, val]) => {
    if (val === undefined) return;
    const path = prefix ? `${prefix}.${k}` : k;
    if (val && typeof val === 'object' && !Array.isArray(val)) flatten(val, path, set, unset);
    else if (val === '') unset[path] = '';
    else set[path] = val;
  });
  return { set, unset };
}

/* F-06 : recherche de développeurs — publique */
router.get('/', asyncRoute(async (req, res) => {
  const q = v.search.parse(req.query);
  const filter = {};
  if (q.q) filter.pseudo = { $regex: escapeRegex(q.q), $options: 'i' };
  if (q.stack && q.stack.length) filter.stacks = { $in: q.stack };
  if (q.pays) filter.pays = q.pays;
  if (q.niveau) filter['profil.niveau'] = q.niveau;
  if (q.objectif) filter.objectifs = q.objectif;

  const tri = { reputation: { reputation: -1, _id: 1 }, recent: { created_at: -1 }, pseudo: { pseudo: 1 } }[q.tri];

  const [data, total] = await Promise.all([
    Utilisateur.find(filter).select(PUBLIC_FIELDS).sort(tri).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Utilisateur.countDocuments(filter)
  ]);

  res.json({
    data: data.map(publicUser),
    page: q.page,
    limit: q.limit,
    total,
    pages: Math.ceil(total / q.limit)
  });
}));

/* F-02 à F-05 : modifier son profil */
router.put('/me', auth, asyncRoute(async (req, res) => {
  const body = v.updateProfile.parse(req.body);

  if (body.pseudo && body.pseudo.toLowerCase() !== req.user.pseudo.toLowerCase()) {
    if (await Utilisateur.exists({ pseudo: body.pseudo }).collation({ locale: 'en', strength: 2 })) throw new AppError(409, 'Ce pseudo est déjà pris');
  }

  const { set, unset } = flatten(body);
  const update = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(unset).length) update.$unset = unset;
  if (!Object.keys(update).length) throw new AppError(400, 'Aucune modification fournie');

  const user = await Utilisateur.findByIdAndUpdate(req.userId, update, { new: true, runValidators: true });
  res.json({ utilisateur: privateUser(user) });
}));

router.put('/me/password', auth, asyncRoute(async (req, res) => {
  const body = v.changePassword.parse(req.body);
  const user = req.user;

  if (user.mot_de_passe_hash) {
    const ok = body.ancien_mot_de_passe && (await bcrypt.compare(body.ancien_mot_de_passe, user.mot_de_passe_hash));
    if (!ok) throw new AppError(401, 'Ancien mot de passe incorrect');
  } // sinon : compte GitHub/OTP qui définit son premier mot de passe

  user.mot_de_passe_hash = await bcrypt.hash(body.nouveau_mot_de_passe, 12);
  await user.save();
  res.json({ message: 'Mot de passe mis à jour' });
}));

/* F-07 : profil public d'un autre développeur */
router.get('/:id', asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(404, 'Utilisateur introuvable');
  const user = await Utilisateur.findById(req.params.id).select(PUBLIC_FIELDS).lean();
  if (!user) throw new AppError(404, 'Utilisateur introuvable');
  res.json({ utilisateur: publicUser(user) });
}));

module.exports = router;
