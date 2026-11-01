import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Avatar from './Avatar';
import { STYLE_STATUT, idPersonne, idProjet } from '../lib/projets';

// Carte d'un projet (liste, accueil). Toute la carte est cliquable ; le porteur garde son propre lien.
export default function ProjetCarte({ p }) {
  const { t } = useTranslation();
  const porteur = p.porteur_id && typeof p.porteur_id === 'object' ? p.porteur_id : null;
  const stack = p.stack || [];
  return (
    <div className="card lift relative flex h-full flex-col">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug">
          <Link to={`/projets/${idProjet(p)}`} className="text-brand after:absolute after:inset-0 hover:underline focus-visible:outline-none">{p.titre}</Link>
        </h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STYLE_STATUT[p.statut] || STYLE_STATUT.idee}`}>{t(`projets.statut.${p.statut}`, { defaultValue: p.statut })}</span>
      </div>
      {p.description && <p className="mt-1 line-clamp-3 text-sm text-slate-600">{p.description}</p>}
      {stack.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {stack.slice(0, 4).map((s) => <span key={s} className="rounded bg-brand/10 px-1.5 py-0.5 text-xs text-brand">{s}</span>)}
          {stack.length > 4 && <span className="px-1 text-xs text-slate-500">+{stack.length - 4}</span>}
        </div>
      )}
      {p.roles_recherches?.length > 0 && <p className="mt-2 text-xs font-medium text-amber-800">🔎 {t('projets.cherche')} : {p.roles_recherches.slice(0, 3).join(', ')}</p>}
      <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-slate-500">
        {porteur ? (
          <span className="relative z-10 inline-flex min-w-0 items-center gap-1.5">
            <Avatar user={porteur} size={20} />
            <Link to={`/developpeurs/${idPersonne(porteur)}`} className="truncate font-medium text-slate-700 hover:underline">{porteur.pseudo}</Link>
          </span>
        ) : <span />}
        <span className="shrink-0">♥ {p.nb_likes ?? 0} · 👁 {p.nb_vues ?? 0}</span>
      </div>
    </div>
  );
}
