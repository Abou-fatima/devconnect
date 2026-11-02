// Contrôle des images envoyées, SANS bibliothèque de traitement d'image (aucune dépendance native, aucune licence à risque).
// Le navigateur a déjà réduit et ré-encodé la photo (client/src/lib/fichiers.js) ; le serveur vérifie ici que le fichier
// est une vraie image JPEG, PNG, WebP ou GIF, lit ses dimensions, et retire les métadonnées d'un JPEG (position GPS, appareil).
// Fonctions pures : testables sans fichier ni réseau.

const COTE_MAX = 6000; // au-delà, ce n'est pas une photo préparée par l'application
const PIXELS_MAX = 40e6; // même garde-fou que l'ancienne conversion : protège la mémoire des navigateurs

const u16 = (b, o) => b.readUInt16BE(o);

function dimensionsJpeg(b) {
  let o = 2;
  while (o + 9 < b.length) {
    if (b[o] !== 0xff) {
      o += 1;
      continue;
    }
    const m = b[o + 1];
    if (m === 0xff) {
      o += 1;
      continue;
    }
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) {
      o += 2;
      continue;
    }
    const len = u16(b, o + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m))
      return { hauteur: u16(b, o + 5), largeur: u16(b, o + 7) };
    o += 2 + len;
  }
  return null;
}

function dimensionsPng(b) {
  if (b.length < 24 || b.toString("latin1", 12, 16) !== "IHDR") return null;
  return { largeur: b.readUInt32BE(16), hauteur: b.readUInt32BE(20) };
}

function dimensionsGif(b) {
  if (b.length < 10) return null;
  return { largeur: b.readUInt16LE(6), hauteur: b.readUInt16LE(8) };
}

function dimensionsWebp(b) {
  if (b.length < 30) return null;
  const type = b.toString("latin1", 12, 16);
  if (type === "VP8 ")
    return {
      largeur: b.readUInt16LE(26) & 0x3fff,
      hauteur: b.readUInt16LE(28) & 0x3fff,
    };
  if (type === "VP8L") {
    const v = b.readUInt32LE(21);
    return { largeur: (v & 0x3fff) + 1, hauteur: ((v >> 14) & 0x3fff) + 1 };
  }
  if (type === "VP8X")
    return {
      largeur: (b[24] | (b[25] << 8) | (b[26] << 16)) + 1,
      hauteur: (b[27] | (b[28] << 8) | (b[29] << 16)) + 1,
    };
  return null;
}

/* Reconnaît le vrai format d'après les premiers octets (le type annoncé par le navigateur peut être faux).
   Renvoie { ext, mime, largeur, hauteur } ou null si ce n'est pas une image acceptée. SVG volontairement refusé (peut contenir des scripts). */
function analyserImage(b) {
  if (!Buffer.isBuffer(b) || b.length < 24) return null;
  let f = null;
  let d = null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    f = { ext: "jpg", mime: "image/jpeg" };
    d = dimensionsJpeg(b);
  } else if (
    b
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    f = { ext: "png", mime: "image/png" };
    d = dimensionsPng(b);
  } else if (
    b.toString("latin1", 0, 4) === "RIFF" &&
    b.toString("latin1", 8, 12) === "WEBP"
  ) {
    f = { ext: "webp", mime: "image/webp" };
    d = dimensionsWebp(b);
  } else if (["GIF87a", "GIF89a"].includes(b.toString("latin1", 0, 6))) {
    f = { ext: "gif", mime: "image/gif" };
    d = dimensionsGif(b);
  }
  if (!f || !d || !d.largeur || !d.hauteur) return null;
  if (
    d.largeur > COTE_MAX ||
    d.hauteur > COTE_MAX ||
    d.largeur * d.hauteur > PIXELS_MAX
  )
    return null;
  return { ...f, ...d };
}

/* JPEG : retire les segments de métadonnées (EXIF/GPS = APP1, IPTC = APP13, commentaires) et garde l'image et le profil de couleur (APP2).
   L'orientation EXIF n'est plus nécessaire : le navigateur a déjà redressé la photo avant l'envoi. */
function retirerMetadonneesJpeg(b) {
  const sortie = [b.subarray(0, 2)];
  let o = 2;
  while (o + 4 <= b.length) {
    if (b[o] !== 0xff) return b; // structure inattendue : on ne touche à rien
    const m = b[o + 1];
    if (m === 0xda) {
      sortie.push(b.subarray(o));
      return Buffer.concat(sortie);
    } // début des données image : le reste est copié tel quel
    const len = u16(b, o + 2);
    if (len < 2 || o + 2 + len > b.length) return b;
    const segment = b.subarray(o, o + 2 + len);
    if (!(m === 0xe1 || m === 0xed || m === 0xfe)) sortie.push(segment);
    o += 2 + len;
  }
  return b;
}

module.exports = {
  analyserImage,
  retirerMetadonneesJpeg,
  COTE_MAX,
  PIXELS_MAX,
};
