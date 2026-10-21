const express = require('express');
const Utilisateur = require('../models/Utilisateur');
const { publicUser, PUBLIC_FIELDS } = require('../utils/serialize');
const v = require('../validators/echanges');

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* F-09 : classement des développeurs par réputation, filtrable par pays : ?pays=GN&page=1
   Utilise l'index { pays: 1, reputation: -1 }. */
router.get('/', asyncRoute(async (req, res) => {
  const q = v.classement.parse(req.query);
  const filtre = q.pays ? { pays: q.pays } : {};
  const debut = (q.page - 1) * q.limit;
  const [docs, total] = await Promise.all([
    Utilisateur.find(filtre).select(PUBLIC_FIELDS).sort({ reputation: -1, _id: 1 }).skip(debut).limit(q.limit).lean(),
    Utilisateur.countDocuments(filtre)
  ]);
  res.json({
    data: docs.map((u, i) => ({ rang: debut + i + 1, ...publicUser(u) })),
    page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit)
  });
}));

/* F-43 : classement des pays (somme de la réputation de leurs développeurs) */
router.get('/pays', asyncRoute(async (_req, res) => {
  const data = await Utilisateur.aggregate([
    { $match: { pays: { $type: 'string', $ne: '' } } },
    { $group: { _id: '$pays', nb_devs: { $sum: 1 }, reputation_totale: { $sum: '$reputation' } } },
    { $sort: { reputation_totale: -1, nb_devs: -1, _id: 1 } },
    { $limit: 60 }
  ]);
  res.json({ data: data.map((p, i) => ({ rang: i + 1, pays: p._id, nb_devs: p.nb_devs, reputation_totale: p.reputation_totale })) });
}));

module.exports = router;
