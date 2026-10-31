import { useEffect, useState } from 'react';

// Renvoie `valeur` avec un retard : évite de lancer une recherche à chaque lettre tapée.
export default function useDebounce(valeur, delai = 350) {
  const [v, setV] = useState(valeur);
  useEffect(() => {
    const id = setTimeout(() => setV(valeur), delai);
    return () => clearTimeout(id);
  }, [valeur, delai]);
  return v;
}
