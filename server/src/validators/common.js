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

// Les liens affichés dans les pages doivent être http(s) : 'javascript:...' est une URL valide pour zod mais dangereuse.
const urlHttp = (max = 300) => z.string().trim().max(max).url('URL invalide')
  .refine((u) => /^https?:\/\//i.test(u), 'L\'adresse doit commencer par http:// ou https://');

// Une adresse http(s) OU un fichier envoyé chez nous (/uploads/images/xxx.webp). Jamais de '..' ni de 'javascript:'.
const FICHIER_RE = /^\/uploads\/[\w.-]+(\/[\w.-]+)*$/;
const urlHttpOuFichier = (max = 300) => z.string().trim().max(max).refine((u) => {
  if (FICHIER_RE.test(u)) return !u.split('/').some((p) => p === '..' || p === '.');
  return /^https?:\/\//i.test(u) && z.string().url().safeParse(u).success;
}, 'Adresse invalide : http(s):// ou un fichier envoyé (/uploads/...)');

module.exports = { urlHttpOuFichier, urlHttp, pseudo, email, telephone, motDePasse, pays, ville, tags };
