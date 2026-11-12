import api from './api';

export const getDefiCourant = () => api.get('/defis/courant').then((r) => r.data);
export const getDefi = (id) => api.get(`/defis/${id}`).then((r) => r.data);
export const listerDefis = () => api.get('/defis').then((r) => r.data.defis);
export const creerDefi = (body) => api.post('/defis', body).then((r) => r.data.defi);
export const demarrerDefi = (id) => api.post(`/defis/${id}/demarrer`).then((r) => r.data);
export const soumettreDefi = (id, body) => api.post(`/defis/${id}/soumettre`, body).then((r) => r.data);
