import api from "./api";

export const listerMesSalons = () =>
  api.get("/salons/mes").then((r) => r.data.data);
export const listerSalonsPublics = (params) =>
  api.get("/salons/publics", { params }).then((r) => r.data);
export const getSalon = (id) => api.get(`/salons/${id}`).then((r) => r.data);
export const creerSalon = (body) =>
  api.post("/salons", body).then((r) => r.data.salon);
export const modifierSalon = (id, body) =>
  api.put(`/salons/${id}`, body).then((r) => r.data.salon);
export const rejoindreSalon = (id) =>
  api.post(`/salons/${id}/rejoindre`).then((r) => r.data.salon);
export const quitterSalon = (id) =>
  api.post(`/salons/${id}/quitter`).then((r) => r.data);
export const supprimerSalon = (id) =>
  api.delete(`/salons/${id}`).then((r) => r.data);
export const retirerMembre = (id, userId) =>
  api.delete(`/salons/${id}/membres/${userId}`).then((r) => r.data);
export const nouveauCode = (id) =>
  api.post(`/salons/${id}/code`).then((r) => r.data.code);
export const apercuInvitation = (code) =>
  api
    .get(`/salons/invitation/${encodeURIComponent(code)}`)
    .then((r) => r.data.salon);
export const rejoindreParCode = (code) =>
  api
    .post(`/salons/invitation/${encodeURIComponent(code)}/rejoindre`)
    .then((r) => r.data.salon);
