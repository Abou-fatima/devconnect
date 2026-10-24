const express = require('express');
const mongoose = require('mongoose');
const Echange = require('../../models/Echange');
const { auth } = require('../../middleware/auth');
const AppError = require('../../utils/AppError');
const { serialiser } = require('./notifier');

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Notifications d'un utilisateur : type "notification" dont il est la cible (cible_type "user").
const base = (userId) => ({ type: 'notification', cible_type: 'user', cible_id: userId });
const nonLue = { 'metadata.lue': { $ne: true } };

/* F-20 : GET /api/notifications?page=1&limit=20&non_lues=true
   Plus récentes d'abord. `non_lues` = nombre total de notifications non lues (pastille de l'interface). */
router.get('/', auth, asyncRoute(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const filtre = req.query.non_lues === 'true' ? { ...base(req.userId), ...nonLue } : base(req.userId);

  const [docs, non_lues] = await Promise.all([
    Echange.find(filtre).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit + 1).populate('auteur_id', 'pseudo').lean(),
    Echange.countDocuments({ ...base(req.userId), ...nonLue })
  ]);

  res.json({
    page, limit, a_suivre: docs.length > limit, non_lues,
    notifications: docs.slice(0, limit).map((d) => serialiser(d, d.auteur_id))
  });
}));

/* F-20 : PUT /api/notifications/:id/lue : marque une notification comme lue (seulement la sienne). */
router.put('/:id/lue', auth, asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(400, 'Identifiant invalide');
  const r = await Echange.updateOne({ _id: req.params.id, ...base(req.userId) }, { $set: { 'metadata.lue': true } });
  if (!r.matchedCount) throw new AppError(404, 'Notification introuvable');
  res.json({ ok: true, id: req.params.id });
}));

module.exports = router;
