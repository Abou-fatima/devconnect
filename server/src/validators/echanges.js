const { z } = require('zod');
const c = require('./common');
const { ROLES } = require('../utils/constants');

// Un audio ne peut venir que de notre propre upload (module de Dev 3 : /api/audio)
const audioUrl = z.string().trim().max(300)
  .regex(/^\/uploads\/[\w./-]+$/, 'audio_url invalide').refine((u) => !u.includes('..'), 'audio_url invalide');

const creerPost = z.object({
  titre: z.string().trim().min(5, 'Minimum 5 caractères').max(150, 'Maximum 150 caractères'),
  contenu: z.string().trim().min(10, 'Minimum 10 caractères').max(10000),
  tags: c.tags(5).default([]),
  audio_url: audioUrl.optional()
});

const modifierPost = z.object({
  titre: creerPost.shape.titre.optional(),
  contenu: creerPost.shape.contenu.optional(),
  tags: c.tags(5).optional()
}).refine((o) => Object.keys(o).length > 0, { message: 'Aucune modification fournie' });

const creerReponse = z.object({
  contenu: z.string().trim().min(2, 'Minimum 2 caractères').max(10000),
  audio_url: audioUrl.optional()
});

const commentaire = z.object({ contenu: z.string().trim().min(1, 'Commentaire vide').max(1000, 'Maximum 1000 caractères') });
const modifierContenu = z.object({ contenu: z.string().trim().min(1).max(10000) });

const vote = z.object({ valeur: z.union([z.literal(1), z.literal(-1)], { errorMap: () => ({ message: 'valeur doit être 1 ou -1' }) }) });
const signalement = z.object({ motif: z.string().trim().min(3, 'Motif trop court').max(300) });

const page = z.coerce.number().int().min(1).default(1);
const limite = (def, max) => z.coerce.number().int().min(1).max(max).default(def);

const listePosts = z.object({
  q: z.string().trim().max(80).optional(),
  tag: z.string().trim().toLowerCase().max(30).optional(),
  statut: z.enum(['ouvert', 'resolu']).optional(),
  auteur: z.string().regex(/^[a-f\d]{24}$/i, 'Identifiant invalide').optional(),
  tri: z.enum(['recent', 'votes', 'sans_reponse', 'actifs']).default('recent'),
  page,
  limit: limite(20, 50)
});

const tags = z.object({ q: z.string().trim().toLowerCase().max(30).optional(), limit: limite(30, 100) });
const classement = z.object({ pays: z.string().trim().toUpperCase().length(2).optional(), page, limit: limite(20, 50) });
const pagination = z.object({ page, limit: limite(20, 50) });
const role = z.object({ role: z.enum(ROLES) });

module.exports = { creerPost, modifierPost, creerReponse, commentaire, modifierContenu, vote, signalement, listePosts, tags, classement, pagination, role };
