import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../services/auth';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const lireToken = () => { try { return localStorage.getItem('token'); } catch { return null; } };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(lireToken()));

  const logout = useCallback(() => {
    try { localStorage.removeItem('token'); } catch { /* ignore */ }
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!lireToken()) { setUser(null); setLoading(false); return null; }
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
    try { localStorage.setItem('token', token); } catch { /* ignore */ }
    setUser(utilisateur);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    window.addEventListener('auth:logout', logout);
    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  const value = useMemo(() => ({ user, setUser, loading, logout, refresh, setSession }), [user, loading, logout, refresh, setSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
