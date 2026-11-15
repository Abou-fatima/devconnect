import api from "./api";

// Envoie une note vocale (Blob) ; le serveur renvoie son adresse et, si Whisper est actif, la transcription.
export const envoyerVocal = (blob, langue, texteLocal) => {
  const form = new FormData();
  const ext = (blob.type.match(/(webm|ogg|mp4|wav|mpeg)/) || [])[1] || "webm";
  form.append("file", blob, `note.${ext === "mpeg" ? "mp3" : ext}`);
  if (langue) form.append("langue", langue);
  if (texteLocal) form.append("texte_local", String(texteLocal).slice(0, 2000)); // transcription faite par le navigateur
  return api
    .post("/audio", form, {
      timeout: 60000,
      headers: { "Content-Type": undefined },
    })
    .then((r) => r.data);
};
