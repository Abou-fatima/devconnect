const id = (name, description) => ({
  in: "path",
  name,
  required: true,
  schema: { type: "string" },
  description,
});
const securite = [{ bearerAuth: [] }];
const json = (schema) => ({ "application/json": { schema } });

module.exports = {
  "/api/projets/{id}/candidatures": {
    post: {
      tags: ["Collaboration"],
      summary: "Se candidater pour rejoindre un projet",
      security: securite,
      description:
        "Le porteur reçoit une notification. Une seule candidature en attente par projet ; 3 candidatures au maximum par personne et par projet.",
      parameters: [id("id", "Identifiant du projet")],
      requestBody: {
        required: true,
        content: json({
          type: "object",
          required: ["message"],
          properties: {
            message: {
              type: "string",
              minLength: 10,
              maxLength: 1000,
              example: "Je connais React et Node, disponible le soir.",
            },
            role: { type: "string", maxLength: 100, example: "frontend" },
          },
        }),
      },
      responses: {
        201: { description: "Candidature enregistrée" },
        400: { description: "Message invalide, ou porteur du projet" },
        401: { description: "Non connecté" },
        409: {
          description:
            "Déjà membre, déjà candidat, projet terminé ou trop de tentatives",
        },
      },
    },
    get: {
      tags: ["Collaboration"],
      summary: "Lister les candidatures d’un projet (porteur uniquement)",
      security: securite,
      parameters: [
        id("id", "Identifiant du projet"),
        {
          in: "query",
          name: "statut",
          schema: {
            type: "string",
            enum: ["en_attente", "acceptee", "refusee"],
          },
        },
      ],
      responses: {
        200: { description: "Liste avec le profil public des candidats" },
        403: { description: "Réservé au porteur" },
      },
    },
  },
  "/api/candidatures/{id}/accepter": {
    put: {
      tags: ["Collaboration"],
      summary: "Accepter une candidature : le candidat rejoint l’équipe",
      security: securite,
      parameters: [id("id", "Identifiant de la candidature")],
      requestBody: {
        content: json({
          type: "object",
          properties: {
            role: {
              type: "string",
              maxLength: 100,
              description:
                "Rôle donné (par défaut : celui demandé, sinon « membre »)",
            },
          },
        }),
      },
      responses: {
        200: { description: "Candidature acceptée, candidat notifié" },
        403: { description: "Réservé au porteur" },
        409: { description: "Déjà traitée" },
      },
    },
  },
  "/api/candidatures/{id}/refuser": {
    put: {
      tags: ["Collaboration"],
      summary: "Refuser une candidature",
      security: securite,
      parameters: [id("id", "Identifiant de la candidature")],
      responses: {
        200: { description: "Candidature refusée, candidat notifié" },
        403: { description: "Réservé au porteur" },
        409: { description: "Déjà traitée" },
      },
    },
  },
  "/api/candidatures/{id}": {
    delete: {
      tags: ["Collaboration"],
      summary: "Retirer sa candidature (tant qu’elle est en attente)",
      security: securite,
      parameters: [id("id", "Identifiant de la candidature")],
      responses: {
        200: { description: "Candidature retirée" },
        403: { description: "Ce n’est pas la tienne" },
        409: { description: "Déjà traitée" },
      },
    },
  },
  "/api/projets/{id}/membres/{userId}": {
    put: {
      tags: ["Collaboration"],
      summary: "Changer le rôle d’un membre (porteur)",
      security: securite,
      parameters: [
        id("id", "Identifiant du projet"),
        id("userId", "Identifiant du membre"),
      ],
      requestBody: {
        required: true,
        content: json({
          type: "object",
          required: ["role"],
          properties: {
            role: { type: "string", maxLength: 100, example: "lead frontend" },
          },
        }),
      },
      responses: {
        200: { description: "Rôle mis à jour" },
        403: { description: "Réservé au porteur" },
        404: { description: "Membre introuvable" },
      },
    },
    delete: {
      tags: ["Collaboration"],
      summary: "Retirer un membre (porteur) ou quitter l’équipe (soi-même)",
      security: securite,
      parameters: [
        id("id", "Identifiant du projet"),
        id("userId", "Identifiant du membre"),
      ],
      responses: {
        200: { description: "Équipe mise à jour" },
        403: { description: "Ni porteur ni le membre concerné" },
        404: { description: "Membre introuvable" },
      },
    },
  },
};
