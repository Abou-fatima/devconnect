// Duel de code : deux développeurs résolvent le même problème en même temps, le premier à passer tous les tests gagne.
// Les duels vivent en mémoire (ils durent quelques minutes) ; le code s'exécute dans le navigateur comme pour le défi.
const crypto = require("crypto");

const DUREE_MAX_S = 600; // un duel s'arrête au bout de 10 minutes
const COMPTE_A_REBOURS_S = 6;
const DUREE_MIN_S = 5; // une solution complète avant 5 s n'est pas sérieuse
const PTS_GAGNANT = 15;
const PTS_PERDANT = 3;
const MAX_DUELS = 500;
const TTL_MS = 60 * 60 * 1000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const t = (entree, attendu, visible = false) => ({ entree, attendu, visible });

const PROBLEMES = [
  {
    titre: "Somme des nombres pairs",
    enonce: "Écrivez `sommePairs(nombres)` qui renvoie la somme des nombres **pairs** d'un tableau.",
    nom_fonction: "sommePairs",
    code_depart: "function sommePairs(nombres) {\n  // Écrivez votre solution ici\n}\n",
    tests: [t([[1, 2, 3, 4]], 6, true), t([[]], 0, true), t([[7, 9]], 0), t([[2, 2, 2]], 6), t([[10, 15, 20, -4]], 26)],
  },
  {
    titre: "Mot à l'envers",
    enonce: "Écrivez `inverser(texte)` qui renvoie le texte écrit à l'envers.",
    nom_fonction: "inverser",
    code_depart: "function inverser(texte) {\n  // Écrivez votre solution ici\n}\n",
    tests: [t(["abc"], "cba", true), t([""], "", true), t(["DevConnect"], "tcennoCveD"), t(["a"], "a"), t(["Conakry"], "yrkanoC")],
  },
  {
    titre: "Palindrome",
    enonce: "Écrivez `estPalindrome(texte)` qui renvoie `true` si le texte se lit pareil dans les deux sens (sans tenir compte des majuscules ni des espaces), sinon `false`.",
    nom_fonction: "estPalindrome",
    code_depart: "function estPalindrome(texte) {\n  // Écrivez votre solution ici\n}\n",
    tests: [t(["radar"], true, true), t(["bonjour"], false, true), t(["Ressasser"], true), t(["a b a"], true), t(["ab"], false)],
  },
  {
    titre: "Compter les voyelles",
    enonce: "Écrivez `compterVoyelles(texte)` qui renvoie le nombre de voyelles (a, e, i, o, u, y exclu) dans le texte, sans tenir compte des majuscules.",
    nom_fonction: "compterVoyelles",
    code_depart: "function compterVoyelles(texte) {\n  // Écrivez votre solution ici\n}\n",
    tests: [t(["bonjour"], 3, true), t([""], 0, true), t(["AEIOU"], 5), t(["rythme"], 1), t(["Afrique"], 4)],
  },
  {
    titre: "Plus grand écart",
    enonce: "Écrivez `plusGrandEcart(nombres)` qui renvoie la différence entre le plus grand et le plus petit nombre du tableau (0 si le tableau est vide).",
    nom_fonction: "plusGrandEcart",
    code_depart: "function plusGrandEcart(nombres) {\n  // Écrivez votre solution ici\n}\n",
    tests: [t([[1, 5, 3]], 4, true), t([[]], 0, true), t([[7]], 0), t([[-5, 5]], 10), t([[3, 3, 3]], 0)],
  },
];

const duels = new Map();

function nettoyer(maintenant = Date.now()) {
  for (const [code, d] of duels) if (maintenant - d.cree_at > TTL_MS) duels.delete(code);
  while (duels.size >= MAX_DUELS) duels.delete(duels.keys().next().value);
}

function nouveauCode() {
  for (let essai = 0; essai < 20; essai += 1) {
    const bytes = crypto.randomBytes(5);
    let c = "";
    for (const b of bytes) c += ALPHABET[b % ALPHABET.length];
    if (!duels.has(c)) return c;
  }
  throw new Error("code indisponible");
}

const joueurDe = (user) => ({ id: String(user._id), pseudo: user.pseudo, pays: user.pays || null, tests_reussis: 0, fini: false });

function creer(user, maintenant = Date.now()) {
  nettoyer(maintenant);
  const probleme = PROBLEMES[crypto.randomInt(PROBLEMES.length)];
  const duel = { code: nouveauCode(), probleme, joueurs: [joueurDe(user)], start_at: null, gagnant_id: null, points_donnes: false, cree_at: maintenant };
  duels.set(duel.code, duel);
  return duel;
}

const trouver = (code) => duels.get(String(code || "").toUpperCase()) || null;

// Rejoindre : renvoie false si le duel est complet.
function rejoindre(duel, user, maintenant = Date.now()) {
  if (duel.joueurs.some((j) => j.id === String(user._id))) return true;
  if (duel.joueurs.length >= 2) return false;
  duel.joueurs.push(joueurDe(user));
  duel.start_at = maintenant + COMPTE_A_REBOURS_S * 1000;
  return true;
}

function statut(duel, maintenant = Date.now()) {
  if (duel.joueurs.length < 2) return "attente";
  if (duel.gagnant_id) return "termine";
  if (maintenant < duel.start_at) return "compte_a_rebours";
  if (maintenant >= duel.start_at + DUREE_MAX_S * 1000) return "termine";
  return "en_cours";
}

// Vue envoyée à un joueur. Les tests ne sont donnés qu'aux joueurs, une fois le compte à rebours terminé.
function vue(duel, userId, maintenant = Date.now()) {
  const st = statut(duel, maintenant);
  const moi = duel.joueurs.some((j) => j.id === String(userId));
  const p = duel.probleme;
  const out = {
    code: duel.code,
    statut: st,
    serveur_now: maintenant,
    start_at: duel.start_at,
    duree_max_s: DUREE_MAX_S,
    joueurs: duel.joueurs.map((j) => ({ ...j, total: p.tests.length })),
    gagnant_id: duel.gagnant_id,
    moi,
    points: { gagnant: PTS_GAGNANT, perdant: PTS_PERDANT },
  };
  if (moi && st !== "attente") {
    out.probleme = {
      titre: p.titre,
      enonce: p.enonce,
      nom_fonction: p.nom_fonction,
      code_depart: p.code_depart,
      exemples: p.tests.filter((x) => x.visible).map((x) => ({ entree: x.entree, attendu: x.attendu })),
    };
    if (st === "en_cours" || st === "termine") out.tests = p.tests.map((x) => ({ entree: x.entree, attendu: x.attendu, visible: x.visible }));
  }
  return out;
}

// Enregistre l'avancement d'un joueur. Renvoie { status, message } en cas de refus, sinon { gagne }.
function progres(duel, userId, { tests_reussis, total }, maintenant = Date.now()) {
  const j = duel.joueurs.find((x) => x.id === String(userId));
  if (!j) return { status: 403, message: "Vous ne participez pas à ce duel." };
  if (statut(duel, maintenant) !== "en_cours") return { status: 409, message: "Le duel n'est pas en cours." };
  const n = duel.probleme.tests.length;
  if (total !== n || !Number.isInteger(tests_reussis) || tests_reussis < 0 || tests_reussis > n) return { status: 422, message: "Résultat invalide." };
  j.tests_reussis = Math.max(j.tests_reussis, tests_reussis);
  if (tests_reussis === n) {
    if (maintenant - duel.start_at < DUREE_MIN_S * 1000) return { status: 422, message: "Solution envoyée trop vite." };
    j.fini = true;
    duel.gagnant_id = j.id;
    return { gagne: true };
  }
  return { gagne: false };
}

module.exports = { PROBLEMES, PTS_GAGNANT, PTS_PERDANT, creer, trouver, rejoindre, statut, vue, progres, _duels: duels };
