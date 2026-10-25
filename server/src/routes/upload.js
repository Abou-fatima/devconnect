
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');

const { auth } = require('../middleware/auth');
const AppError = require('../utils/AppError');
const Projet = require('../models/Projet');
const Depot = require('../models/Depot');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const TYPES_AUTORISES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!TYPES_AUTORISES.includes(file.mimetype)) {
      return cb(
        new AppError(400, 'Format invalide. Utilisez JPEG, PNG, WebP ou GIF.')
      );
    }

    cb(null, true);
  },
});

function envoyerVersCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'devconnect/projets',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

// POST /api/upload
// Form-data : file (image), cible_id (identifiant du projet)
router.post(
  '/',
  auth,
  upload.single('file'),
  asyncRoute(async (req, res) => {
    if (!cloudinary.configured) {
      throw new AppError(503, "Envoi d'images indisponible : variables CLOUDINARY_* absentes du .env");
    }

    if (!req.file) {
      throw new AppError(400, 'Veuillez sélectionner une image.');
    }

    const { cible_id } = req.body;

    if (!cible_id || !mongoose.isValidObjectId(cible_id)) {
      throw new AppError(400, 'Identifiant du projet invalide.');
    }

    const projet = await Projet.findById(cible_id);

    if (!projet) {
      throw new AppError(404, 'Projet introuvable.');
    }

    const estPorteur =
      String(projet.porteur_id) === String(req.userId);

    const estMembre = projet.membres.some(
      (membre) => String(membre.user_id) === String(req.userId)
    );

    if (!estPorteur && !estMembre) {
      throw new AppError(
        403,
        'Seul le propriétaire ou un membre du projet peut ajouter une image.'
      );
    }

    const resultat = await envoyerVersCloudinary(req.file.buffer);

    try {
      const depot = await Depot.create({
        proprietaire_id: req.userId,
        cible_type: 'projet',
        cible_id: projet._id,
        type_fichier: 'image',
        url: resultat.secure_url,
        nom_original: req.file.originalname,
        taille_octets: req.file.size,
        mime_type: req.file.mimetype,
        metadata: {
          public_id: resultat.public_id,
          format: resultat.format,
          largeur: resultat.width,
          hauteur: resultat.height,
        },
      });

      return res.status(201).json({
        message: 'Image envoyée avec succès.',
        data: depot,
      });
    } catch (error) {
      // Évite de conserver une image orpheline sur Cloudinary.
      await cloudinary.uploader
        .destroy(resultat.public_id)
        .catch(() => {});

      throw error;
    }
  })
);

module.exports = router;
