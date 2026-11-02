// Notes vocales : contrôle du format, enregistrement sur le serveur et transcription par Whisper.
// La transcription est un bonus : si elle échoue (clé absente, réseau coupé), la note vocale est envoyée quand même.
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const env = require("../config/env");

const MAX_OCTETS = 10 * 1024 * 1024; // ~ 2 minutes en qualité voix
const MAX_TRANSCRIPTION = 2000; // même limite que les messages du chat
const DOSSIER = "audio";
const PREFIXE_URL = "/uploads/";
const LANGUES = ["fr", "en"];

/* Reconnaît le format réel à partir des premiers octets (le type annoncé par le navigateur peut être faux).
   Formats produits par MediaRecorder : webm (Chrome, Firefox, Android), ogg (Firefox), mp4/m4a (Safari, iOS). */
function detecterFormat(b) {
  if (!Buffer.isBuffer(b) || b.length < 16) return null;
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3)
    return { ext: "webm", mime: "audio/webm" };
  if (b.toString("latin1", 0, 4) === "OggS")
    return { ext: "ogg", mime: "audio/ogg" };
  if (b.toString("latin1", 4, 8) === "ftyp")
    return { ext: "m4a", mime: "audio/mp4" };
  if (
    b.toString("latin1", 0, 4) === "RIFF" &&
    b.toString("latin1", 8, 12) === "WAVE"
  )
    return { ext: "wav", mime: "audio/wav" };
  if (
    b.toString("latin1", 0, 3) === "ID3" ||
    (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)
  )
    return { ext: "mp3", mime: "audio/mpeg" };
  return null;
}

const nomFichier = (ext) =>
  `${Date.now().toString(36)}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
const urlPublique = (nom) => `${PREFIXE_URL}${DOSSIER}/${nom}`;

async function enregistrerAudio(buffer, ext) {
  const dossier = path.join(env.uploadsDir, DOSSIER);
  await fs.mkdir(dossier, { recursive: true });
  const nom = nomFichier(ext);
  await fs.writeFile(path.join(dossier, nom), buffer, { flag: "wx" });
  return { url: urlPublique(nom), taille: buffer.length };
}

const nettoyerTranscription = (t) =>
  typeof t === "string"
    ? t.replace(/\s+/g, " ").trim().slice(0, MAX_TRANSCRIPTION)
    : "";

// Whisper : API compatible OpenAI (OpenAI, Groq…). Se configure par variables d'environnement.
function configWhisper(e = process.env) {
  return {
    url: e.WHISPER_API_URL || "https://api.openai.com/v1/audio/transcriptions",
    cle: e.WHISPER_API_KEY || e.OPENAI_API_KEY || "",
    modele: e.WHISPER_MODEL || "whisper-1",
    delaiMs: Number(e.WHISPER_TIMEOUT_MS) || 30000,
  };
}
const transcriptionActive = (e = process.env) => Boolean(configWhisper(e).cle);

/* Transcrit un enregistrement. Renvoie le texte, ou null si la transcription est désactivée ou échoue.
   deps permet de tester sans réseau. */
async function transcrire(buffer, { ext, mime, langue } = {}, deps = {}) {
  const cfg = deps.config || configWhisper();
  const appel = deps.fetch || globalThis.fetch;
  if (!cfg.cle || typeof appel !== "function") return null;
  try {
    const form = new FormData();
    form.append(
      "file",
      new Blob([buffer], { type: mime || "audio/webm" }),
      `note.${ext || "webm"}`,
    );
    form.append("model", cfg.modele);
    form.append("response_format", "json");
    if (LANGUES.includes(langue)) form.append("language", langue);
    const reponse = await appel(cfg.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.cle}` },
      body: form,
      signal: AbortSignal.timeout(cfg.delaiMs),
    });
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    const texte = nettoyerTranscription((await reponse.json()).text);
    return texte || null;
  } catch (e) {
    console.error("[audio] transcription :", e.message);
    return null;
  }
}

/* Transcription d'un audio déjà envoyé par cette personne (pour la joindre à un message ou à une réponse). */
async function transcriptionDe(url, userId) {
  if (typeof url !== "string" || !url.startsWith(`${PREFIXE_URL}${DOSSIER}/`))
    return undefined;
  try {
    const Depot = require("../models/Depot");
    const depot = await Depot.findOne({
      url,
      proprietaire_id: userId,
      type_fichier: "audio",
    })
      .select("metadata")
      .lean();
    return depot?.metadata?.transcription || undefined;
  } catch {
    return undefined;
  }
}

module.exports = {
  MAX_OCTETS,
  MAX_TRANSCRIPTION,
  LANGUES,
  detecterFormat,
  enregistrerAudio,
  nettoyerTranscription,
  configWhisper,
  transcriptionActive,
  transcrire,
  transcriptionDe,
  urlPublique,
};
