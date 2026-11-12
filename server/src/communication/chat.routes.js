const express = require('express');
const Echange = require('../models/Echange');
const { auth } = require('../middleware/auth');
const AppError = require('../utils/AppError');
const { parseCanal } = require('./canaux');
const { verifierAcces } = require('../services/salons');
const { listerConversations, marquerLu } = require('../services/prives');
const { grouper } = require('../services/reactions');
const { reponseA } = require('../services/reponses');

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* F-18 : historique d'un canal — GET /api/chat/historique/:canal?page=1&limit=30
   Pages triées du plus récent au plus ancien ; les messages d'une page sont renvoyés dans l'ordre chronologique. */
router.get('/historique/:canal', auth, asyncRoute(async (req, res) => {
  const c = parseCanal(req.params.canal, req.userId);
  if (c.erreur) throw new AppError(c.erreur.startsWith('Accès') ? 403 : 400, c.erreur);
  const acces = await verifierAcces(c, req.userId);
  if (acces.erreur) throw new AppError(403, acces.erreur);

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));

  const docs = await Echange.find({ type: 'message', 'metadata.canal': c.canal })
    .sort({ created_at: -1 })
    .skip((page - 1) * limit)
    .limit(limit + 1) // un de plus pour savoir s'il reste des pages
    .populate('auteur_id', 'pseudo')
    .lean();

  const a_suivre = docs.length > limit;
  const page_docs = docs.slice(0, limit);
  // Messages cités (réponses) : une seule requête pour toute la page.
  const parentIds = [...new Set(page_docs.map((d) => d.parent_id).filter(Boolean).map(String))];
  const parents = {};
  if (parentIds.length) {
    const lus = await Echange.find({ _id: { $in: parentIds }, type: 'message' }).select('type metadata.canal auteur_id contenu image_url audio_url').populate('auteur_id', 'pseudo').lean();
    lus.forEach((p) => { parents[String(p._id)] = p; });
  }
  const messages = page_docs.reverse().map((d) => ({
    id: String(d._id),
    canal: c.canal,
    auteur: d.auteur_id ? { id: String(d.auteur_id._id), pseudo: d.auteur_id.pseudo } : null,
    contenu: d.contenu || null,
    audio_url: d.audio_url || null,
    image_url: d.image_url || null,
    transcription: d.transcription || null,
    reactions: grouper(d.reactions),
    reponse_a: reponseA(d, parents, c.canal),
    created_at: d.created_at
  }));

  res.json({ canal: c.canal, page, limit, a_suivre, messages });
}));

/* GET /api/chat/conversations — mes conversations privées (la plus récente d'abord), avec le nombre de messages non lus.
   Réponse : { conversations: [{ canal, autre: {id, pseudo, photo}, dernier: {de_moi, apercu: {type, texte}, created_at}, non_lus }], total_non_lus } */
router.get('/conversations', auth, asyncRoute(async (req, res) => {
  res.json(await listerConversations(req.userId));
}));

/* POST /api/chat/lu { canal } — je viens de lire cette conversation privée : compteur remis à zéro, notifications lues. */
router.post('/lu', auth, asyncRoute(async (req, res) => {
  const c = parseCanal(req.body && req.body.canal, req.userId);
  if (c.erreur) throw new AppError(c.erreur.startsWith('Accès') ? 403 : 400, c.erreur);
  if (c.cible_type !== 'user') throw new AppError(400, 'Seules les conversations privées ont un compteur de messages non lus');
  await marquerLu(req.userId, c.canal);
  res.json({ ok: true, canal: c.canal, non_lus: 0 });
}));

module.exports = router;
