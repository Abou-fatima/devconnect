// Images jointes aux messages du chat. Une image ne peut venir que de notre propre envoi (POST /api/upload/chat) :
// on retrouve son dépôt, qui doit appartenir à la personne qui écrit. Fonctions testables sans base de données.
const MAX_URL = 500;

// Adresse acceptée : fichier local (/uploads/images/…) ou image hébergée chez Cloudinary (https).
function formeUrlValide(u) {
  if (typeof u !== 'string' || u.length > MAX_URL || u.includes('..')) return false;
  return /^\/uploads\/images\/[\w.-]+$/.test(u) || /^https:\/\/res\.cloudinary\.com\/[\w./-]+$/.test(u);
}

/* Renvoie l'adresse si elle est bien une image envoyée par cette personne pour le chat, sinon undefined.
   deps.Depot permet de tester sans base. */
async function imageDe(url, userId, deps = {}) {
  if (!formeUrlValide(url)) return undefined;
  const Depot = deps.Depot || require('../models/Depot');
  const depot = await Depot.findOne({ url, proprietaire_id: userId, type_fichier: 'image', cible_type: 'chat' }).select('_id').lean();
  return depot ? url : undefined;
}

module.exports = { formeUrlValide, imageDe, MAX_URL };
