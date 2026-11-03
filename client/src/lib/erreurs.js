// Erreurs de l'API : message clair (réseau coupé, serveur en panne…) et erreurs rattachées à un champ de formulaire.
import i18n from "../i18n";

const tr = (cle, options) => i18n.t(`erreurs.${cle}`, options);

/* Cause « technique » d'une erreur d'appel : 'hors_ligne' | 'delai' | 'reseau' | 'serveur' | 'limite' | null (erreur métier à afficher telle quelle). */
export function typeErreur(err) {
  if (!err?.isAxiosError && err?.code !== "ERR_NETWORK") return null;
  if (!err.response) {
    if (typeof navigator !== "undefined" && navigator.onLine === false)
      return "hors_ligne";
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") return "delai";
    return "reseau";
  }
  const s = err.response.status;
  if (s === 429) return "limite";
  if (s >= 500) return "serveur";
  return null;
}

// Messages écrits par le serveur (en français) : traduits en anglais quand l'interface est en anglais.
const EN = {
  "Champ requis": "This field is required.",
  "Email invalide":
    "Enter a valid email address, for example name@example.com.",
  "Lettres, chiffres, _ . - uniquement":
    "Letters, digits, _ . - only (no spaces).",
  "Format international requis, ex : +224620000000":
    "International format required, for example +224620000000.",
  "Doit contenir une lettre": "The password must contain at least one letter.",
  "Doit contenir un chiffre": "The password must contain at least one digit.",
  "Code pays ISO à 2 lettres (ex : GN)":
    "2-letter country code, for example GN.",
  "Cet email est déjà utilisé": "This email is already used.",
  "Ce téléphone est déjà utilisé": "This phone number is already used.",
  "Ce pseudo est déjà pris": "This username is already taken.",
  "Format invalide": "Invalid format.",
  "URL invalide": "Invalid URL.",
  "Valeur invalide": "Invalid value.",
  "Identifiants incorrects": "Incorrect username or password.",
  "Données invalides": "Invalid data.",
};

export function traduireMessage(message) {
  if (!message || !i18n.language?.startsWith("en")) return message;
  if (EN[message]) return EN[message];
  const min = /^Minimum (\d+) caractères$/.exec(message);
  if (min) return `At least ${min[1]} characters.`;
  const max = /^Maximum (\d+) caractères$/.exec(message);
  if (max) return `At most ${max[1]} characters.`;
  return message;
}

/* { champ: message } à partir de la réponse { details: [{ champ, message }] } : un message par champ, le premier. */
export function erreursChamps(err) {
  const details = err?.response?.data?.details;
  const res = {};
  if (Array.isArray(details)) {
    details.forEach((d) => {
      if (d?.champ && !res[d.champ]) res[d.champ] = traduireMessage(d.message);
    });
  }
  return res;
}

export const texteErreur = tr;
