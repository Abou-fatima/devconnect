import api from './api';

export const historique = (canal, page = 1, limit = 30) =>
  api.get(`/chat/historique/${encodeURIComponent(canal)}`, { params: { page, limit } }).then((r) => r.data);

export const listerNotifications = (params) => api.get('/notifications', { params }).then((r) => r.data);
export const marquerNotificationLue = (id) => api.put(`/notifications/${id}/lue`).then((r) => r.data);
