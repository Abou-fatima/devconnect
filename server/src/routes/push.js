const express = require('express');
const env = require('../config/env');
const { auth } = require('../middleware/auth');
const AppError = require('../utils/AppError');
const { pushActif, abonnementValide, enregistrer, retirer } = require('../services/push');

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* GET /api/push/cle — clé publique VAPID (nécessaire au navigateur pour s'abonner). actif=false si le serveur n'a pas de clés. */
router.get('/cle', (_req, res) => res.json({ actif: pushActif(), cle: pushActif() ? env.vapid.publicKey : null }));

/* POST /api/push/abonnement — enregistre cet appareil. Corps : l'abonnement du navigateur { endpoint, keys: { p256dh, auth } } */
router.post('/abonnement', auth, asyncRoute(async (req, res) => {
  if (!pushActif()) throw new AppError(503, 'Les notifications push ne sont pas activées sur ce serveur');
  if (!abonnementValide(req.body)) throw new AppError(400, 'Abonnement invalide');
  await enregistrer(req.userId, req.body, req.headers['user-agent']);
  res.status(201).json({ ok: true });
}));

/* DELETE /api/push/abonnement — retire cet appareil (désactivation, ou déconnexion). Corps : { endpoint } */
router.delete('/abonnement', auth, asyncRoute(async (req, res) => {
  const endpoint = req.body && req.body.endpoint;
  if (typeof endpoint !== 'string') throw new AppError(400, 'endpoint requis');
  await retirer(req.userId, endpoint);
  res.json({ ok: true });
}));

module.exports = router;
