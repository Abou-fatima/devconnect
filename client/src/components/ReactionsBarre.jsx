import { useTranslation } from 'react-i18next';
import Icone from './Icone';

// Les six réactions proposées (doit rester identique à server/src/services/reactions.js).
export const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/* Menu d'un message (au survol sur ordinateur, appui long sur mobile) : barre d'emojis + actions (répondre…).
   monEmoji : ma réaction actuelle (mise en avant) ; la choisir de nouveau la retire.
   actions : [{ cle, label, icone, onClick }] */
export function BarreReactions({ monEmoji, onChoisir, aDroite, actions = [] }) {
  const { t } = useTranslation();
  return (
    <div className={`absolute bottom-full z-20 mb-1 flex flex-col gap-1 ${aDroite ? 'right-0 items-end' : 'left-0 items-start'}`}>
      <div role="toolbar" aria-label={t('reactions.choisir')} className="flex gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 py-1 shadow-lg">
        {EMOJIS.map((e) => (
          <button key={e} type="button" onClick={() => onChoisir(e)} aria-pressed={monEmoji === e}
            className={`rounded-full px-1.5 py-0.5 text-xl leading-none transition hover:scale-125 focus-visible:scale-125 ${monEmoji === e ? 'bg-brand/15 ring-1 ring-brand' : ''}`}>
            <span aria-hidden>{e}</span><span className="sr-only">{e}</span>
          </button>
        ))}
      </div>
      {actions.length > 0 && (
        <ul className="min-w-[11rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
          {actions.map((a) => (
            <li key={a.cle}>
              <button type="button" onClick={a.onClick} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-700 hover:bg-slate-100">
                <Icone nom={a.icone} className="w-4 text-slate-500" /><span>{a.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
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

// Aperçu d'un message cité : texte, « Image » ou « Message vocal » (dans la langue de la personne).
export const apercuCitation = (c, t) => (c.type === 'image' ? t('reactions.type_image') : c.type === 'audio' ? t('reactions.type_audio') : c.texte);

/* Encadré de citation dans une bulle (réponse). Toucher la citation mène au message d'origine quand il est dans ce canal. */
export function CitationBloc({ r, propre, onAller }) {
  const { t } = useTranslation();
  const pseudo = r.auteur?.pseudo || t('chat.supprime');
  const contenu = (
    <>
      <span className={`block truncate text-xs font-semibold ${propre ? 'text-white/90' : 'text-brand'}`}>{pseudo}</span>
      <span className="line-clamp-2 break-words text-[13px] opacity-90">{apercuCitation(r, t)}</span>
    </>
  );
  const classes = `mb-1 block w-full rounded-lg border-l-4 px-2 py-1 text-left ${propre ? 'border-white/70 bg-white/15' : 'border-brand bg-slate-100'}`;
  return r.id && onAller
    ? <button type="button" onClick={() => onAller(r.id)} className={classes} aria-label={t('reactions.voir_original')}>{contenu}</button>
    : <div className={classes}>{contenu}</div>;
}
