import api from './api';

export const candidater = (projetId, body) => api.post(`/projets/${projetId}/candidatures`, body).then((r) => r.data.candidature);
export const listerCandidatures = (projetId, params) => api.get(`/projets/${projetId}/candidatures`, { params }).then((r) => r.data.data);
export const accepterCandidature = (id, role) => api.put(`/candidatures/${id}/accepter`, role ? { role } : {}).then((r) => r.data.candidature);
export const refuserCandidature = (id) => api.put(`/candidatures/${id}/refuser`, {}).then((r) => r.data.candidature);
export const retirerCandidature = (id) => api.delete(`/candidatures/${id}`).then((r) => r.data);
export const changerRoleMembre = (projetId, userId, role) => api.put(`/projets/${projetId}/membres/${userId}`, { role }).then((r) => r.data);
export const retirerMembre = (projetId, userId) => api.delete(`/projets/${projetId}/membres/${userId}`).then((r) => r.data);
