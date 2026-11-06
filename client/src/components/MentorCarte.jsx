import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Avatar from './Avatar';
import Pays from './Pays';
import { canalPrive } from '../lib/canaux';
import Icone from './Icone';

// Carte d'un mentor : qui il est, ce qu'il maîtrise, combien de places il lui reste, et l'action possible.
export default function MentorCarte({ m, moi, onDemander, versConnexion }) {
  const { t } = useTranslation();
  const rel = m.ma_relation?.statut;
  const complet = m.places_restantes === 0;
  return (
    <div className="card lift flex h-full flex-col">
      <div className="flex items-start gap-3">
        <Avatar user={{ pseudo: m.pseudo, profil: { photo: m.photo } }} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <Link to={`/developpeurs/${m.id}`} className="truncate text-lg font-semibold text-brand hover:underline">{m.pseudo}</Link>
            <Pays code={m.pays} />
          </div>
          <p className="text-sm text-slate-500"><Icone nom="etoile" className="text-amber-500" /> {m.reputation}{m.niveau ? ` · ${t(`profil.niveaux.${m.niveau}`, { defaultValue: m.niveau })}` : ''}{m.ville ? ` · ${m.ville}` : ''}</p>
        </div>
      </div>
      {m.bio && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{m.bio}</p>}
      {m.stacks.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{m.stacks.slice(0, 6).map((s) => <span key={s} className="rounded bg-brand/10 px-1.5 py-0.5 text-xs text-brand">{s}</span>)}</div>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${complet ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}>
          {complet ? t('mentorat.complet') : t('mentorat.places', { count: m.places_restantes })}
        </span>
        {rel === 'en_attente' && <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900"><Icone nom="sablier" /> {t('mentorat.demande_envoyee')}</span>}
        {rel === 'acceptee' && moi && <Link to={`/messages/${encodeURIComponent(canalPrive(moi.id, m.id))}`} className="btn !py-1.5"><Icone nom="courrier" /> {t('mentorat.ecrire')}</Link>}
        {rel !== 'en_attente' && rel !== 'acceptee' && <button type="button" onClick={() => (moi ? onDemander(m) : versConnexion())} className="btn !py-1.5">{moi ? t('mentorat.demander') : t('mentorat.connexion_demander')}</button>}
      </div>
    </div>
  );
}
