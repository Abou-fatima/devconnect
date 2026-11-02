// Accueil des nouveaux : quand proposer le parcours de bienvenue, et à quel point le profil est complet.
// « Passé / terminé » est mémorisé dans ce navigateur (sans toucher au modèle utilisateur du serveur).

const cle = (userId) => `onboarding:${userId}`;
const lire = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const ecrire = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* navigation privée : on réessaiera la prochaine fois */
  }
};

export const onboardingFait = (userId) =>
  Boolean(userId) && lire(cle(userId)) === "1";
export const marquerFait = (userId) => {
  if (userId) ecrire(cle(userId), "1");
};

export const profilVide = (u) =>
  !u?.profil?.niveau && !u?.stacks?.length && !u?.objectifs?.length;

/* Un compte tout neuf (aucun niveau, aucune technologie, aucun objectif) passe d'abord par la bienvenue. */
export const doitOnboarder = (u) =>
  Boolean(u) && profilVide(u) && !onboardingFait(u.id);

export const ETAPES_PROFIL = [
  { cle: "objectifs", fait: (u) => (u.objectifs?.length || 0) > 0 },
  { cle: "niveau", fait: (u) => Boolean(u.profil?.niveau) },
  { cle: "stacks", fait: (u) => (u.stacks?.length || 0) > 0 },
  { cle: "pays", fait: (u) => Boolean(u.pays) },
  { cle: "bio", fait: (u) => Boolean(u.profil?.bio?.trim()) },
  { cle: "photo", fait: (u) => Boolean(u.profil?.photo) },
];

/* { pct, manquants: [cle…] } : sert au bandeau « Termine ton profil ». */
export function completude(u) {
  if (!u) return { pct: 0, manquants: [] };
  const manquants = ETAPES_PROFIL.filter((e) => !e.fait(u)).map((e) => e.cle);
  return {
    pct: Math.round(
      ((ETAPES_PROFIL.length - manquants.length) / ETAPES_PROFIL.length) * 100,
    ),
    manquants,
  };
}

// Pays proposés (Afrique francophone d'abord, puis le reste de la communauté).
export const PAYS_PROPOSES = [
  "GN",
  "SN",
  "CI",
  "ML",
  "BF",
  "BJ",
  "TG",
  "NE",
  "CM",
  "GA",
  "CG",
  "CD",
  "MG",
  "MA",
  "DZ",
  "TN",
  "MR",
  "NG",
  "GH",
  "KE",
  "FR",
  "BE",
  "CA",
];

/* Où mener la personne selon ses objectifs : au plus 3 actions, adaptées à ce qu'elle veut faire. */
const ACTIONS = {
  apprendre: { cle: "poser", icone: "💬", lien: "/forum/poser" },
  collaborer: { cle: "equipe", icone: "🤝", lien: "/projets" },
  mentorat: { cle: "mentor", icone: "🎓", lien: "/mentorat" },
  offrir_mentorat: { cle: "offrir", icone: "🌟", lien: "/mentorat" },
  emploi: { cle: "profil", icone: "💼", lien: "/profil/modifier" },
  projet_perso: { cle: "projet", icone: "🚀", lien: "/projets/nouveau" },
};
const PAR_DEFAUT = ["apprendre", "collaborer", "mentorat"];

export function actionsPour(objectifs = []) {
  const voulus = objectifs.filter((o) => ACTIONS[o]);
  const liste = [...new Set([...voulus, ...PAR_DEFAUT])].slice(0, 3);
  // Deux objectifs peuvent mener au même endroit (mentorat / offrir_mentorat) : on n'affiche qu'une carte par action.
  return [...new Map(liste.map((o) => [ACTIONS[o].cle, ACTIONS[o]])).values()];
}
