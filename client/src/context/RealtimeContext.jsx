import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { connecter, deconnecter } from '../services/socket';
import { listerNotifications, marquerNotificationLue } from '../services/chat';

const RealtimeContext = createContext(null);
export const useRealtime = () => useContext(RealtimeContext);

const TAILLE_PAGE = 20;

// Connexion Socket.IO + notifications : cloche, liste, toast. Actif seulement si l'utilisateur est connecté.
export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [socket, setSocket] = useState(null);
  const [connecte, setConnecte] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [nonLues, setNonLues] = useState(0);
  const [page, setPage] = useState(1);
  const [aSuivre, setASuivre] = useState(false);
  const [etat, setEtat] = useState('chargement'); // chargement | ok | erreur
  const [toast, setToast] = useState(null);
  const vivant = useRef(true);

  useEffect(() => { vivant.current = true; return () => { vivant.current = false; }; }, []);

  const charger = useCallback(async () => {
    try {
      const d = await listerNotifications({ page: 1, limit: TAILLE_PAGE });
      if (!vivant.current) return;
      setNotifs(d.notifications);
      setNonLues(d.non_lues);
      setPage(1);
      setASuivre(d.a_suivre);
      setEtat('ok');
    } catch {
      if (vivant.current) setEtat('erreur');
    }
  }, []);

  // Connexion / déconnexion selon la session.
  useEffect(() => {
    if (!userId) {
      deconnecter();
      setSocket(null); setConnecte(false); setNotifs([]); setNonLues(0); setEtat('chargement'); setToast(null);
      return undefined;
    }
    let token = null;
    try { token = localStorage.getItem('token'); } catch { /* ignore */ }
    if (!token) return undefined;

    const s = connecter(token);
    const quandConnecte = () => { setConnecte(true); charger(); }; // à chaque (re)connexion on resynchronise la liste
    const quandDeconnecte = () => setConnecte(false);
    const quandNotification = (n) => {
      setNotifs((prev) => [n, ...prev.filter((x) => x.id !== n.id)]);
      setNonLues((c) => c + 1);
      setToast(n);
    };
    s.on('connect', quandConnecte);
    s.on('disconnect', quandDeconnecte);
    s.on('notification', quandNotification);
    setSocket(s);
    if (s.connected) quandConnecte();
    return () => {
      s.off('connect', quandConnecte);
      s.off('disconnect', quandDeconnecte);
      s.off('notification', quandNotification);
    };
  }, [userId, charger]);

  // Le toast disparaît seul au bout de 6 s.
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  const marquerLue = useCallback(async (id) => {
    const cible = notifs.find((n) => n.id === id);
    if (!cible || cible.lue) return;
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, lue: true } : n)));
    setNonLues((c) => Math.max(0, c - 1));
    try { await marquerNotificationLue(id); } catch { charger(); } // en cas d'échec, on reprend l'état du serveur
  }, [notifs, charger]);

  const toutMarquerLu = useCallback(async () => {
    const ids = notifs.filter((n) => !n.lue).map((n) => n.id);
    if (!ids.length) return;
    setNotifs((prev) => prev.map((n) => ({ ...n, lue: true })));
    await Promise.allSettled(ids.map((id) => marquerNotificationLue(id)));
    charger(); // le compteur exact vient du serveur (il peut y avoir des non lues hors de la page chargée)
  }, [notifs, charger]);

  const chargerPlus = useCallback(async () => {
    try {
      const d = await listerNotifications({ page: page + 1, limit: TAILLE_PAGE });
      if (!vivant.current) return;
      setNotifs((prev) => [...prev, ...d.notifications.filter((n) => !prev.some((p) => p.id === n.id))]);
      setPage(page + 1);
      setASuivre(d.a_suivre);
      setNonLues(d.non_lues);
    } catch { /* l'utilisateur peut réessayer */ }
  }, [page]);

  const value = useMemo(() => ({
    socket, connecte, notifs, nonLues, aSuivre, etat, toast,
    fermerToast: () => setToast(null), marquerLue, toutMarquerLu, chargerPlus, recharger: charger
  }), [socket, connecte, notifs, nonLues, aSuivre, etat, toast, marquerLue, toutMarquerLu, chargerPlus, charger]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
