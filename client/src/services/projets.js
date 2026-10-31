import api from './api';

export const listerProjets = (params) => api.get('/projets', { params }).then((r) => r.data);
