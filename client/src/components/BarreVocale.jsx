import './vocal.css';
import { useTranslation } from 'react-i18next';

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/* Barre affichée à la place de la zone de texte pendant un vocal : enregistrement, écoute, envoi. */
export default function BarreVocale({ etat, secondes, resultat, envoi, onArreter, onAnnuler, onEnvoyer, dureeMax }) {
  const { t } = useTranslation();
  const reste = dureeMax - secondes;
  return (
    <div className="anim-scale flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5" role="group" aria-label={t('vocal.note')}>
      <button type="button" onClick={onAnnuler} disabled={envoi} className="rounded-lg px-2 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50" aria-label={t('vocal.annuler')} title={t('vocal.annuler')}>🗑</button>
      {etat === 'enregistre' ? (
        <>
          <span className="vocal-point h-3 w-3 shrink-0 rounded-full bg-red-600" aria-hidden />
          <span className="font-mono text-sm tabular-nums" role="timer" aria-live="off">{mmss(secondes)}</span>
          <span className="vocal-ondes hidden flex-1 sm:flex" aria-hidden>{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ animationDelay: `${(i % 6) * 0.12}s` }} />)}</span>
          <span className="flex-1 text-xs text-slate-500 sm:hidden">{t('vocal.enregistrement')}</span>
          {reste <= 15 && <span className="text-xs font-medium text-red-600" role="status">{t('vocal.reste', { count: reste })}</span>}
          <button type="button" onClick={onArreter} className="btn !py-1.5" aria-label={t('vocal.arreter')}>■ {t('vocal.arreter')}</button>
        </>
      ) : (
        <>
          <audio controls src={resultat?.url} className="h-9 min-w-0 flex-1" aria-label={t('vocal.ecouter')} />
          <button type="button" onClick={onEnvoyer} disabled={envoi} className="btn !py-1.5">{envoi ? t('vocal.envoi') : t('vocal.envoyer')}</button>
        </>
      )}
    </div>
  );
}
