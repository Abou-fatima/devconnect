const { z } = require("zod");
const svc = require("../services/defis");

const test = z.object({
  entree: z.array(z.any()).max(5),
  attendu: z.any().refine((v) => v !== undefined, "Résultat attendu manquant"),
  visible: z.boolean(),
});

const creer = z
  .object({
    titre: z.string().trim().min(3, "Titre trop court").max(100),
    enonce: z.string().trim().min(10, "Énoncé trop court (10 caractères minimum)").max(3000),
    nom_fonction: z.string().trim().regex(svc.NOM_FONCTION, "Nom de fonction invalide (lettres, chiffres, _ ; 40 caractères au maximum)"),
    code_depart: z.string().max(2000).optional(),
    tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(5).default([]),
    jours: z.number().int().min(1).max(30).default(7),
    debut: z.string().datetime().optional(),
    tests: z.array(test),
  })
  .superRefine((o, ctx) => {
    const e = svc.erreurTests(o.tests);
    if (e) ctx.addIssue({ code: "custom", path: ["tests"], message: e });
  });

const soumettre = z.object({
  code: z.string().max(svc.CODE_MAX),
  tests_reussis: z.number().int().min(0).max(svc.TESTS_MAX),
  total: z.number().int().min(1).max(svc.TESTS_MAX),
  essais: z.number().int().min(1).max(1000).default(1),
  paste_bloques: z.number().int().min(0).max(100000).default(0),
});

module.exports = { creer, soumettre };
