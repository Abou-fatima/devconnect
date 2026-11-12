import api from "./api";

export const listerSignalements = (params) =>
  api.get("/admin/signalements", { params }).then((r) => r.data);
export const classerSignalement = (id) =>
  api.put(`/admin/echanges/${id}/signalements/classer`).then((r) => r.data);
export const supprimerContenu = (id) =>
  api.delete(`/admin/echanges/${id}`).then((r) => r.data);
export const statistiques = () => api.get("/admin/stats").then((r) => r.data);
