import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as authApi from "../services/auth";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Les réponses de l'API gardées pour le mode hors ligne (voir vite.config.js) sont vidées à la connexion et à la déconnexion :
// la personne suivante sur le même appareil ne doit retrouver ni les données ni les réactions (votes, likes) de la précédente.
const viderCacheApi = () => {
  try {
    if ("caches" in window) caches.delete("api-get");
  } catch {
    /* ignoré */
  }
};

const lireToken = () => {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(lireToken()));

  const logout = useCallback(() => {
    try {
      localStorage.removeItem("token");
    } catch {
      /* ignore */
    }
    viderCacheApi();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!lireToken()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const u = await authApi.me();
      setUser(u);
      return u;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const setSession = useCallback(({ token, utilisateur }) => {
    try {
      localStorage.setItem("token", token);
    } catch {
      /* ignore */
    }
    viderCacheApi();
    setUser(utilisateur);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    window.addEventListener("auth:logout", logout);
    return () => window.removeEventListener("auth:logout", logout);
  }, [logout]);

  const value = useMemo(
    () => ({ user, setUser, loading, logout, refresh, setSession }),
    [user, loading, logout, refresh, setSession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
