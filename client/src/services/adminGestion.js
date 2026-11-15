import api from "./api";

const g = (url, params) => api.get(`/admin/gestion${url}`, { params }).then((r) => r.data);
const p = (url, body) => api.put(`/admin/gestion${url}`, body).then((r) => r.data);
const d = (url) => api.delete(`/admin/gestion${url}`).then((r) => r.data);

export const listerUtilisateurs = (params) => g("/users", params);
export const bloquerUtilisateur = (id, bloque, motif) => p(`/users/${id}/blocage`, { bloque, motif });
export const modifierUtilisateur = (id, donnees) => p(`/users/${id}`, donnees);
export const supprimerUtilisateur = (id) => d(`/users/${id}`);
export const changerRole = (id, role) => api.put(`/admin/users/${id}/role`, { role }).then((r) => r.data);

export const listerContenus = (params) => g("/echanges", params);
export const modifierContenu = (id, donnees) => p(`/echanges/${id}`, donnees);
export const supprimerContenuForum = (id) => api.delete(`/admin/echanges/${id}`).then((r) => r.data);

export const listerProjets = (params) => g("/projets", params);
export const modifierProjet = (id, donnees) => p(`/projets/${id}`, donnees);
export const supprimerProjet = (id) => d(`/projets/${id}`);
