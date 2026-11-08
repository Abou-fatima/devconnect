import { useTranslation } from 'react-i18next';

/* Éditeur du défi : le collage et le glisser-déposer sont bloqués (la solution doit être écrite ici, pas copiée d'ailleurs).
   onCollageBloque est appelé à chaque tentative, pour que la plateforme en garde le compte. */
export default function EditeurCode({ valeur, onChange, onCollageBloque, disabled }) {
  const { t } = useTranslation();
  const bloquer = (e) => { e.preventDefault(); onCollageBloque?.(); };

  const touche = (e) => {
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault(); // la touche Tab indente au lieu de quitter le champ
      const el = e.target;
      const d = el.selectionStart;
      const f = el.selectionEnd;
      onChange(`${valeur.slice(0, d)}  ${valeur.slice(f)}`);
      requestAnimationFrame(() => { el.selectionStart = d + 2; el.selectionEnd = d + 2; });
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      bloquer(e);
    } else if (e.shiftKey && e.key === 'Insert') {
      bloquer(e);
    }
  };

  return (
    <div>
      <textarea
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        onPaste={bloquer}
        onDrop={bloquer}
        onKeyDown={touche}
        onBeforeInput={(e) => { if (/^insertFrom(Paste|Drop|Yank)/.test(e.nativeEvent?.inputType || '')) bloquer(e); }}
        disabled={disabled}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        aria-label={t('defi.editeur')}
        rows={14}
        className="block w-full resize-y rounded-lg bg-slate-900 p-3 font-mono text-[13px] leading-relaxed text-slate-100 caret-white focus:outline-none focus:ring-2 focus:ring-brand-light disabled:opacity-60"
      />
      <p className="mt-1 text-xs text-slate-500">{t('defi.collage_bloque')}</p>
    </div>
  );
}
