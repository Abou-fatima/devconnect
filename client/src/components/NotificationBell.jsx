import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRealtime } from '../context/RealtimeContext';
import { lienNotification } from '../lib/notifications';
import NotificationItem from './NotificationItem';

// Cloche de l'en-tête : pastille du nombre de non lues + panneau des dernières notifications.
export default function NotificationBell() {
  const { t } = useTranslation();
  const { notifs, nonLues, etat, marquerLue, toutMarquerLu, recharger } = useRealtime();
  const navigate = useNavigate();
  const [ouvert, setOuvert] = useState(false);
  const racine = useRef(null);

  useEffect(() => {
    if (!ouvert) return undefined;
    const dehors = (e) => { if (racine.current && !racine.current.contains(e.target)) setOuvert(false); };
    const echap = (e) => { if (e.key === 'Escape') setOuvert(false); };
    document.addEventListener('mousedown', dehors);
    document.addEventListener('keydown', echap);
    return () => { document.removeEventListener('mousedown', dehors); document.removeEventListener('keydown', echap); };
  }, [ouvert]);

  const ouvrir = (n) => {
    marquerLue(n.id);
    setOuvert(false);
    navigate(lienNotification(n));
  };

  const recentes = notifs.slice(0, 6);
  const libelle = nonLues > 0 ? t('notif.cloche_non_lues', { count: nonLues }) : t('notif.cloche');

  return (
    <div ref={racine} className="md:relative">
      <button
        type="button" onClick={() => setOuvert((o) => !o)} aria-haspopup="true" aria-expanded={ouvert} aria-label={libelle}
        className="relative rounded-lg p-2 text-white/90 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <svg key={nonLues} className={nonLues > 0 ? 'anim-ring' : ''} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {nonLues > 0 && (
          <span key={nonLues} className="anim-pop absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold leading-none text-slate-900">
            {nonLues > 99 ? '99+' : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <div role="region" aria-label={t('notif.titre')} className="anim-scale origin-top-right fixed inset-x-3 top-16 z-30 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <h2 className="font-bold">{t('notif.titre')}</h2>
            {nonLues > 0 && <button type="button" onClick={toutMarquerLu} className="text-sm text-brand-light hover:underline">{t('notif.tout_lu')}</button>}
          </div>
          <div className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
            {etat === 'erreur' && (
              <div className="p-4 text-center">
                <p className="erreur">{t('notif.erreur')}</p>
                <button type="button" onClick={recharger} className="btn-outline mt-2 !py-1">{t('chat.reessayer')}</button>
              </div>
            )}
            {etat === 'ok' && recentes.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-500">{t('notif.vide')}</p>
            )}
            {recentes.map((n) => <NotificationItem key={n.id} n={n} onOuvrir={ouvrir} />)}
          </div>
          <Link to="/notifications" onClick={() => setOuvert(false)} className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-medium text-brand-light hover:bg-slate-50">
            {t('notif.voir_tout')}
          </Link>
        </div>
      )}
    </div>
  );
}
