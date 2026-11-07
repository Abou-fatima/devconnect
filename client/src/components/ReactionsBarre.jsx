import { useTranslation } from 'react-i18next';

// Les six réactions proposées (doit rester identique à server/src/services/reactions.js).
export const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/* Barre de choix (au survol sur ordinateur, appui long sur mobile).
   monEmoji : ma réaction actuelle (mise en avant) ; la choisir de nouveau la retire. */
export function BarreReactions({ monEmoji, onChoisir, aDroite }) {
  const { t } = useTranslation();
  return (
    <div role="toolbar" aria-label={t('reactions.choisir')}
      className={`absolute bottom-full z-20 mb-1 flex gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 py-1 shadow-lg ${aDroite ? 'right-0' : 'left-0'}`}>
      {EMOJIS.map((e) => (
        <button key={e} type="button" onClick={() => onChoisir(e)} aria-pressed={monEmoji === e}
          className={`rounded-full px-1.5 py-0.5 text-xl leading-none transition hover:scale-125 focus-visible:scale-125 ${monEmoji === e ? 'bg-brand/15 ring-1 ring-brand' : ''}`}>
          <span aria-hidden>{e}</span><span className="sr-only">{e}</span>
        </button>
      ))}
    </div>
  );
}

/* Pastilles sous la bulle : emoji + nombre ; la mienne est en couleur ; toucher une pastille la bascule. */
export function PastillesReactions({ reactions, moiId, onBasculer }) {
  const { t } = useTranslation();
  if (!reactions || reactions.length === 0) return null;
  return (
    <div className="mt-0.5 flex flex-wrap gap-1 px-1">
      {reactions.map((r) => {
        const miennes = r.users.includes(moiId);
        return (
          <button key={r.emoji} type="button" onClick={() => onBasculer(r.emoji)} aria-pressed={miennes}
            title={t('reactions.compte', { emoji: r.emoji, count: r.users.length })}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs leading-none ${miennes ? 'border-brand bg-brand/10 font-semibold text-brand' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}>
            <span aria-hidden className="text-sm">{r.emoji}</span>
            <span>{r.users.length}</span>
            <span className="sr-only">{t('reactions.compte', { emoji: r.emoji, count: r.users.length })}</span>
          </button>
        );
      })}
    </div>
  );
}
