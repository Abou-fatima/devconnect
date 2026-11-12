// Aides pour les projets : l'API renvoie tantôt `id`, tantôt `_id` selon la route.
export const idProjet = (p) => p?.id || p?._id;
export const idPersonne = (u) =>
  u && typeof u === "object" ? u.id || u._id : u;

export const STATUTS = ["idee", "en_cours", "termine"];
export const STYLE_STATUT = {
  idee: "bg-slate-100 text-slate-700",
  en_cours: "bg-sky-100 text-sky-800",
  termine: "bg-emerald-100 text-emerald-800",
};
export const ROLES_SUGGERES = [
  "frontend",
  "backend",
  "mobile",
  "design",
  "devops",
  "data",
  "ia",
  "testeur",
];
export const CATEGORIES = [
  "Éducation",
  "Santé",
  "Agriculture",
  "Finance",
  "Commerce",
  "Transport",
  "Environnement",
  "Outils pour développeurs",
  "Autre",
];

// Un lien n'est affiché que s'il commence par http(s) : jamais de « javascript: ».
export const lienSur = (u) =>
  /^https?:\/\//i.test(String(u || "")) ? u : null;
export const hoteLien = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

export const nettoyerStack = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.+#-]/g, "")
    .slice(0, 50);
export const nettoyerRole = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 40);
