const id = (name, description) => ({
  in: "path",
  name,
  required: true,
  schema: { type: "string" },
  description,
});
const securite = [{ bearerAuth: [] }];
const json = (schema) => ({ "application/json": { schema } });
const statut = { type: "string", enum: ["a_faire", "en_cours", "termine"] };

module.exports = {
  "/api/projets/{id}/taches": {
    get: {
      tags: ["Espace projet"],
      summary: "Tableau de tâches du projet",
      security: securite,
      description: "Réservé au porteur et aux membres.",
      parameters: [id("id", "Identifiant du projet")],
      responses: {
        200: { description: "{ taches: [{ id, titre, statut, assigne_a }] }" },
        403: { description: "Pas dans l’équipe" },
        404: { description: "Projet introuvable" },
      },
    },
    post: {
      tags: ["Espace projet"],
      summary: "Ajouter une tâche",
      security: securite,
      description:
        "Si la tâche est confiée à quelqu’un, il est notifié. 100 tâches au maximum par projet.",
      parameters: [id("id", "Identifiant du projet")],
      requestBody: {
        required: true,
        content: json({
          type: "object",
          required: ["titre"],
          properties: {
            titre: { type: "string", minLength: 2, maxLength: 120 },
            assigne_a: { type: "string", nullable: true },
            statut,
          },
        }),
      },
      responses: {
        201: { description: "Tâche créée" },
        400: { description: "Données invalides ou assigné hors équipe" },
        403: { description: "Pas dans l’équipe" },
        409: { description: "Limite de tâches atteinte" },
      },
    },
  },
  "/api/projets/{id}/taches/{tid}": {
    put: {
      tags: ["Espace projet"],
      summary: "Modifier, déplacer ou assigner une tâche",
      security: securite,
      parameters: [
        id("id", "Identifiant du projet"),
        id("tid", "Identifiant de la tâche"),
      ],
      requestBody: {
        required: true,
        content: json({
          type: "object",
          properties: {
            titre: { type: "string" },
            statut,
            assigne_a: { type: "string", nullable: true },
          },
        }),
      },
      responses: {
        200: { description: "Tâche mise à jour" },
        403: { description: "Pas dans l’équipe" },
        404: { description: "Tâche introuvable" },
      },
    },
    delete: {
      tags: ["Espace projet"],
      summary: "Supprimer une tâche",
      security: securite,
      parameters: [
        id("id", "Identifiant du projet"),
        id("tid", "Identifiant de la tâche"),
      ],
      responses: {
        200: { description: "Tâche supprimée" },
        403: { description: "Pas dans l’équipe" },
        404: { description: "Tâche introuvable" },
      },
    },
  },
};
