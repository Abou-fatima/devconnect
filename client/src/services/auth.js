import api from './api';

export const register = (body) => api.post('/auth/register', body).then((r) => r.data);
export const login = (body) => api.post('/auth/login', body).then((r) => r.data);
export const me = () => api.get('/auth/me').then((r) => r.data.utilisateur);
export const githubUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/github`;
