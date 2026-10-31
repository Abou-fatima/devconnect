// Aides communes aux pages du forum et du classement.
export function nomPays(code, langue) {
  if (!code) return '';
  try { return new Intl.DisplayNames([langue], { type: 'region' }).of(String(code).toUpperCase()) || code; } catch { return code; }
}

export const lireBrouillon = (cle) => { try { return JSON.parse(localStorage.getItem(cle) || 'null'); } catch { return null; } };
export const ecrireBrouillon = (cle, valeur) => { try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch { /* ignore */ } };
export const effacerBrouillon = (cle) => { try { localStorage.removeItem(cle); } catch { /* ignore */ } };

// Premiers mots utiles d'un titre, pour chercher des questions proches.
export const motsCles = (titre) => String(titre || '').toLowerCase().replace(/[^\p{L}\p{N}\s.#+-]/gu, ' ').split(/\s+/).filter((m) => m.length > 3).slice(0, 4).join(' ');
