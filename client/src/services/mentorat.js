import api from "./api";

export const listerMentors = (params) =>
  api.get("/mentorat/mentors", { params }).then((r) => r.data);
export const demanderMentorat = (body) =>
  api.post("/mentorat/demandes", body).then((r) => r.data.demande);
export const mesDemandes = () => api.get("/mentorat/mes").then((r) => r.data); // { recues, envoyees, a_traiter }
export const accepterDemande = (id) =>
  api.put(`/mentorat/demandes/${id}/accepter`).then((r) => r.data.demande);
export const refuserDemande = (id) =>
  api.put(`/mentorat/demandes/${id}/refuser`).then((r) => r.data.demande);
export const terminerAccompagnement = (id) =>
  api.put(`/mentorat/demandes/${id}/terminer`).then((r) => r.data.demande);
export const retirerDemande = (id) =>
  api.delete(`/mentorat/demandes/${id}`).then((r) => r.data);
