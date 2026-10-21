import axios from 'axios';

const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL || ''}/api`, timeout: 15000 });

api.interceptors.request.use((config) => {
  let token = null;
  try { token = localStorage.getItem('token'); } catch { /* ignore */ }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 sur une route protégée : on efface le token et on renvoie vers la connexion.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || '';
    const estAuth = url.startsWith('/auth/login') || url.startsWith('/auth/register') || url.startsWith('/auth/otp');
    if (err.response?.status === 401 && !estAuth) {
      try { localStorage.removeItem('token'); } catch { /* ignore */ }
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(err);
  }
);

// Message lisible à partir de { erreur, details: [{ champ, message }] }
export function messageErreur(err, defaut = 'Une erreur est survenue') {
  const d = err?.response?.data;
  if (!d) return err?.code === 'ERR_NETWORK' ? 'Serveur injoignable' : defaut;
  if (Array.isArray(d.details) && d.details.length) return d.details.map((x) => (x.champ ? `${x.champ} : ${x.message}` : x.message)).join(' · ');
  return d.erreur || defaut;
}

export default api;
