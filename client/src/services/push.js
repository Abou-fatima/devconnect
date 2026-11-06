import api from './api';

// Notifications système (push) : abonnement de cet appareil.
const BASE = `${import.meta.env.VITE_API_URL || ''}/api`;

export const pushPris = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function cleEnOctets(base64) {
  const rempli = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const brut = atob(rempli);
  return Uint8Array.from([...brut].map((c) => c.charCodeAt(0)));
}

const registration = () => navigator.serviceWorker.ready;

export async function abonnementActuel() {
  if (!pushPris()) return null;
  try { return await (await registration()).pushManager.getSubscription(); } catch { return null; }
}

export const serveurPushActif = () => api.get('/push/cle').then((r) => r.data).catch(() => ({ actif: false, cle: null }));

// Demande l'autorisation, abonne l'appareil et l'enregistre sur le serveur. Retourne 'ok' | 'refuse' | 'indisponible' | 'erreur'.
export async function activerPush() {
  if (!pushPris()) return 'indisponible';
  const { actif, cle } = await serveurPushActif();
  if (!actif || !cle) return 'indisponible';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'refuse';
  try {
    const reg = await registration();
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleEnOctets(cle) });
    await api.post('/push/abonnement', sub.toJSON());
    return 'ok';
  } catch { return 'erreur'; }
}

// Désactive sur cet appareil : le serveur oublie l'abonnement, puis le navigateur le supprime.
export async function desactiverPush() {
  const sub = await abonnementActuel();
  if (!sub) return;
  try { await api.delete('/push/abonnement', { data: { endpoint: sub.endpoint } }); } catch { /* le serveur nettoiera l'abonnement expiré */ }
  try { await sub.unsubscribe(); } catch { /* ignoré */ }
}

// À la déconnexion : avec le jeton encore valide, retire l'appareil pour que la personne suivante sur ce poste ne reçoive pas ses alertes.
export async function oublierAppareil(token) {
  const sub = await abonnementActuel();
  if (!sub) return;
  try {
    if (token) await fetch(`${BASE}/push/abonnement`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ endpoint: sub.endpoint }) });
  } catch { /* ignoré */ }
  try { await sub.unsubscribe(); } catch { /* ignoré */ }
}

// Autorisation déjà donnée : on réenregistre l'appareil pour le compte connecté (changement de compte, abonnement renouvelé).
export async function resynchroniserPush() {
  if (!pushPris() || Notification.permission !== 'granted') return;
  const sub = await abonnementActuel();
  if (sub) { try { await api.post('/push/abonnement', sub.toJSON()); } catch { /* ignoré */ } }
}

// Notification système quand l'onglet est caché (l'application est ouverte mais pas à l'écran).
export async function notifierSysteme({ titre, corps, url, tag }) {
  if (!pushPris() || Notification.permission !== 'granted' || document.visibilityState === 'visible') return;
  try {
    const reg = await registration();
    await reg.showNotification(titre, { body: corps, icon: '/icon-192.png', badge: '/icon-192.png', tag, renotify: Boolean(tag), data: { url } });
  } catch { /* ignoré */ }
}
