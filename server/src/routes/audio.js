const express = require('express');
const multer = require('multer');

const { auth } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimit');
const AppError = require('../utils/AppError');
const Depot = require('../models/Depot');
const audio = require('../services/audio');
const stockage = require('../services/stockage');

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: audio.MAX_OCTETS, files: 1 } });
const surUpload = (req, res, next) => upload.single('file')(req, res, (e) => {
  if (e && e.code === 'LIMIT_FILE_SIZE') return next(new AppError(413, 'Note vocale trop longue (10 Mo maximum, environ 2 minutes).'));
  next(e);
});

/* GET /api/audio/statut : la transcription est-elle active sur ce serveur ? (le client adapte son affichage) */
router.get('/statut', (_req, res) => res.json({ transcription: audio.transcriptionActive(), max_octets: audio.MAX_OCTETS }));

/* POST /api/audio — form-data : file (note vocale), langue ('fr' | 'en', facultatif), transcrire ('false' pour désactiver).
   Enregistre l'audio et renvoie son adresse (à mettre dans audio_url d'un message, d'une question ou d'une réponse)
   avec la transcription Whisper si elle est active. */
router.post('/', auth, uploadLimiter, surUpload, asyncRoute(async (req, res) => {
  if (!req.file) throw new AppError(400, 'Aucun enregistrement reçu.');
  const format = audio.detecterFormat(req.file.buffer);
  if (!format) throw new AppError(400, 'Format audio non reconnu (webm, ogg, mp4/m4a, mp3 ou wav).');

  const langue = audio.LANGUES.includes(req.body.langue) ? req.body.langue : undefined;
  const veutTranscrire = String(req.body.transcrire) !== 'false';
  const transcription = veutTranscrire ? await audio.transcrire(req.file.buffer, { ...format, langue }) : null;

  const f = await audio.enregistrerAudio(req.file.buffer, format.ext);
  let depot;
  try {
    depot = await Depot.create({
      proprietaire_id: req.userId, type_fichier: 'audio', url: f.url, nom_original: req.file.originalname,
      taille_octets: f.taille, mime_type: format.mime, metadata: { stockage: 'local', ...(transcription ? { transcription } : {}) }
    });
  } catch (e) {
    await stockage.supprimer({ url: f.url, metadata: {} }); // pas de fichier orphelin
    throw e;
  }
  res.status(201).json({ audio_url: f.url, transcription, transcription_active: audio.transcriptionActive(), mime_type: format.mime, taille: f.taille });
}));

module.exports = router;
