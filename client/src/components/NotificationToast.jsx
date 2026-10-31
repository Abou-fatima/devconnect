import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRealtime } from '../context/RealtimeContext';
import { ICONES, lienNotification, texteNotification } from '../lib/notifications';

// Bandeau qui apparaît quand une notification arrive en direct. Un clic ouvre l'élément concerné.
export default function NotificationToast() {
  const { t } = useTranslation();
  const { toast, fermerToast, marquerLue } = useRealtime();
  const navigate = useNavigate();
  if (!toast) return null;

  const ouvrir = () => { marquerLue(toast.id); fermerToast(); navigate(lienNotification(toast)); };

  return (
    <div className="pointer-events-none fixed inset-x-3 top-16 z-40 flex justify-center md:inset-x-auto md:right-4 md:justify-end" role="status" aria-live="polite">
      <div className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xl motion-safe:animate-[toast-in_.2s_ease-out]">
        <button type="button" onClick={ouvrir} className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20" aria-hidden>{ICONES[toast.kind] || '🔔'}</span>
          <span className="min-w-0 text-[15px] leading-snug text-slate-900">{texteNotification(toast, t)}</span>
        </button>
        <button type="button" onClick={fermerToast} aria-label={t('notif.fermer')} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
      </div>
    </div>
  );
}
