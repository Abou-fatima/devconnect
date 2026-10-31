import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/* Texte d'un message : blocs de code (```), code en ligne (`x`), liens http(s) et @mentions.
   Tout est rendu comme des nœuds React (jamais de HTML brut) ; seuls les liens http(s) sont cliquables. */

const BLOC = /```(?:([\w+#.-]{1,20})\n)?([\s\S]*?)```/g;
const INLINE = /(`[^`\n]+`)|(https?:\/\/[^\s<]+)|((?<![\w@])@[A-Za-z0-9_]{3,30})/g;

function Code({ langue, code }) {
  const { t } = useTranslation();
  const [copie, setCopie] = useState(false);
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopie(true);
      setTimeout(() => setCopie(false), 1800);
    } catch { /* presse-papiers indisponible */ }
  };
  return (
    <div className="my-1.5 overflow-hidden rounded-lg bg-slate-900 text-left text-slate-100">
      <div className="flex items-center justify-between bg-slate-800 px-3 py-1 text-xs text-slate-300">
        <span>{langue || 'code'}</span>
        <button type="button" onClick={copier} className="rounded px-1.5 py-0.5 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
          {copie ? t('chat.copie') : t('chat.copier')}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2 text-[13px] leading-relaxed"><code className="font-mono">{code.replace(/\n$/, '')}</code></pre>
    </div>
  );
}

function Ligne({ texte, moi, propre }) {
  const noeuds = [];
  let dernier = 0;
  let k = 0;
  for (const m of texte.matchAll(INLINE)) {
    if (m.index > dernier) noeuds.push(texte.slice(dernier, m.index));
    const [tout, code, lien, mention] = m;
    if (code) {
      noeuds.push(<code key={k++} className={`rounded px-1 py-0.5 font-mono text-[0.85em] ${propre ? 'bg-white/15' : 'bg-slate-100 text-slate-800'}`}>{code.slice(1, -1)}</code>);
    } else if (lien) {
      const fin = lien.match(/[.,;:!?)\]]+$/)?.[0] || ''; // ponctuation collée au lien
      const url = fin ? lien.slice(0, -fin.length) : lien;
      noeuds.push(<a key={k++} href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 break-all">{url}</a>);
      if (fin) noeuds.push(fin);
    } else if (mention) {
      const pour_moi = moi && mention.slice(1).toLowerCase() === moi.toLowerCase();
      noeuds.push(<span key={k++} className={`rounded px-1 font-medium ${pour_moi ? 'bg-accent text-slate-900' : propre ? 'bg-white/20' : 'bg-brand/10 text-brand'}`}>{mention}</span>);
    } else {
      noeuds.push(tout);
    }
    dernier = m.index + tout.length;
  }
  if (dernier < texte.length) noeuds.push(texte.slice(dernier));
  return <>{noeuds}</>;
}

export default function RichText({ texte, moi, propre = false }) {
  const parts = [];
  let dernier = 0;
  let k = 0;
  const src = String(texte || '');
  for (const m of src.matchAll(BLOC)) {
    if (m.index > dernier) parts.push(<span key={k++} className="whitespace-pre-wrap break-words"><Ligne texte={src.slice(dernier, m.index).replace(/^\n+|\n+$/g, '')} moi={moi} propre={propre} /></span>);
    parts.push(<Code key={k++} langue={m[1]} code={m[2]} />);
    dernier = m.index + m[0].length;
  }
  const fin = src.slice(dernier).replace(/^\n+/, '');
  if (fin) parts.push(<span key={k++} className="whitespace-pre-wrap break-words"><Ligne texte={fin} moi={moi} propre={propre} /></span>);
  return <>{parts}</>;
}
