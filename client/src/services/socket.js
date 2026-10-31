import { io } from 'socket.io-client';

// Une seule connexion Socket.IO par session : chat et notifications la partagent.
let socket = null;
let jeton = null;

export function connecter(token) {
  if (socket && jeton === token) return socket;
  deconnecter();
  jeton = token;
  const opts = { auth: { token }, reconnectionDelayMax: 8000 };
  const url = import.meta.env.VITE_API_URL;
  socket = url ? io(url, opts) : io(opts); // sans URL : même origine (proxy Vite en local)
  return socket;
}

export function deconnecter() {
  if (socket) socket.disconnect();
  socket = null;
  jeton = null;
}
