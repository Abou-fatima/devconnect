const id = {
  in: "path",
  name: "id",
  required: true,
  schema: { type: "string" },
  description: "Identifiant du salon",
};
const securite = [{ bearerAuth: [] }];
const json = (schema) => ({ "application/json": { schema } });
const code = {
  in: "path",
  name: "code",
  required: true,
  schema: { type: "string" },
  description: "Code du lien d’invitation",
};

module.exports = {
  "/api/salons": {
    post: {
      tags: ["Salons"],
      summary: "Créer un salon",
      security: securite,
      description:
        "Le créateur en devient le propriétaire. 10 salons créés et 50 rejoints au maximum par personne. Le chat du salon utilise le canal `salon:<id>` (Socket.IO et `/api/chat/historique`).",
      requestBody: {
        required: true,
        content: json({
          type: "object",
          required: ["nom"],
          properties: {
            nom: { type: "string", minLength: 3, maxLength: 50 },
            description: { type: "string", maxLength: 200 },
            visibilite: {
              type: "string",
              enum: ["public", "invitation"],
              default: "public",
            },
          },
        }),
      },
      responses: {
        201: { description: "{ salon } avec `code` (lien d’invitation)" },
        400: { description: "Données invalides" },
        409: { description: "Limite atteinte" },
      },
    },
  },
  "/api/salons/mes": {
    get: {
      tags: ["Salons"],
      summary: "Mes salons (les plus actifs d’abord)",
      security: securite,
      responses: { 200: { description: "{ data: [salon] }" } },
    },
  },
  "/api/salons/publics": {
    get: {
      tags: ["Salons"],
      summary: "Salons publics à découvrir",
      security: securite,
      parameters: [
        { in: "query", name: "q", schema: { type: "string" } },
        { in: "query", name: "page", schema: { type: "integer" } },
        {
          in: "query",
          name: "limit",
          schema: { type: "integer", maximum: 30 },
        },
      ],
      responses: {
        200: { description: "{ data, page, limit, total, pages }" },
      },
    },
  },
  "/api/salons/invitation/{code}": {
    get: {
      tags: ["Salons"],
      summary: "Aperçu d’un salon via un lien d’invitation",
      security: securite,
      parameters: [code],
      responses: {
        200: { description: "{ salon } sans code ni membres" },
        404: { description: "Lien invalide ou remplacé" },
      },
    },
  },
  "/api/salons/invitation/{code}/rejoindre": {
    post: {
      tags: ["Salons"],
      summary: "Rejoindre un salon avec le lien",
      security: securite,
      parameters: [code],
      responses: {
        200: { description: "{ salon }" },
        404: { description: "Lien invalide" },
        409: { description: "Salon complet ou limite atteinte" },
      },
    },
  },
  "/api/salons/{id}": {
    get: {
      tags: ["Salons"],
      summary: "Détail d’un salon",
      security: securite,
      parameters: [id],
      description:
        "Membre : liste des membres et lien. Salon public non rejoint : aperçu. Salon sur invitation non rejoint : 403.",
      responses: {
        200: { description: "{ salon, membres? }" },
        403: { description: "Sur invitation" },
        404: { description: "Introuvable" },
      },
    },
    put: {
      tags: ["Salons"],
      summary: "Modifier nom, description, visibilité (propriétaire)",
      security: securite,
      parameters: [id],
      responses: {
        200: { description: "{ salon }" },
        403: { description: "Réservé au propriétaire" },
      },
    },
    delete: {
      tags: ["Salons"],
      summary: "Supprimer le salon et ses messages (propriétaire)",
      security: securite,
      parameters: [id],
      responses: {
        200: { description: "Supprimé" },
        403: { description: "Réservé au propriétaire" },
      },
    },
  },
  "/api/salons/{id}/rejoindre": {
    post: {
      tags: ["Salons"],
      summary: "Rejoindre un salon public",
      security: securite,
      parameters: [id],
      responses: {
        200: { description: "{ salon }" },
        403: { description: "Salon sur invitation" },
        409: { description: "Salon complet" },
      },
    },
  },
  "/api/salons/{id}/quitter": {
    post: {
      tags: ["Salons"],
      summary: "Quitter un salon",
      security: securite,
      parameters: [id],
      description:
        "Si le propriétaire part, le plus ancien membre le devient ; le dernier à partir supprime le salon.",
      responses: { 200: { description: "OK" } },
    },
  },
  "/api/salons/{id}/membres/{userId}": {
    delete: {
      tags: ["Salons"],
      summary: "Retirer un membre (propriétaire)",
      security: securite,
      parameters: [
        id,
        {
          in: "path",
          name: "userId",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Retiré" },
        403: { description: "Réservé au propriétaire" },
        404: { description: "Pas membre" },
      },
    },
  },
  "/api/salons/{id}/code": {
    post: {
      tags: ["Salons"],
      summary: "Nouveau lien d’invitation (l’ancien ne marche plus)",
      security: securite,
      parameters: [id],
      responses: {
        200: { description: "{ code }" },
        403: { description: "Réservé au propriétaire" },
      },
    },
  },
};
