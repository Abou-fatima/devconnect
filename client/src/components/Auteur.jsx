import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Avatar from './Avatar';
import Pays from './Pays';
import { ilYA } from '../lib/notifications';

// Qui a écrit, d'où, avec quelle réputation, et quand.
export default function Auteur({ auteur, date, taille = 28, modifie = false }) {
  const { t, i18n } = useTranslation();
  if (!auteur) return <span className="text-sm text-slate-400">{t('forum.compte_supprime')}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-500">
      <Avatar user={{ pseudo: auteur.pseudo, profil: { photo: auteur.photo } }} size={taille} />
      <Link to={`/developpeurs/${auteur.id}`} className="font-medium text-brand hover:underline">{auteur.pseudo}</Link>
      <span title={t('profil.reputation')}>⭐ {auteur.reputation}</span>
      <Pays code={auteur.pays} />
      {date && <time dateTime={date}>{ilYA(date, i18n.language)}{modifie ? ` · ${t('forum.modifie')}` : ''}</time>}
    </span>
  );
}
