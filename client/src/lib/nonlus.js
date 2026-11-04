// Messages non lus par salon : compteurs gardés dans le navigateur de chaque utilisateur.
const cle = (userId) => `dc_nonlus_${userId}`;
const EVENEMENT = 'dc-nonlus';

export function lireNonLus(userId) {
  if (!userId) return {};
  try { const v = JSON.parse(localStorage.getItem(cle(userId)) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}
function ecrire(userId, map) {
  try { localStorage.setItem(cle(userId), JSON.stringify(map)); } catch { /* stockage indisponible : le compteur reste valable jusqu'au rechargement */ }
  window.dispatchEvent(new CustomEvent(EVENEMENT, { detail: { userId, map } }));
}
export function incrementerNonLus(userId, canal) {
  if (!userId || !canal) return;
  const map = lireNonLus(userId);
  map[canal] = (map[canal] || 0) + 1;
  ecrire(userId, map);
}
export function effacerNonLus(userId, canal) {
  if (!userId || !canal) return;
  const map = lireNonLus(userId);
  if (!map[canal]) return;
  delete map[canal];
  ecrire(userId, map);
}
export const totalNonLus = (map) => Object.values(map || {}).reduce((a, b) => a + b, 0);
export const evenementNonLus = EVENEMENT;
