const { ZodError } = require('zod');
const AppError = require('../utils/AppError');
const env = require('../config/env');

const notFound = (_req, _res, next) => next(new AppError(404, 'Route introuvable'));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      erreur: 'Données invalides',
      details: err.issues.map((i) => ({ champ: i.path.join('.'), message: i.message }))
    });
  }
  if (err && err.name === 'MulterError') {
    const trop = err.code === 'LIMIT_FILE_SIZE';
    return res.status(trop ? 413 : 400).json({ erreur: trop ? 'Fichier trop volumineux (5 Mo maximum)' : 'Envoi de fichier invalide' });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ erreur: err.message, details: err.details });
  }
  if (err && err.code === 11000) {
    const champ = Object.keys(err.keyPattern || {})[0] || 'champ';
    return res.status(409).json({ erreur: `Valeur déjà utilisée : ${champ}` });
  }
  if (err && err.name === 'CastError') {
    return res.status(400).json({ erreur: 'Identifiant invalide' });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ erreur: 'JSON invalide' });
  }
  console.error(err);
  res.status(500).json({ erreur: 'Erreur interne du serveur', ...(env.isProd ? {} : { debug: String(err && err.message) }) });
};

module.exports = { notFound, errorHandler };
