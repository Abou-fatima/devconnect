import axios from "axios";
import { texteErreur, traduireMessage, typeErreur } from "../lib/erreurs";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ""}/api`,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  let token = null;
  try {
    token = localStorage.getItem("token");
  } catch {
    /* ignore */
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 sur une route protégée : on efface le token et on renvoie vers la connexion.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || "";
    const estAuth =
      url.startsWith("/auth/login") ||
      url.startsWith("/auth/register") ||
      url.startsWith("/auth/otp");
    if (err.response?.status === 401 && !estAuth) {
      try {
        localStorage.removeItem("token");
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(err);
  },
);

// Message lisible : cause technique claire (pas de connexion, serveur en panne…), sinon message du serveur.
export function messageErreur(err, defaut = "Une erreur est survenue") {
  const type = typeErreur(err);
  if (type) return texteErreur(type);
  const d = err?.response?.data;
  if (!d) return defaut;
  if (Array.isArray(d.details) && d.details.length)
    return d.details
      .map((x) =>
        x.champ
          ? `${x.champ} : ${traduireMessage(x.message)}`
          : traduireMessage(x.message),
      )
      .join(" · ");
  return traduireMessage(d.erreur) || defaut;
}

export default api;
