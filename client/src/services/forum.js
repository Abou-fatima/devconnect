import api from './api';

export const listerQuestions = (params) => api.get('/echanges/posts', { params }).then((r) => r.data);
export const detailQuestion = (id) => api.get(`/echanges/posts/${id}`).then((r) => r.data);
export const creerQuestion = (body) => api.post('/echanges/posts', body).then((r) => r.data.post);
export const repondre = (postId, contenu) => api.post(`/echanges/posts/${postId}/reponses`, { contenu }).then((r) => r.data.reponse);
export const commenter = (id, contenu) => api.post(`/echanges/${id}/commentaires`, { contenu }).then((r) => r.data.commentaire);
export const modifier = (id, body) => api.put(`/echanges/${id}`, body).then((r) => r.data.echange);
export const supprimer = (id) => api.delete(`/echanges/${id}`).then((r) => r.data);
export const voter = (id, valeur) => api.post(`/echanges/${id}/vote`, { valeur }).then((r) => r.data);
export const accepter = (reponseId) => api.post(`/echanges/reponses/${reponseId}/accepter`).then((r) => r.data);
export const retirerAcceptation = (reponseId) => api.delete(`/echanges/reponses/${reponseId}/accepter`).then((r) => r.data);
export const signaler = (id, motif) => api.post(`/echanges/${id}/signaler`, { motif }).then((r) => r.data);
export const suivre = (postId) => api.post(`/echanges/posts/${postId}/suivre`).then((r) => r.data);
export const nePlusSuivre = (postId) => api.delete(`/echanges/posts/${postId}/suivre`).then((r) => r.data);
export const listerTags = (params) => api.get('/echanges/tags', { params }).then((r) => r.data.data);
export const classementDevs = (params) => api.get('/classement', { params }).then((r) => r.data);
export const classementPays = () => api.get('/classement/pays').then((r) => r.data.data);
