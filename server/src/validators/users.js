const { z } = require('zod');
const c = require('./common');
const { NIVEAUX, OBJECTIFS } = require('../utils/constants');

// Une chaîne vide efface le champ.
const optionalUrl = c.urlHttp(300).or(z.literal(''));

const updateProfile = z.object({
  pseudo: c.pseudo.optional(),
  pays: c.pays.optional(),
  ville: c.ville.optional().or(z.literal('')),
  stacks: c.tags(20).optional(),
  objectifs: z.array(z.enum(OBJECTIFS)).max(OBJECTIFS.length).transform((a) => [...new Set(a)]).optional(),
  profil: z.object({
    bio: z.string().trim().max(500).optional(),
    photo: optionalUrl.optional(),
    niveau: z.enum(NIVEAUX).optional(),
    liens: z.object({
      github: optionalUrl.optional(),
      linkedin: optionalUrl.optional(),
      site: optionalUrl.optional(),
      whatsapp: c.telephone.or(z.literal('')).optional()
    }).optional()
  }).optional()
});

const changePassword = z.object({
  ancien_mot_de_passe: z.string().max(72).optional(),
  nouveau_mot_de_passe: c.motDePasse
});

const csv = (s) => (s ? String(s).split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 10) : undefined);

const search = z.object({
  q: z.string().trim().max(50).optional(),
  stack: z.string().optional().transform(csv),
  pays: z.string().trim().toUpperCase().length(2).optional(),
  niveau: z.enum(NIVEAUX).optional(),
  objectif: z.enum(OBJECTIFS).optional(),
  tri: z.enum(['reputation', 'recent', 'pseudo']).default('reputation'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

module.exports = { updateProfile, changePassword, search };
