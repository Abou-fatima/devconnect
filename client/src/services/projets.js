import api from './api';

export const listerProjets = (params) => api.get('/projets', { params }).then((r) => r.data);
export const projetsTendance = (params) => api.get('/projets/tendances', { params }).then((r) => r.data);
// Renvoie { projet, mon_like }
export const detailProjet = (id) => api.get(`/projets/${id}`).then((r) => r.data);
export const creerProjet = (body) => api.post('/projets', body).then((r) => r.data.projet);
export const modifierProjet = (id, body) => api.put(`/projets/${id}`, body).then((r) => r.data.projet);
export const supprimerProjet = (id) => api.delete(`/projets/${id}`).then((r) => r.data);
export const aimerProjet = (id) => api.post(`/projets/${id}/like`).then((r) => r.data);
export const retirerLikeProjet = (id) => api.delete(`/projets/${id}/like`).then((r) => r.data);
export const commentairesProjet = (id) => api.get(`/projets/${id}/commentaires`).then((r) => r.data.commentaires);
export const commenterProjet = (id, contenu) => api.post(`/projets/${id}/commentaires`, { contenu }).then((r) => r.data.commentaire);
