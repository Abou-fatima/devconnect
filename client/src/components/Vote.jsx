import { useTranslation } from 'react-i18next';

// Flèches de vote. Un clic sur la flèche déjà active retire le vote.
export default function Vote({ nb, mon, onVoter, desactive = false, petit = false }) {
  const { t } = useTranslation();
  const bouton = (valeur, actif, libelle, path) => (
    <button
      type="button" onClick={() => onVoter(valeur)} disabled={desactive} aria-pressed={actif} aria-label={libelle} title={libelle}
      className={`rounded-lg p-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-light disabled:opacity-40 ${actif ? (valeur === 1 ? 'bg-brand text-white' : 'bg-red-600 text-white') : 'text-slate-500 hover:bg-slate-100'}`}
    >
      <svg width={petit ? 18 : 22} height={petit ? 18 : 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={path} /></svg>
    </button>
  );
  return (
    <div className="flex shrink-0 flex-col items-center">
      {bouton(1, mon === 1, t('forum.voter_haut'), 'M6 15l6-6 6 6')}
      <span className={`my-0.5 min-w-[1.5rem] text-center font-bold tabular-nums ${petit ? 'text-sm' : 'text-lg'} ${nb > 0 ? 'text-brand' : nb < 0 ? 'text-red-600' : 'text-slate-500'}`} aria-label={t('forum.nb_votes', { count: nb })}>{nb}</span>
      {bouton(-1, mon === -1, t('forum.voter_bas'), 'M6 9l6 6 6-6')}
    </div>
  );
}
