const { z } = require("zod");
const { STATUTS } = require("../services/taches");

const idMongo = z.string().regex(/^[a-f\d]{24}$/i, "Identifiant invalide");
const titre = z
  .string()
  .trim()
  .min(2, "Titre trop court (2 caractères minimum)")
  .max(120);

const creer = z.object({
  titre,
  assigne_a: idMongo.nullable().optional(),
  statut: z.enum(STATUTS).optional(),
});

// Modification partielle : au moins un champ.
const modifier = z
  .object({
    titre: titre.optional(),
    statut: z.enum(STATUTS).optional(),
    assigne_a: idMongo.nullable().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: "Rien à modifier" });

module.exports = { creer, modifier };
