// Défi de la semaine : règles métier pures (sans base de données). Le code des participants s'exécute dans leur navigateur
// (jamais sur le serveur) ; le serveur contrôle les dates, la cohérence des résultats annoncés et fait le classement.
const NOM_FONCTION = /^[A-Za-z_$][\w$]{0,39}$/;
const DUREE_MIN_S = 15; // une solution complète en moins de 15 s après le début n'est pas sérieuse
const CODE_MAX = 10000;
const TESTS_MIN = 3;
const TESTS_MAX = 30;
const JSON_MAX = 1000; // taille maximale d'une entrée ou d'un résultat attendu, une fois en JSON

const taille = (v) => { try { const s = JSON.stringify(v); return s === undefined ? -1 : s.length; } catch { return -1; } };

/* Contrôle la liste des tests d'un défi : renvoie un message d'erreur ou null.
   Exigeant : au moins 3 tests, dont au moins un visible (exemple) ET au moins un caché (validation). */
function erreurTests(tests) {
  if (!Array.isArray(tests) || tests.length < TESTS_MIN) return `Au moins ${TESTS_MIN} tests sont nécessaires`;
  if (tests.length > TESTS_MAX) return `${TESTS_MAX} tests au maximum`;
  for (let i = 0; i < tests.length; i += 1) {
    const t = tests[i];
    if (!t || !Array.isArray(t.entree) || t.entree.length > 5) return `Test ${i + 1} : l'entrée doit être une liste de 5 valeurs au maximum`;
    if (!('attendu' in t) || t.attendu === undefined) return `Test ${i + 1} : résultat attendu manquant`;
    if (taille(t.entree) < 0 || taille(t.entree) > JSON_MAX) return `Test ${i + 1} : entrée trop grande ou invalide`;
    if (taille(t.attendu) < 0 || taille(t.attendu) > JSON_MAX) return `Test ${i + 1} : résultat attendu trop grand ou invalide`;
    if (typeof t.visible !== 'boolean') return `Test ${i + 1} : « visible » doit être vrai ou faux`;
  }
  if (!tests.some((t) => t.visible)) return 'Au moins un test visible (exemple) est nécessaire';
  if (!tests.some((t) => !t.visible)) return 'Au moins un test caché (validation) est nécessaire';
  return null;
}

function statut(defi, maintenant = new Date()) {
  const n = new Date(maintenant).getTime();
  if (n < new Date(defi.debut).getTime()) return 'a_venir';
  if (n >= new Date(defi.fin).getTime()) return 'termine';
  return 'en_cours';
}

// Ce que voit le client : jamais les tests cachés (ils ne sont donnés qu'au démarrage d'un essai).
function serialiserDefi(d, maintenant = new Date()) {
  return {
    id: String(d._id),
    titre: d.titre,
    enonce: d.enonce,
    nom_fonction: d.nom_fonction,
    code_depart: d.code_depart,
    tags: d.tags || [],
    debut: d.debut,
    fin: d.fin,
    statut: statut(d, maintenant),
    nb_tests: (d.tests || []).length,
    exemples: (d.tests || []).filter((t) => t.visible).map((t) => ({ entree: t.entree, attendu: t.attendu }))
  };
}

/* Contrôle une soumission avant de l'enregistrer.
   Renvoie { status, message } (refus) ou { reussi, duree_s } (acceptée).
   defi : { tests, debut, fin } ; participation : { debut_at } ; s : { code, tests_reussis, total } */
function verifierSoumission({ defi, participation, s, maintenant = new Date() }) {
  if (statut(defi, maintenant) !== 'en_cours') return { status: 409, message: 'Ce défi n’est pas en cours' };
  if (!participation || !participation.debut_at) return { status: 409, message: 'Commencez le défi avant de soumettre' };
  if (!s || typeof s.code !== 'string' || s.code.trim().length < 10) return { status: 422, message: 'Votre solution est vide ou trop courte' };
  if (s.code.length > CODE_MAX) return { status: 422, message: 'Solution trop longue' };
  const total = defi.tests.length;
  if (s.total !== total) return { status: 422, message: 'Nombre de tests inattendu : rechargez la page' };
  if (!Number.isInteger(s.tests_reussis) || s.tests_reussis < 0 || s.tests_reussis > total) return { status: 422, message: 'Résultat invalide' };
  const duree_s = Math.max(0, Math.round((new Date(maintenant).getTime() - new Date(participation.debut_at).getTime()) / 1000));
  const reussi = s.tests_reussis === total;
  if (reussi && duree_s < DUREE_MIN_S) return { status: 422, message: `Solution envoyée trop vite (${DUREE_MIN_S} secondes minimum après le début)` };
  return { reussi, duree_s };
}

/* Classement d'un défi : seulement les solutions complètes ; le plus rapide d'abord, puis le moins d'essais, puis le premier arrivé. */
function classer(participations) {
  const ok = (Array.isArray(participations) ? participations : []).filter((p) => p && p.reussi);
  ok.sort((a, b) => a.duree_s - b.duree_s || a.essais - b.essais || new Date(a.valide_at) - new Date(b.valide_at));
  return ok.map((p, i) => ({ ...p, rang: i + 1 }));
}

const PODIUM = 3;

// Les trois premiers du classement, avec le sujet de leur notification (fonction pure).
function podium(classement, defi) {
  return (Array.isArray(classement) ? classement : []).slice(0, PODIUM).map((p) => ({
    user_id: p.user_id && p.user_id._id ? p.user_id._id : p.user_id,
    rang: p.rang,
    sujet: { type: 'defi', id: String(defi._id), rang: p.rang, titre: defi.titre },
  }));
}

module.exports = { PODIUM, podium, NOM_FONCTION, DUREE_MIN_S, CODE_MAX, TESTS_MIN, TESTS_MAX, erreurTests, statut, serialiserDefi, verifierSoumission, classer };
