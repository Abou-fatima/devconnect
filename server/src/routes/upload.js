const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');

const { auth } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimit');
const AppError = require('../utils/AppError');
const Projet = require('../models/Projet');
const Depot = require('../models/Depot');
const Utilisateur = require('../models/Utilisateur');
const stockage = require('../services/stockage');

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Le type annoncé par le navigateur peut être faux : le vrai contrôle est la conversion (services/stockage.js).
const TYPES_AUTORISES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const CIBLES = ['projet', 'user'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!TYPES_AUTORISES.includes(file.mimetype)) return cb(new AppError(400, 'Format invalide. Utilisez JPEG, PNG, WebP ou GIF.'));
    cb(null, true);
  }
});

/* POST /api/upload — form-data : file (image), cible_type ('projet' par défaut, ou 'user' pour sa photo de profil), cible_id (projet).
   L'image est réduite (1600 px) et convertie en WebP, puis enregistrée dans `depots`. */
router.post('/', auth, uploadLimiter, upload.single('file'), asyncRoute(async (req, res) => {
  if (!req.file) throw new AppError(400, 'Veuillez sélectionner une image.');

  const cibleType = req.body.cible_type || 'projet';
  if (!CIBLES.includes(cibleType)) throw new AppError(400, 'cible_type invalide (projet ou user).');

  let cibleId;
  if (cibleType === 'user') {
    cibleId = req.userId;
  } else {
    cibleId = req.body.cible_id;
    if (!cibleId || !mongoose.isValidObjectId(cibleId)) throw new AppError(400, 'Identifiant du projet invalide.');
    const projet = await Projet.findById(cibleId);
    if (!projet) throw new AppError(404, 'Projet introuvable.');
    const estPorteur = String(projet.porteur_id) === String(req.userId);
    const estMembre = projet.membres.some((m) => String(m.user_id) === String(req.userId));
    if (!estPorteur && !estMembre) throw new AppError(403, 'Seul le propriétaire ou un membre du projet peut ajouter une image.');
  }

  const f = await stockage.enregistrerImage(req.file.buffer);
  let depot;
  try {
    depot = await Depot.create({
      proprietaire_id: req.userId, cible_type: cibleType, cible_id: cibleId, type_fichier: 'image',
      url: f.url, nom_original: req.file.originalname, taille_octets: f.taille, mime_type: 'image/webp',
      metadata: { stockage: f.stockage, public_id: f.public_id, format: f.format, largeur: f.largeur, hauteur: f.hauteur, taille_origine: req.file.size }
    });
  } catch (e) {
    await stockage.supprimer({ url: f.url, metadata: { public_id: f.public_id } }); // pas de fichier orphelin
    throw e;
  }

  // Photo de profil : le profil pointe tout de suite vers la nouvelle image (jamais vers un fichier supprimé),
  // puis l'ancienne photo est effacée : une seule à la fois.
  if (cibleType === 'user') {
    await Utilisateur.updateOne({ _id: req.userId }, { $set: { 'profil.photo': f.url } });
    const anciens = await Depot.find({ cible_type: 'user', cible_id: cibleId, _id: { $ne: depot._id } }).lean();
    await Promise.all(anciens.map((d) => stockage.supprimer(d)));
    if (anciens.length) await Depot.deleteMany({ _id: { $in: anciens.map((d) => d._id) } });
  }

  res.status(201).json({ message: 'Image envoyée avec succès.', data: depot, ...(cibleType === 'user' && { photo: f.url }) });
}));

module.exports = router;
