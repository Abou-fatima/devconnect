// Texte « il y a 5 minutes » / « 5 minutes ago » pour une date passée (langue de l'interface).
export function dureeRelative(date, lang, aLInstant) {
  const secondes = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (secondes < 60) return aLInstant;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'always' });
  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return rtf.format(-heures, 'hour');
  const jours = Math.floor(heures / 24);
  if (jours < 30) return rtf.format(-jours, 'day');
  return rtf.format(-Math.floor(jours / 30), 'month');
}
