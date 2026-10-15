const express = require('express');
const Echange = require('../models/Echange');
const { auth } = require('../middleware/auth');
const AppError = require('../utils/AppError');
const { parseCanal } = require('./canaux');

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* F-18 : historique d'un canal — GET /api/chat/historique/:canal?page=1&limit=30
   Pages triées du plus récent au plus ancien ; les messages d'une page sont renvoyés dans l'ordre chronologique. */
router.get('/historique/:canal', auth, asyncRoute(async (req, res) => {
  const c = parseCanal(req.params.canal, req.userId);
  if (c.erreur) throw new AppError(c.erreur.startsWith('Accès') ? 403 : 400, c.erreur);

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));

  const docs = await Echange.find({ type: 'message', 'metadata.canal': c.canal })
    .sort({ created_at: -1 })
    .skip((page - 1) * limit)
    .limit(limit + 1) // un de plus pour savoir s'il reste des pages
    .populate('auteur_id', 'pseudo')
    .lean();

  const a_suivre = docs.length > limit;
  const messages = docs.slice(0, limit).reverse().map((d) => ({
    id: String(d._id),
    canal: c.canal,
    auteur: d.auteur_id ? { id: String(d.auteur_id._id), pseudo: d.auteur_id.pseudo } : null,
    contenu: d.contenu || null,
    audio_url: d.audio_url || null,
    transcription: d.transcription || null,
    created_at: d.created_at
  }));

  res.json({ canal: c.canal, page, limit, a_suivre, messages });
}));

module.exports = router;
