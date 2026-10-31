import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

// Zone d'écriture simple pour les débutants : bouton « code », compteur, aide repliable.
export default function EditeurTexte({ valeur, onChange, placeholder, rows = 6, max = 10000, id, aide = true, requis = false }) {
  const { t } = useTranslation();
  const ref = useRef(null);

  const insererCode = () => {
    const el = ref.current;
    const debut = el?.selectionStart ?? valeur.length;
    const fin = el?.selectionEnd ?? valeur.length;
    const choisi = valeur.slice(debut, fin);
    onChange(`${valeur.slice(0, debut)}\`\`\`\n${choisi}\n\`\`\`${valeur.slice(fin)}`);
    requestAnimationFrame(() => { el?.focus(); const p = debut + 4 + choisi.length; el?.setSelectionRange(p, p); });
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <button type="button" onClick={insererCode} className="btn-outline !px-2.5 !py-1 font-mono text-sm" title={t('chat.bloc_code')}>{'{ }'} <span className="ml-1.5 font-sans">{t('forum.ajouter_code')}</span></button>
        {valeur.length > max * 0.8 && <span className={`text-xs ${valeur.length > max ? 'text-red-600' : 'text-slate-500'}`}>{valeur.length} / {max}</span>}
      </div>
      <textarea id={id} ref={ref} className="input min-h-[7rem] resize-y" rows={rows} value={valeur} maxLength={max} required={requis}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {aide && (
        <details className="mt-1 text-xs text-slate-500">
          <summary className="cursor-pointer select-none hover:text-slate-700">{t('forum.aide_format')}</summary>
          <p className="mt-1">{t('forum.aide_format_texte')}</p>
        </details>
      )}
    </div>
  );
}
