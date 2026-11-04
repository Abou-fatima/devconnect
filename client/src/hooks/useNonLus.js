import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { evenementNonLus, incrementerNonLus, lireNonLus, totalNonLus } from '../lib/nonlus';

// Lit les compteurs de messages non lus (se met à jour à chaque changement).
export function useNonLus() {
  const { user } = useAuth();
  const [map, setMap] = useState(() => lireNonLus(user?.id));
  useEffect(() => {
    setMap(lireNonLus(user?.id));
    const maj = () => setMap(lireNonLus(user?.id));
    window.addEventListener(evenementNonLus, maj);
    window.addEventListener('storage', maj);
    return () => { window.removeEventListener(evenementNonLus, maj); window.removeEventListener('storage', maj); };
  }, [user?.id]);
  return { map, total: totalNonLus(map) };
}

// À monter une seule fois (dans le Layout) : compte les messages reçus dans un salon qu'on n'a pas sous les yeux.
export function useSuiviNonLus() {
  const { user } = useAuth();
  const { socket } = useRealtime() || {};
  const { pathname } = useLocation();
  const chemin = useRef(pathname);
  chemin.current = pathname;
  useEffect(() => {
    if (!socket || !user?.id) return undefined;
    const surMessage = (e) => {
      if (!e?.canal) return;
      const ouvert = chemin.current === `/messages/${encodeURIComponent(e.canal)}` && document.visibilityState === 'visible';
      if (!ouvert) incrementerNonLus(user.id, e.canal);
    };
    socket.on('salon_message', surMessage);
    return () => { socket.off('salon_message', surMessage); };
  }, [socket, user?.id]);
}
