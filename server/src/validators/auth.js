const { z } = require('zod');
const c = require('./common');

const register = z.object({
  pseudo: c.pseudo,
  email: c.email,
  mot_de_passe: c.motDePasse,
  telephone: c.telephone.optional(),
  pays: c.pays.optional(),
  ville: c.ville.optional()
});

const login = z.object({
  identifiant: z.string().trim().min(3).max(120), // email ou téléphone
  mot_de_passe: z.string().min(1).max(72)
});

const cible = z.object({ email: c.email.optional(), telephone: c.telephone.optional() })
  .refine((o) => Boolean(o.email) !== Boolean(o.telephone), { message: 'Fournir soit email, soit telephone (un seul)' });

const otpSend = cible;

const otpVerify = z.object({
  email: c.email.optional(),
  telephone: c.telephone.optional(),
  code: z.string().trim().regex(/^\d{6}$/, 'Code à 6 chiffres'),
  pseudo: c.pseudo.optional() // requis seulement si le compte n'existe pas encore
}).refine((o) => Boolean(o.email) !== Boolean(o.telephone), { message: 'Fournir soit email, soit telephone (un seul)' });

module.exports = { register, login, otpSend, otpVerify };
