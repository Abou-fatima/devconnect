import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useRealtime } from './RealtimeContext';
import { listerConversations, marquerConversationLue } from '../services/chat';

const PrivesContext = createContext({ conversations: [], total: 0, ouvrir: () => () => {} });
export const usePrives = () => useContext(PrivesContext);

// Conversations privées + messages non lus (serveur). Un message reçu pendant que tu étais hors ligne
// est compté ici dès la connexion ; en direct, il arrive par l'événement « prive_message ».
export function PrivesProvider({ children }) {
  const { user } = useAuth();
  const { socket, connecte } = useRealtime() || {};
  const userId = user?.id;
  const [conversations, setConversations] = useState([]);
  const ouverte = useRef(null); // conversation actuellement affichée

  const rafraichir = useCallback(() => {
    if (!userId) return Promise.resolve();
    return listerConversations().then((d) => setConversations(d.conversations)).catch(() => {});
  }, [userId]);

  useEffect(() => { if (!userId) setConversations([]); else rafraichir(); }, [userId, connecte, rafraichir]);

  const lu = useCallback((canal) => {
    setConversations((l) => l.map((c) => (c.canal === canal ? { ...c, non_lus: 0 } : c)));
    marquerConversationLue(canal).catch(() => {});
  }, []);

  // Le composant qui affiche une conversation privée la déclare ouverte : son compteur reste à zéro.
  const ouvrir = useCallback((canal) => {
    ouverte.current = canal;
    lu(canal);
    return () => { if (ouverte.current === canal) ouverte.current = null; };
  }, [lu]);

  useEffect(() => {
    if (!socket) return undefined;
    const recu = (e) => {
      if (e.canal === ouverte.current && document.visibilityState === 'visible') { lu(e.canal); return; }
      setConversations((l) => {
        const existante = l.find((c) => c.canal === e.canal);
        const dernier = { de_moi: false, apercu: e.apercu, created_at: e.created_at };
        const maj = existante
          ? { ...existante, dernier, non_lus: existante.non_lus + 1 }
          : { canal: e.canal, autre: { id: e.auteur.id, pseudo: e.auteur.pseudo, photo: null }, dernier, non_lus: 1 };
        return [maj, ...l.filter((c) => c.canal !== e.canal)];
      });
    };
    socket.on('prive_message', recu);
    return () => socket.off('prive_message', recu);
  }, [socket, lu]);

  const total = useMemo(() => conversations.reduce((s, c) => s + c.non_lus, 0), [conversations]);
  const valeur = useMemo(() => ({ conversations, total, ouvrir, rafraichir }), [conversations, total, ouvrir, rafraichir]);
  return <PrivesContext.Provider value={valeur}>{children}</PrivesContext.Provider>;
}
