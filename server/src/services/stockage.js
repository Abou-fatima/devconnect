// Stockage des images envoyées : contrôle du format réel, retrait des métadonnées (JPEG),
// puis enregistrement sur le serveur (par défaut) ou chez Cloudinary (UPLOAD_DRIVER=cloudinary).
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const env = require("../config/env");
const { analyserImage, retirerMetadonneesJpeg } = require("./formatImage");
const AppError = require("../utils/AppError");

const DOSSIER = "images";
const PREFIXE_URL = "/uploads/";

const driver = () =>
  env.uploadDriver === "cloudinary" ? "cloudinary" : "local";

// Nom aléatoire : impossible à deviner, jamais le nom envoyé par l'utilisateur.
const nomFichier = (ext = "webp") =>
  `${Date.now().toString(36)}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
const urlPublique = (nom) => `${PREFIXE_URL}${DOSSIER}/${nom}`;

// URL « /uploads/... » -> chemin sur le disque, ou null si elle sort du dossier d'envoi.
function cheminLocal(url, racine = env.uploadsDir) {
  if (typeof url !== "string" || !url.startsWith(PREFIXE_URL)) return null;
  const rel = url.slice(PREFIXE_URL.length);
  if (
    !/^[\w.-]+(\/[\w.-]+)*$/.test(rel) ||
    rel.split("/").some((p) => p === ".." || p === ".")
  )
    return null;
  const base = path.resolve(racine);
  const abs = path.resolve(base, rel);
  return abs.startsWith(base + path.sep) ? abs : null;
}

// Vérifie que le fichier est une vraie image (JPEG, PNG, WebP, GIF) et retire les métadonnées d'un JPEG.
// La réduction de taille est faite par le navigateur avant l'envoi (client/src/lib/fichiers.js) : aucune bibliothèque
// de traitement d'image côté serveur, donc aucune dépendance native ni licence à déclarer.
function verifierImage(buffer) {
  const info = analyserImage(buffer);
  if (!info)
    throw new AppError(
      400,
      "Ce fichier n'est pas une image valide (JPEG, PNG, WebP ou GIF, 6000 px au maximum).",
    );
  const data = info.ext === "jpg" ? retirerMetadonneesJpeg(buffer) : buffer;
  return {
    data,
    ext: info.ext,
    mime: info.mime,
    largeur: info.largeur,
    hauteur: info.hauteur,
  };
}

function envoyerVersCloudinary(buffer) {
  const cloudinary = require("../config/cloudinary");
  if (!cloudinary.configured)
    throw new AppError(
      503,
      "Envoi d'images indisponible : variables CLOUDINARY_* absentes du .env",
    );
  return new Promise((resolve, reject) => {
    const flux = cloudinary.uploader.upload_stream(
      { folder: "devconnect", resource_type: "image" },
      (err, res) => (err ? reject(err) : resolve(res)),
    );
    flux.end(buffer);
  });
}

// Enregistre l'image et renvoie ce qu'il faut garder dans `depots`.
async function enregistrerImage(buffer) {
  const img = verifierImage(buffer);
  if (driver() === "cloudinary") {
    const r = await envoyerVersCloudinary(img.data);
    return {
      url: r.secure_url,
      stockage: "cloudinary",
      public_id: r.public_id,
      taille: img.data.length,
      largeur: img.largeur,
      hauteur: img.hauteur,
      format: img.ext,
      mime: img.mime,
    };
  }
  const dossier = path.join(env.uploadsDir, DOSSIER);
  await fs.mkdir(dossier, { recursive: true });
  const nom = nomFichier(img.ext);
  await fs.writeFile(path.join(dossier, nom), img.data, { flag: "wx" });
  return {
    url: urlPublique(nom),
    stockage: "local",
    taille: img.data.length,
    largeur: img.largeur,
    hauteur: img.hauteur,
    format: img.ext,
    mime: img.mime,
  };
}

// Supprime le fichier d'un dépôt (local ou Cloudinary). Une panne est journalisée, jamais bloquante.
async function supprimer(depot) {
  const m = (depot && depot.metadata) || {};
  const url = (depot && depot.url) || "";
  try {
    if (m.public_id && !url.startsWith(PREFIXE_URL)) {
      const cloudinary = require("../config/cloudinary");
      if (cloudinary.configured) await cloudinary.uploader.destroy(m.public_id);
      return;
    }
    const chemin = cheminLocal(url);
    if (chemin) await fs.unlink(chemin);
  } catch (e) {
    if (e.code !== "ENOENT")
      console.error("[stockage] suppression :", e.message);
  }
}

module.exports = {
  driver,
  nomFichier,
  urlPublique,
  cheminLocal,
  verifierImage,
  enregistrerImage,
  supprimer,
  PREFIXE_URL,
};
