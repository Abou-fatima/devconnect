// Aides pour les canaux de discussion (mêmes règles que le serveur : server/src/communication/canaux.js)
//   stack:<slug>        ex. stack:react
//   ville:<nom>         ex. ville:conakry
//   prive:<idA>_<idB>   conversation privée (ids triés, identique des deux côtés)
const STACK_RE = /^[a-z0-9][a-z0-9.+#-]{0,29}$/;
const VILLE_RE = /^[\p{L}0-9][\p{L}0-9 '-]{0,59}$/u;
const ID_RE = /^[a-f0-9]{24}$/i;

export const canalStack = (saisie) => {
  const s = String(saisie || '').trim().replace(/^#/, '').toLowerCase().replace(/\s+/g, '-');
  return STACK_RE.test(s) ? `stack:${s}` : null;
};

export const canalVille = (saisie) => {
  const v = String(saisie || '').trim().replace(/^#/, '').toLowerCase();
  return VILLE_RE.test(v) ? `ville:${v}` : null;
};

export const canalPrive = (a, b) => {
  const ids = [String(a), String(b)].sort();
  return ids[0] !== ids[1] && ids.every((i) => ID_RE.test(i)) ? `prive:${ids[0]}_${ids[1]}` : null;
};

// Décompose un nom de canal : { type: 'stack' | 'ville' | 'prive', valeur, ids? } ou null.
export function lireCanal(canal) {
  const [prefixe, ...reste] = String(canal || '').split(':');
  const valeur = reste.join(':');
  if (prefixe === 'stack' && STACK_RE.test(valeur)) return { type: 'stack', valeur };
  if (prefixe === 'ville' && VILLE_RE.test(valeur)) return { type: 'ville', valeur };
  if (prefixe === 'prive') {
    const ids = valeur.split('_');
    if (ids.length === 2 && ids.every((i) => ID_RE.test(i))) return { type: 'prive', valeur, ids };
  }
  return null;
}

export const majuscule = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* Salons récents : simple confort par appareil, stocké dans le navigateur.
   Le stockage peut être indisponible (navigation privée) : on ignore alors les erreurs. */
const CLE = 'devconnect:salons';
const MAX = 8;

export function lireRecents() {
  try {
    const liste = JSON.parse(localStorage.getItem(CLE) || '[]');
    return Array.isArray(liste) ? liste.filter((x) => x && lireCanal(x.canal)).slice(0, MAX) : [];
  } catch { return []; }
}

export function ajouterRecent(canal, nom) {
  const existant = lireRecents();
  const ancien = existant.find((x) => x.canal === canal);
  const suite = [{ canal, nom: nom || ancien?.nom }, ...existant.filter((x) => x.canal !== canal)].slice(0, MAX);
  try { localStorage.setItem(CLE, JSON.stringify(suite)); } catch { /* ignore */ }
  return suite;
}
