import { useTranslation } from 'react-i18next';
import { ICONES, ilYA, texteNotification } from '../lib/notifications';

// Une ligne de notification (cloche et page « Notifications »). Les non lues ont un repère ambre et un texte plus appuyé.
export default function NotificationItem({ n, onOuvrir }) {
  const { t, i18n } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => onOuvrir(n)}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none ${n.lue ? '' : 'bg-amber-50/60'}`}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-base text-brand" aria-hidden>{ICONES[n.kind] || '🔔'}</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] leading-snug ${n.lue ? 'text-slate-600' : 'font-medium text-slate-900'}`}>{texteNotification(n, t)}</span>
        <time dateTime={n.created_at} className="text-xs text-slate-400">{ilYA(n.created_at, i18n.language)}</time>
      </span>
      {!n.lue && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" role="img" aria-label={t('notif.non_lue')} />}
    </button>
  );
}
