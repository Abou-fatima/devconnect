// Carte d'Afrique : nombre de membres par pays. Fonction pure (le comptage lui-même est fait par MongoDB).
// rangees : [{ _id: 'gn', total: 12 }, …] ; renvoie les pays valides (code ISO à 2 lettres, majuscules), du plus au moins peuplé.
function normaliser(rangees) {
  const cumul = new Map();
  (Array.isArray(rangees) ? rangees : []).forEach((r) => {
    const code = typeof r._id === 'string' ? r._id.trim().toUpperCase() : '';
    const total = Number(r.total);
    if (!/^[A-Z]{2}$/.test(code) || !Number.isFinite(total) || total <= 0) return;
    cumul.set(code, (cumul.get(code) || 0) + Math.floor(total));
  });
  const pays = [...cumul.entries()].map(([code, total]) => ({ pays: code, total }));
  pays.sort((a, b) => b.total - a.total || a.pays.localeCompare(b.pays));
  return { pays, membres: pays.reduce((s, p) => s + p.total, 0) };
}

module.exports = { normaliser };
