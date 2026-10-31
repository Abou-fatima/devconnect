// Fichiers envoyés (photos). Le serveur renvoie des adresses relatives (/uploads/images/x.webp) :
// en production sur un autre domaine, on les préfixe par l'adresse de l'API (VITE_API_URL).
const API = import.meta.env.VITE_API_URL || '';

export const urlFichier = (url) => (typeof url === 'string' && url.startsWith('/uploads/') ? `${API}${url}` : url || '');

const TAILLE_MAX = 5 * 1024 * 1024; // limite du serveur

/* Réduit une photo avant l'envoi : un téléphone produit 3 à 8 Mo, ce qui est long et cher sur une connexion lente
   (et dépasse la limite de 5 Mo). Le serveur la convertit ensuite en WebP. Si la réduction échoue (format que le
   navigateur ne sait pas lire), on envoie l'original s'il passe, sinon on renvoie une erreur claire. */
export async function preparerImage(fichier, cote = 1280, qualite = 0.85) {
  if (!fichier.type.startsWith('image/')) throw new Error('type');
  try {
    const bitmap = await createImageBitmap(fichier, { imageOrientation: 'from-image' });
    const ratio = Math.min(1, cote / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', qualite));
    if (blob) return blob;
  } catch { /* on tente l'original */ }
  if (fichier.size > TAILLE_MAX) throw new Error('taille');
  return fichier;
}
