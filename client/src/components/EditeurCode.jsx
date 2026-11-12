import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { colorier } from '../lib/coloration';
import { appliquer, indenter, suggestions } from '../lib/autocompletion';

// Couleurs de la coloration (classes écrites en entier pour que Tailwind les retrouve).
const COULEURS = {
  commentaire: 'italic text-slate-400', chaine: 'text-emerald-300', nombre: 'text-amber-300', mot_cle: 'text-sky-300',
  literal: 'text-orange-300', fonction: 'text-yellow-200', type: 'text-teal-300', propriete: 'text-sky-200',
  attribut: 'text-sky-200', balise: 'text-rose-300', variable: 'text-cyan-300'
};
const POLICE = 'font-mono text-[13px] leading-relaxed p-3 whitespace-pre';

/* Éditeur du défi : coloration du code, autocomplétion, Tab = 2 espaces, indentation automatique.
   Le collage et le glisser-déposer sont bloqués (la solution doit être écrite ici, pas copiée d'ailleurs) ;
   onCollageBloque est appelé à chaque tentative, pour que la plateforme en garde le compte.
   La coloration est une couche affichée derrière un champ de saisie au texte transparent. */
export default function EditeurCode({ valeur, onChange, onCollageBloque, disabled, nomFonction = '' }) {
  const { t } = useTranslation();
  const champ = useRef(null);
  const couche = useRef(null);
  const [propositions, setPropositions] = useState([]);
  const [choix, setChoix] = useState(0);
  const morceaux = useMemo(() => colorier(valeur, 'js'), [valeur]);

  const bloquer = (e) => { e.preventDefault(); onCollageBloque?.(); };
  const placer = (pos) => requestAnimationFrame(() => { const el = champ.current; if (el) { el.selectionStart = pos; el.selectionEnd = pos; } });
  const synchroniser = () => { if (couche.current && champ.current) { couche.current.scrollTop = champ.current.scrollTop; couche.current.scrollLeft = champ.current.scrollLeft; } };
  const proposer = (texte, curseur) => { setPropositions(suggestions(texte, curseur, nomFonction)); setChoix(0); };

  const changer = (e) => { onChange(e.target.value); proposer(e.target.value, e.target.selectionStart); };
  const accepter = (mot) => {
    const el = champ.current;
    const r = appliquer(valeur, el.selectionStart, mot);
    onChange(r.texte); setPropositions([]); placer(r.curseur); el.focus();
  };

  const touche = (e) => {
    const el = e.target;
    const ouvert = propositions.length > 0;
    if (ouvert && (e.key === 'Tab' || e.key === 'Enter')) { e.preventDefault(); accepter(propositions[choix]); return; }
    if (ouvert && e.key === 'ArrowDown') { e.preventDefault(); setChoix((c) => (c + 1) % propositions.length); return; }
    if (ouvert && e.key === 'ArrowUp') { e.preventDefault(); setChoix((c) => (c + propositions.length - 1) % propositions.length); return; }
    if (e.key === 'Escape') { setPropositions([]); return; }
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault(); // la touche Tab indente au lieu de quitter le champ
      const d = el.selectionStart;
      onChange(`${valeur.slice(0, d)}  ${valeur.slice(el.selectionEnd)}`); placer(d + 2);
    } else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      const r = indenter(valeur, el.selectionStart, el.selectionEnd);
      onChange(r.texte); placer(r.curseur);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      bloquer(e);
    } else if (e.shiftKey && e.key === 'Insert') {
      bloquer(e);
    }
  };

  return (
    <div>
      <div className="relative rounded-lg bg-slate-900 focus-within:ring-2 focus-within:ring-brand-light">
        <pre ref={couche} aria-hidden="true" className={`pointer-events-none absolute inset-0 m-0 overflow-hidden text-slate-100 ${POLICE}`}>
          {morceaux.map((m, i) => <span key={i} className={m.type ? COULEURS[m.type] : undefined}>{m.texte}</span>)}
          {'\n'}
        </pre>
        <textarea
          ref={champ}
          value={valeur}
          onChange={changer}
          onScroll={synchroniser}
          onBlur={() => setPropositions([])}
          onPaste={bloquer}
          onDrop={bloquer}
          onKeyDown={touche}
          onBeforeInput={(e) => { if (/^insertFrom(Paste|Drop|Yank)/.test(e.nativeEvent?.inputType || '')) bloquer(e); }}
          disabled={disabled}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          wrap="off"
          aria-label={t('defi.editeur')}
          className={`relative block h-72 w-full resize-y overflow-auto bg-transparent text-transparent caret-white focus:outline-none disabled:opacity-60 ${POLICE}`}
        />
        {propositions.length > 0 && (
          <ul role="listbox" aria-label={t('defi.suggestions')} className="absolute bottom-2 right-2 z-10 max-w-[70%] overflow-hidden rounded-lg border border-slate-600 bg-slate-800 text-sm shadow-lg">
            {propositions.map((p, i) => (
              <li key={p} role="option" aria-selected={i === choix}>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); accepter(p); }} className={`block w-full px-3 py-1 text-left font-mono text-xs ${i === choix ? 'bg-sky-700 text-white' : 'text-slate-200 hover:bg-slate-700'}`}>{p}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">{t('defi.collage_bloque')} {t('defi.aide_editeur')}</p>
    </div>
  );
}
