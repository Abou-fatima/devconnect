// Mode « économie de données » : pas de chargement automatique des images, photos de profil remplacées par l'initiale,
// illustrations masquées, animations coupées. Pensé pour les connexions mobiles lentes ou chères.
// Choix mémorisé sur l'appareil. Sans choix, le mode s'active tout seul si le navigateur signale
// « économiseur de données » ou une connexion 2G.
const CLE = 'economie_donnees';
const ecouteurs = new Set();

function reseauLent() {
  try {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return Boolean(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
  } catch { return false; }
}

export function economieActive() {
  try {
    const v = localStorage.getItem(CLE);
    if (v === 'on') return true;
    if (v === 'off') return false;
  } catch { /* stockage indisponible : on suit le réseau */ }
  return reseauLent();
}

function appliquer() {
  if (typeof document !== 'undefined') document.documentElement.dataset.economie = economieActive() ? 'on' : 'off';
}

export function definirEconomie(actif) {
  try { localStorage.setItem(CLE, actif ? 'on' : 'off'); } catch { /* ignore : le choix vaut pour cette page seulement */ }
  appliquer();
  ecouteurs.forEach((f) => f());
}

export function abonnerEconomie(f) {
  ecouteurs.add(f);
  const surStockage = (e) => { if (e.key === CLE) { appliquer(); f(); } }; // autre onglet
  window.addEventListener('storage', surStockage);
  return () => { ecouteurs.delete(f); window.removeEventListener('storage', surStockage); };
}

appliquer(); // dès le chargement de l'application
