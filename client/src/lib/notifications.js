// Présentation des notifications : le texte vient de nos traductions (le serveur ne renvoie qu'un message en français).
export const ICONES = {
  reponse: '💬',
  reponse_acceptee: '✅',
  vote: '👍',
  mention: '@',
  candidature: '📨',
  candidature_acceptee: '🤝',
  candidature_refusee: '✋',
  mentorat: '🎓'
};

export function texteNotification(n, t) {
  const pseudo = n.acteur?.pseudo;
  if (!pseudo || !ICONES[n.kind]) return n.message || t('notif.generique');
  const options = { pseudo };
  if (n.kind === 'mention') {
    const c = n.sujet?.canal || '';
    options.lieu = c.startsWith('prive:') ? t('notif.lieu_prive') : c.startsWith('stack:') ? `#${c.slice(6)}` : c.startsWith('ville:') ? c.slice(6) : t('notif.lieu_chat');
  }
  return t(`notif.kinds.${n.kind}`, options);
}

/* Où mène un clic sur une notification.
   La page « projet » n'existe pas encore côté client : une candidature mène au profil de la personne concernée.
   À remplacer ici, en un seul endroit, quand elle sera prête. */
export function lienNotification(n) {
  const s = n.sujet;
  if (s?.type === 'canal' && s.canal) return `/messages/${encodeURIComponent(s.canal)}`;
  if (s?.type === 'post' && s.id) return `/forum/questions/${s.id}`;
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
