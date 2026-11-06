import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { urlFichier } from '../lib/fichiers';
import Icone from './Icone';

// Image d'un message : vignette cliquable, qui s'ouvre en grand (Échap ou clic pour fermer).
export default function ImageMessage({ url }) {
  const { t } = useTranslation();
  const [grand, setGrand] = useState(false);
  const [casse, setCasse] = useState(false);
  useEffect(() => {
    if (!grand) return undefined;
    const surTouche = (e) => { if (e.key === 'Escape') setGrand(false); };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [grand]);

  if (casse) return <p className="text-sm italic opacity-80">{t('images.indisponible')}</p>;
  return (
    <>
      <button type="button" onClick={() => setGrand(true)} className="mt-1 block overflow-hidden rounded-lg" aria-label={t('images.agrandir')}>
        <img src={urlFichier(url)} alt={t('images.alt')} loading="lazy" onError={() => setCasse(true)} className="max-h-64 max-w-full rounded-lg object-cover" />
      </button>
      {grand && (
        <div role="dialog" aria-modal="true" aria-label={t('images.alt')} onClick={() => setGrand(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <button type="button" onClick={() => setGrand(false)} aria-label={t('images.fermer')} className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-lg text-slate-900"><Icone nom="fermer" /></button>
          <img src={urlFichier(url)} alt={t('images.alt')} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </>
  );
}
