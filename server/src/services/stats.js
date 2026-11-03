// Statistiques de l'espace admin : calculs purs (testables sans base de données). Les requêtes sont dans routes/admin.js.
const ROLES = ["dev", "moderateur", "admin"];
const jourCle = (d) => d.toISOString().slice(0, 10);
const debutDuJour = (d) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/* Les n derniers jours (UTC), du plus ancien au plus récent : ['2026-11-01', ...]. */
function derniersJours(n, maintenant = new Date()) {
  const base = debutDuJour(maintenant);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - (n - 1 - i));
    return jourCle(d);
  });
}

/* Premier instant de la période de n jours (pour le filtre created_at >= …). */
const debutPeriode = (n, maintenant = new Date()) =>
  new Date(`${derniersJours(n, maintenant)[0]}T00:00:00.000Z`);

/* [{ _id: '2026-11-01', n: 3 }] -> une valeur pour chaque jour, 0 si aucun enregistrement. */
function completerSerie(agregat, jours) {
  const m = new Map((agregat || []).map((x) => [x._id, x.n]));
  return jours.map((jour) => ({ jour, n: m.get(jour) || 0 }));
}

/* [{ _id: 'admin', n: 2 }, { _id: null, n: 5 }] -> { dev: 5, moderateur: 0, admin: 2 } (sans rôle = dev). */
function parRole(agregat) {
  const r = Object.fromEntries(ROLES.map((x) => [x, 0]));
  (agregat || []).forEach((x) => {
    const k = ROLES.includes(x._id) ? x._id : "dev";
    r[k] += x.n;
  });
  return r;
}

/* Question à ouvrir pour voir un contenu signalé : la question elle-même, ou celle de sa réponse / de son commentaire. */
function idQuestion(doc, parents) {
  if (doc.type === "post") return String(doc._id);
  const p = doc.parent_id ? parents.get(String(doc.parent_id)) : null;
  if (!p) return null;
  if (p.type === "post") return String(p._id);
  return p.parent_id ? String(p.parent_id) : null;
}

module.exports = {
  ROLES,
  derniersJours,
  debutPeriode,
  completerSerie,
  parRole,
  idQuestion,
};
