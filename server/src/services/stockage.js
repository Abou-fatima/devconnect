// Stockage des images envoyées : conversion en WebP (plus léger, utile quand la connexion est lente),
// puis enregistrement sur le serveur (par défaut) ou chez Cloudinary (UPLOAD_DRIVER=cloudinary).
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const COTE_MAX = 1600;      // une photo de téléphone (4000 px) est réduite : l'écran n'en montre pas plus
const QUALITE_WEBP = 80;
const DOSSIER = 'images';
const PREFIXE_URL = '/uploads/';

const driver = () => (env.uploadDriver === 'cloudinary' ? 'cloudinary' : 'local');

// Nom aléatoire : impossible à deviner, jamais le nom envoyé par l'utilisateur.
const nomFichier = () => `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}.webp`;
const urlPublique = (nom) => `${PREFIXE_URL}${DOSSIER}/${nom}`;

// URL « /uploads/... » -> chemin sur le disque, ou null si elle sort du dossier d'envoi.
function cheminLocal(url, racine = env.uploadsDir) {
  if (typeof url !== 'string' || !url.startsWith(PREFIXE_URL)) return null;
  const rel = url.slice(PREFIXE_URL.length);
  if (!/^[\w.-]+(\/[\w.-]+)*$/.test(rel) || rel.split('/').some((p) => p === '..' || p === '.')) return null;
  const base = path.resolve(racine);
  const abs = path.resolve(base, rel);
  return abs.startsWith(base + path.sep) ? abs : null;
}

// Convertit n'importe quelle image lisible en WebP réduit. Un fichier qui n'est pas une vraie image est refusé ici
// (le type annoncé par le navigateur peut être faux : sharp est le vrai contrôle). Les métadonnées (GPS, appareil) sont retirées.
async function versWebp(buffer) {
  let sharp;
  try { sharp = require('sharp'); } catch {
    throw new AppError(503, "Compression d'images indisponible : lance « npm install » dans le dossier server (module sharp manquant).");
  }
  try {
    const { data, info } = await sharp(buffer, { limitInputPixels: 40e6 })
      .rotate() // applique l'orientation de la photo avant de retirer les métadonnées
      .resize({ width: COTE_MAX, height: COTE_MAX, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITE_WEBP })
      .toBuffer({ resolveWithObject: true });
    return { data, largeur: info.width, hauteur: info.height };
  } catch {
    throw new AppError(400, "Ce fichier n'est pas une image lisible.");
  }
}

function envoyerVersCloudinary(buffer) {
  const cloudinary = require('../config/cloudinary');
  if (!cloudinary.configured) throw new AppError(503, "Envoi d'images indisponible : variables CLOUDINARY_* absentes du .env");
  return new Promise((resolve, reject) => {
    const flux = cloudinary.uploader.upload_stream({ folder: 'devconnect', resource_type: 'image' }, (err, res) => (err ? reject(err) : resolve(res)));
    flux.end(buffer);
  });
}

// Enregistre l'image et renvoie ce qu'il faut garder dans `depots`.
async function enregistrerImage(buffer) {
  const webp = await versWebp(buffer);
  if (driver() === 'cloudinary') {
    const r = await envoyerVersCloudinary(webp.data);
    return { url: r.secure_url, stockage: 'cloudinary', public_id: r.public_id, taille: webp.data.length, largeur: webp.largeur, hauteur: webp.hauteur, format: 'webp' };
  }
  const dossier = path.join(env.uploadsDir, DOSSIER);
  await fs.mkdir(dossier, { recursive: true });
  const nom = nomFichier();
  await fs.writeFile(path.join(dossier, nom), webp.data, { flag: 'wx' });
  return { url: urlPublique(nom), stockage: 'local', taille: webp.data.length, largeur: webp.largeur, hauteur: webp.hauteur, format: 'webp' };
}

// Supprime le fichier d'un dépôt (local ou Cloudinary). Une panne est journalisée, jamais bloquante.
async function supprimer(depot) {
  const m = (depot && depot.metadata) || {};
  const url = (depot && depot.url) || '';
  try {
    if (m.public_id && !url.startsWith(PREFIXE_URL)) {
      const cloudinary = require('../config/cloudinary');
      if (cloudinary.configured) await cloudinary.uploader.destroy(m.public_id);
      return;
    }
    const chemin = cheminLocal(url);
    if (chemin) await fs.unlink(chemin);
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('[stockage] suppression :', e.message);
  }
}

module.exports = { driver, nomFichier, urlPublique, cheminLocal, versWebp, enregistrerImage, supprimer, COTE_MAX, PREFIXE_URL };
