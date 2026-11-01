import api from './api';

export const listerTaches = (projetId) => api.get(`/projets/${projetId}/taches`).then((r) => r.data.taches);
export const creerTache = (projetId, body) => api.post(`/projets/${projetId}/taches`, body).then((r) => r.data.tache);
export const modifierTache = (projetId, tacheId, body) => api.put(`/projets/${projetId}/taches/${tacheId}`, body).then((r) => r.data.tache);
export const supprimerTache = (projetId, tacheId) => api.delete(`/projets/${projetId}/taches/${tacheId}`).then((r) => r.data);
