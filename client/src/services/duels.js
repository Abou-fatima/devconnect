import api from './api';

export const creerDuel = () => api.post('/duels').then((r) => r.data);
export const rejoindreDuel = (code) => api.post(`/duels/${code}/rejoindre`).then((r) => r.data);
export const getDuel = (code) => api.get(`/duels/${code}`).then((r) => r.data);
export const envoyerProgres = (code, body) => api.post(`/duels/${code}/progres`, body).then((r) => r.data);
