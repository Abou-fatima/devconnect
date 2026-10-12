const { z } = require('zod');

const pseudo = z.string().trim().min(3, 'Minimum 3 caractères').max(30, 'Maximum 30 caractères')
  .regex(/^[\p{L}0-9_.-]+$/u, 'Lettres, chiffres, _ . - uniquement');

const email = z.string().trim().toLowerCase().email('Email invalide').max(120);

// Format international obligatoire, ex : +224620000000
const telephone = z.string().trim().regex(/^\+\d{8,15}$/, 'Format international requis, ex : +224620000000');

// bcrypt ne lit que les 72 premiers octets
const motDePasse = z.string().min(8, 'Minimum 8 caractères').max(72, 'Maximum 72 caractères')
  .regex(/[A-Za-z]/, 'Doit contenir une lettre').regex(/\d/, 'Doit contenir un chiffre');

const pays = z.string().trim().toUpperCase().length(2, 'Code pays ISO à 2 lettres (ex : GN)');
const ville = z.string().trim().min(1).max(60);

const tags = (max) => z.array(z.string().trim().toLowerCase().min(1).max(30)).max(max)
  .transform((a) => [...new Set(a)]);

module.exports = { pseudo, email, telephone, motDePasse, pays, ville, tags };
