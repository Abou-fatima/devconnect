// Partage d'une question ou d'un projet (WhatsApp, réseaux) : page d'aperçu avec les balises Open Graph.
// Les robots (WhatsApp, Facebook…) lisent les balises ; une personne est aussitôt redirigée vers la vraie page du site.
// Fonctions pures, sans base de données.

const echapper = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Texte brut court : sans blocs de code ni marques de mise en forme, coupé proprement.
function extrait(texte, max = 160) {
  const brut = String(texte == null ? '' : texte)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[#*_>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return brut.length > max ? `${brut.slice(0, max - 1).trimEnd()}…` : brut;
}

/* Page HTML d'aperçu.
   urlPage : la vraie page ; urlCanonique : l'adresse partagée ; image : adresse absolue (facultative). */
function pagePartage({ titre, description, urlPage, urlCanonique, image, nomSite = 'DevConnect' }) {
  const t = echapper(titre);
  const d = echapper(description);
  const p = echapper(urlPage);
  const c = echapper(urlCanonique);
  const i = image ? echapper(image) : '';
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t} · ${echapper(nomSite)}</title>
<meta name="description" content="${d}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${echapper(nomSite)}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${c}">
${i ? `<meta property="og:image" content="${i}">\n` : ''}<meta name="twitter:card" content="summary">
<link rel="canonical" href="${p}">
<meta http-equiv="refresh" content="0;url=${p}">
</head>
<body>
<p><a href="${p}">${t}</a></p>
</body>
</html>
`;
}

module.exports = { echapper, extrait, pagePartage };
