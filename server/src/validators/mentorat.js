const { z } = require("zod");

const idMongo = z.string().regex(/^[a-f0-9]{24}$/i, "Identifiant invalide");

// Demande d'accompagnement : à qui, sur quel sujet, et un message de présentation.
const demander = z.object({
  mentor_id: idMongo,
  sujet: z.string().trim().min(3, "Indique le sujet en quelques mots").max(100),
  message: z
    .string()
    .trim()
    .min(10, "Explique ton besoin en quelques mots (10 caractères minimum)")
    .max(1000),
});

const mentors = z.object({
  q: z.string().trim().max(50).optional(),
  stack: z.string().trim().max(200).optional(),
  pays: z.string().trim().toUpperCase().length(2).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

module.exports = { demander, mentors };
