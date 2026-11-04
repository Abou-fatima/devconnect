const { z } = require("zod");

const nom = z
  .string()
  .trim()
  .min(3, "Minimum 3 caractères")
  .max(50, "Maximum 50 caractères");
const description = z.string().trim().max(200, "Maximum 200 caractères");
const visibilite = z.enum(["public", "invitation"]);

const creer = z.object({
  nom,
  description: description.optional(),
  visibilite: visibilite.default("public"),
});

const modifier = z
  .object({
    nom: nom.optional(),
    description: description.optional(),
    visibilite: visibilite.optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: "Rien à modifier" });

const liste = z.object({
  q: z.string().trim().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(12),
});

const code = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{8,40}$/, "Lien d'invitation invalide");

module.exports = { creer, modifier, liste, code };
