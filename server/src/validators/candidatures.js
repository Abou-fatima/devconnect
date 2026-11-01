const { z } = require('zod');

const role = z.string().trim().min(1).max(100);

// Candidature : un message de présentation (obligatoire) et le rôle visé (facultatif).
const candidater = z.object({
  message: z.string().trim().min(10, 'Présente-toi en quelques mots (10 caractères minimum)').max(1000),
  role: role.optional()
});

// Décision du porteur : il peut préciser le rôle donné au nouveau membre.
const decision = z.object({ role: role.optional() });

const changerRole = z.object({ role });

module.exports = { candidater, decision, changerRole };
