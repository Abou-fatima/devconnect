// Petites fonctions pures du défi de la semaine.
export function formaterDuree(secondes) {
  const s = Math.max(0, Math.round(Number(secondes) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const deux = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${deux(m)}:${deux(r)}` : `${m}:${deux(r)}`;
}

// « 2 j 3 h », « 5 h 10 min », « 12 min » : temps restant lisible.
export function tempsRestant(finIso, maintenant = Date.now()) {
  const ms = new Date(finIso).getTime() - maintenant;
  if (!(ms > 0)) return null;
  const min = Math.floor(ms / 60000);
  const j = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (j > 0) return `${j} j ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${Math.max(1, m)} min`;
}

// Lit une valeur JSON saisie dans un formulaire : { ok: true, valeur } ou { ok: false }.
export function lireJson(texte) {
  try {
    const v = JSON.parse(String(texte).trim());
    return { ok: true, valeur: v };
  } catch { return { ok: false }; }
}

export const REGEX_NOM_FONCTION = /^[A-Za-z_$][\w$]{0,39}$/;
