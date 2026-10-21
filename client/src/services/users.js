import api from './api';

export const getOptions = () => api.get('/meta/options').then((r) => r.data);
export const getUser = (id) => api.get(`/users/${id}`).then((r) => r.data);
export const searchUsers = (params) => api.get('/users', { params }).then((r) => r.data);
export const updateMe = (body) => api.put('/users/me', body).then((r) => r.data.utilisateur);
