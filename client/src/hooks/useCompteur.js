import { useEffect, useState } from 'react';

// Fait « monter » un nombre de 0 à sa valeur (sauf si la personne a demandé moins d'animations).
export default function useCompteur(cible, duree = 900) {
  const [valeur, setValeur] = useState(0);
  useEffect(() => {
    if (typeof cible !== 'number') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || cible < 2) { setValeur(cible); return undefined; }
    let id;
    const debut = performance.now();
    const pas = (now) => {
      const p = Math.min(1, (now - debut) / duree);
      setValeur(Math.round(cible * (1 - (1 - p) ** 3)));
      if (p < 1) id = requestAnimationFrame(pas);
    };
    id = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(id);
  }, [cible, duree]);
  return valeur;
}
