
const express = require('express');
const mongoose = require('mongoose');
const { z } = require('zod');

const Projet = require('../models/Projet');
const Echange = require('../models/Echange');
const Depot = require('../models/Depot');
const AppError = require('../utils/AppError');
const cloudinary = require('../config/cloudinary');
const { auth } = require('../middleware/auth');
const { ecritureLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const STATUTS = ['idee', 'en_cours', 'termine'];

// Seules les adresses http(s) sont acceptées : un lien 'javascript:' serait dangereux une fois affiché.
const urlHttp = z.string().trim().max(2048).url()
  .refine((u) => /^https?:\/\//i.test(u), 'L\'adresse doit commencer par http:// ou https://');

const lienSchema = z.object({
  github: urlHttp.optional(),
  demo: urlHttp.optional(),
  video: urlHttp.optional(),
});

// Auteur affiché avec un projet (jamais d'email ni de téléphone)
const PORTEUR = 'pseudo profil.photo reputation pays';

const projetSchema = z.object({
  titre: z.string().trim().min(3).max(150),
  description: z.string().trim().max(5000).optional(),
  stack: z.array(z.string().trim().min(1).max(50)).max(20)
    .transform((a) => [...new Set(a.map((x) => x.toLowerCase()))]).optional(),
  roles_recherches: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  liens: lienSchema.optional(),
  statut: z.enum(STATUTS).optional(),
  categorie: z.string().trim().max(100).optional(),

});

const commentaireSchema = z.object({
  contenu: z.string().trim().min(1).max(5000),
});


const verifierId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(404, 'Projet introuvable');
  }
};

async function trouverProjet(id) {
  verifierId(id);

  const projet = await Projet.findById(id);

  if (!projet) {
    throw new AppError(404, 'Projet introuvable');
  }

  return projet;
}

function verifierProprietaire(projet, userId) {
  if (String(projet.porteur_id) !== String(userId)) {
    throw new AppError(403, 'Action réservée au propriétaire du projet');
  }
}

// GET /api/projets
// Liste publique avec filtres et pagination.

router.get('/', asyncRoute(async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50
  ) {
    throw new AppError(400, 'Paramètres de pagination invalides');
  }

  const filter = {};

  // Filtrer par statut.
  if (req.query.statut !== undefined) {
    if (!STATUTS.includes(req.query.statut)) {
      throw new AppError(400, 'Statut invalide');
    }

    filter.statut = req.query.statut;
  }

  // Filtrer par technologie.
  if (req.query.stack) {
    const stacks = String(req.query.stack)
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    if (stacks.length) {
      filter.stack = { $in: stacks };
    }
  }

  // Projets d'un développeur : ?porteur=<id>
  if (req.query.porteur !== undefined) {
    if (!mongoose.isValidObjectId(req.query.porteur)) throw new AppError(400, 'Identifiant du porteur invalide');
    filter.porteur_id = req.query.porteur;
  }

  // Projets qui cherchent un rôle : ?role=frontend
  if (req.query.role !== undefined) {
    const role = String(req.query.role).trim();
    if (!role || role.length > 100) throw new AppError(400, 'Rôle invalide');
    filter.roles_recherches = new RegExp(role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }

  // Rechercher dans le titre, la description et la catégorie.
  if (req.query.q !== undefined) {
    const recherche = String(req.query.q).trim();

    if (!recherche || recherche.length > 100) {
      throw new AppError(
        400,
        'La recherche doit contenir entre 1 et 100 caractères.'
      );
    }

    // Échapper les caractères spéciaux de l'expression régulière.
    const rechercheEchappee = recherche.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    const regex = new RegExp(rechercheEchappee, 'i');

    filter.$or = [
      { titre: regex },
      { description: regex },
      { categorie: regex },
    ];
  }

  // Récupérer les projets et le nombre total correspondant aux filtres.
  const [data, total] = await Promise.all([
    Projet.find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('porteur_id', PORTEUR)
      .lean(),

    Projet.countDocuments(filter),
  ]);

  res.json({
    data,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
}));


// POST /api/projets
// Créer un projet pour l'utilisateur connecté.
router.post('/', auth, ecritureLimiter, asyncRoute(async (req, res) => {
  const body = projetSchema.parse(req.body);

  const projet = await Projet.create({
    ...body,
    porteur_id: req.userId,
  });

  res.status(201).json({ projet });
}));

// GET /api/projets/tendances (avant /:id !)
router.get('/tendances', asyncRoute(async (req, res) => {
  const limit = Number(req.query.limit ?? 10);

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50
  ) {
    throw new AppError(
      400,
      'La limite doit être un entier entre 1 et 50.'
    );
  }

  const maintenant = new Date();

  const projets = await Projet.aggregate([
    {
      $addFields: {
        tendance_score: {
          $add: [
            // 3 points par like.
            {
              $multiply: [
                { $ifNull: ['$nb_likes', 0] },
                3,
              ],
            },

            // 0,2 point par vue.
            {
              $multiply: [
                { $ifNull: ['$nb_vues', 0] },
                0.2,
              ],
            },

            // Bonus de récence : 20 points au départ,
            // diminués de moitié tous les 7 jours.
            {
              $multiply: [
                20,
                {
                  $pow: [
                    2,
                    {
                      $multiply: [
                        {
                          $divide: [
                            {
                              $subtract: [
                                maintenant,
                                {
                                  $ifNull: [
                                    '$created_at',
                                    maintenant,
                                  ],
                                },
                              ],
                            },
                            86400000,
                          ],
                        },
                        -1 / 7,
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $sort: {
        tendance_score: -1,
        created_at: -1,
      },
    },
    { $limit: limit },
  ]);

  res.json({
    data: projets,
    limit,
    criteres:
      '3 points par like, 0,2 point par vue et bonus de récence diminuant de moitié tous les 7 jours.',
  });
}));

// GET /api/projets/:id
// Consulter un projet et incrémenter son nombre de vues.
router.get('/:id', asyncRoute(async (req, res) => {
  verifierId(req.params.id);

  const projet = await Projet.findByIdAndUpdate(
    req.params.id,
    { $inc: { nb_vues: 1 } },
    { new: true }
  ).populate('porteur_id', PORTEUR).populate('membres.user_id', 'pseudo profil.photo').lean();

  if (!projet) {
    throw new AppError(404, 'Projet introuvable');
  }

  res.json({ projet });
}));

// PUT /api/projets/:id
// Seul le propriétaire peut modifier son projet.
router.put('/:id', auth, asyncRoute(async (req, res) => {
  const projet = await trouverProjet(req.params.id);
  verifierProprietaire(projet, req.userId);

  const body = projetSchema.partial().parse(req.body);

  if (Object.keys(body).length === 0) {
    throw new AppError(400, 'Aucune modification fournie');
  }

  projet.set(body);
  await projet.save();

  res.json({ projet });
}));

// DELETE /api/projets/:id
// Seul le propriétaire peut supprimer son projet.
router.delete('/:id', auth, asyncRoute(async (req, res) => {
  const projet = await trouverProjet(req.params.id);
  verifierProprietaire(projet, req.userId);

  // Supprime aussi ce qui dépend du projet : commentaires, likes et images (y compris sur Cloudinary).
  const depots = await Depot.find({ cible_type: 'projet', cible_id: projet._id }).lean();
  if (cloudinary.configured) {
    await Promise.all(depots.filter((d) => d.metadata && d.metadata.public_id)
      .map((d) => cloudinary.uploader.destroy(d.metadata.public_id).catch(() => {})));
  }
  await Depot.deleteMany({ cible_type: 'projet', cible_id: projet._id });
  await Echange.deleteMany({ cible_type: 'projet', cible_id: projet._id });
  await projet.deleteOne();

  res.json({ message: 'Projet supprimé avec succès' });
}));


/**
 * GET /api/projets/:id/commentaires
 * Lister les commentaires d'un projet.
 */
router.get(
  '/:id/commentaires',
  asyncRoute(async (req, res) => {
    const projet = await trouverProjet(req.params.id);

    const commentaires = await Echange.find({
      type: 'commentaire',
      cible_type: 'projet',
      cible_id: projet._id,
    })
      .sort({ created_at: -1 })
      .populate('auteur_id', 'pseudo')
      .lean();

    res.json({ commentaires });
  })
);

/**
 * POST /api/projets/:id/commentaires
 * Ajouter un commentaire à un projet.
 */
router.post(
  '/:id/commentaires',
  auth,
  ecritureLimiter,
  asyncRoute(async (req, res) => {
    const projet = await trouverProjet(req.params.id);
    const body = commentaireSchema.parse(req.body);

    const commentaire = await Echange.create({
      type: 'commentaire',
      auteur_id: req.userId,
      cible_type: 'projet',
      cible_id: projet._id,
      contenu: body.contenu,
    });

    const resultat = await Echange.findById(commentaire._id)
      .populate('auteur_id', 'pseudo')
      .lean();

    res.status(201).json({
      message: 'Commentaire ajouté avec succès.',
      commentaire: resultat,
    });
  })
);


// POST /api/projets/:id/like
// Un utilisateur ne peut aimer un projet qu'une seule fois.
router.post('/:id/like', auth, ecritureLimiter, asyncRoute(async (req, res) => {
  const projet = await trouverProjet(req.params.id);

  const filtre = {
    type: 'vote',
    auteur_id: req.userId,
    cible_type: 'projet',
    cible_id: projet._id,
  };

  const dejaAime = await Echange.exists(filtre);

  if (dejaAime) {
    return res.json({
      message: 'Projet déjà aimé',
      nb_likes: projet.nb_likes,
    });
  }

  try {
    await Echange.create({
      ...filtre,
      metadata: { valeur: 1 },
    });
  } catch (error) {
    // L'index unique empêche deux likes simultanés du même utilisateur.
    if (error.code === 11000) {
      const actuel = await Projet.findById(projet._id).lean();

      return res.json({
        message: 'Projet déjà aimé',
        nb_likes: actuel?.nb_likes ?? projet.nb_likes,
      });
    }

    throw error;
  }

  const resultat = await Projet.findByIdAndUpdate(
    projet._id,
    { $inc: { nb_likes: 1 } },
    { new: true }
  ).lean();

  res.json({
    message: 'Projet aimé avec succès',
    nb_likes: resultat.nb_likes,
  });
}));

// DELETE /api/projets/:id/like
// Retirer son like.
router.delete('/:id/like', auth, asyncRoute(async (req, res) => {
  const projet = await trouverProjet(req.params.id);

  const supprime = await Echange.deleteOne({
    type: 'vote',
    auteur_id: req.userId,
    cible_type: 'projet',
    cible_id: projet._id,
  });

  if (!supprime.deletedCount) {
    return res.json({ message: 'Aucun like à retirer', nb_likes: projet.nb_likes });
  }

  const resultat = await Projet.findByIdAndUpdate(
    projet._id,
    { $inc: { nb_likes: -1 } },
    { new: true }
  ).lean();

  res.json({ message: 'Like retiré', nb_likes: Math.max(0, resultat.nb_likes) });
}));

module.exports = router;
