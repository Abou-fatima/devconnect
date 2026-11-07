// Présentation des notifications : le texte vient de nos traductions (le serveur ne renvoie qu'un message en français).
export const ICONES = {
  reponse: 'messages',
  reponse_acceptee: 'succes',
  vote: 'pouce',
  mention: 'arobase',
  candidature: 'envoye',
  candidature_acceptee: 'equipe',
  candidature_refusee: 'main',
  mentorat: 'mentorat',
  tache: 'liste',
  message_prive: 'courrier',
  reaction: 'reaction'
};

export function texteNotification(n, t) {
  const pseudo = n.acteur?.pseudo;
  if (!pseudo || !ICONES[n.kind]) return n.message || t('notif.generique');
  const options = { pseudo };
  if (n.kind === 'mention') {
    const c = n.sujet?.canal || '';
    options.lieu = c.startsWith('prive:') ? t('notif.lieu_prive') : c.startsWith('stack:') ? `#${c.slice(6)}` : c.startsWith('ville:') ? c.slice(6) : t('notif.lieu_chat');
  }
  if (n.kind === 'reaction') options.emoji = n.sujet?.emoji || '👍';
  if (n.kind === 'tache') return t('projets.taches.notif', options);
  if (n.kind === 'mentorat' && ['demande', 'acceptee', 'refusee'].includes(n.sujet?.etape)) return t(`mentorat.notif.${n.sujet.etape}`, options);
  return t(`notif.kinds.${n.kind}`, options);
}

/* Où mène un clic sur une notification.
   Une notification de projet (candidature reçue, acceptée, refusée) ouvre la page du projet. */
export function lienNotification(n) {
  const s = n.sujet;
  if (s?.type === 'canal' && s.canal) return `/messages/${encodeURIComponent(s.canal)}`;
  if (s?.type === 'post' && s.id) return `/forum/questions/${s.id}`;
  if (s?.type === 'projet' && s.id) return `/projets/${s.id}`;
  if (s?.type === 'mentorat') return s.etape === 'demande' ? '/mentorat?onglet=demandes' : '/mentorat?onglet=demandes';
  if (n.acteur?.id) return `/developpeurs/${n.acteur.id}`;
  return '/notifications';
}

export function ilYA(date, langue) {
  const secondes = Math.round((new Date(date).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(langue, { numeric: 'auto' });
  const paliers = [['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [unite, taille] of paliers) {
    if (Math.abs(secondes) >= taille) return rtf.format(Math.round(secondes / taille), unite);
  }
  return rtf.format(0, 'second');
}
