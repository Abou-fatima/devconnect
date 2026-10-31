import { useEffect, useRef, useState } from 'react';

// Fait apparaître son contenu (fondu + montée) quand il entre dans l'écran. Sans IntersectionObserver : visible tout de suite.
export default function Reveal({ children, delai = 0, className = '', as: Balise = 'div', ...reste }) {
  const ref = useRef(null);
  const [vu, setVu] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (vu || !ref.current) return undefined;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVu(true); obs.disconnect(); } }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [vu]);
  return <Balise ref={ref} style={{ '--delai': `${delai}s` }} className={`reveal ${vu ? 'reveal-vu' : ''} ${className}`} {...reste}>{children}</Balise>;
}
