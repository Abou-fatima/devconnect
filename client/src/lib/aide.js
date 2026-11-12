// Assistant d'aide : recherche dans la FAQ et astuces par page. Fonctions pures, sans dépendance à React.

export const normaliser = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ');

/* Classe les entrées de la FAQ selon la requête : chaque mot trouvé dans la question compte plus que dans la réponse. */
export function chercherFaq(faq, requete) {
  const mots = normaliser(requete).split(/\s+/).filter((m) => m.length > 1);
  if (!mots.length) return faq;
  return faq
    .map((e) => {
      const q = normaliser(e.q); const m = normaliser(e.mots); const r = normaliser(e.r);
      const score = mots.reduce((s, mot) => s + (q.includes(mot) ? 3 : 0) + (m.includes(mot) ? 2 : 0) + (r.includes(mot) ? 1 : 0), 0);
      return { e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.e);
}

/* Clé de l'astuce à afficher pour une adresse, ou null. Les chemins précis passent avant les génériques. */
const ASTUCES = [
  ['/forum/poser', 'poser'],
  ['/forum/questions/', 'question'],
  ['/forum', 'forum'],
  ['/projets/nouveau', 'projet_nouveau'],
  ['/projets/', 'projet'],
  ['/projets', 'projets'],
  ['/mentorat', 'mentorat'],
  ['/messages', 'messages'],
  ['/classement', 'classement'],
  ['/developpeurs', 'developpeurs']
];
export const cleAstuce = (pathname) => {
  const hit = ASTUCES.find(([p]) => (p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(`${p}/`)));
  return hit ? hit[1] : null;
};

const cle = (k) => `aide:astuce:${k}`;
export const astuceMasquee = (k) => { try { return localStorage.getItem(cle(k)) === '1'; } catch { return false; } };
export const masquerAstuce = (k) => { try { localStorage.setItem(cle(k), '1'); } catch { /* ignore */ } };
