module.exports = {

'/api/projets': {
  get: {
    tags: ['Projets'],
    summary: 'Lister et rechercher les projets',
    parameters: [
      {
        in: 'query',
        name: 'q',
        schema: {
          type: 'string',
          maxLength: 100,
        },
        description: 'Rechercher dans le titre, la description ou la catégorie',
      },
      {
        in: 'query',
        name: 'stack',
        schema: { type: 'string' },
        description: 'Filtrer par technologie',
      },
      {
        in: 'query',
        name: 'statut',
        schema: {
          type: 'string',
          enum: ['idee', 'en_cours', 'termine'],
        },
        description: 'Filtrer par statut',
      },
      {
        in: 'query',
        name: 'page',
        schema: { type: 'integer', minimum: 1, default: 1 },
        description: 'Numéro de page',
      },
      {
        in: 'query',
        name: 'limit',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 50,
          default: 10,
        },
        description: 'Nombre de projets par page',
      },
    ],
    responses: {
      200: { description: 'Liste des projets récupérée' },
      400: { description: 'Paramètres de recherche ou pagination invalides' },
    },
  },

  post: {
    tags: ['Projets'],
    summary: 'Créer un projet',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ProjetCreation' },
        },
      },
    },
    responses: {
      201: { description: 'Projet créé' },
      401: { description: 'Authentification requise' },
    },
  },
},


  '/api/projets/tendances': {
    get: {
      tags: ['Projets'],
      summary: 'Lister les projets tendance',
      description:
        'Classe les projets par likes, vues et récence. Le score est calculé automatiquement.',
      parameters: [
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            default: 10,
          },
          description: 'Nombre maximal de projets à retourner',
        },
      ],
      responses: {
        200: {
          description: 'Projets tendance récupérés, classés par score',
        },
        400: {
          description: 'Limite invalide',
        },
      },
    },
  },


  '/api/projets/{id}': {
    get: {
      tags: ['Projets'],
      summary: 'Consulter un projet',
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        200: { description: 'Projet récupéré' },
        404: { description: 'Projet introuvable' },
      },
    },
    put: {
      tags: ['Projets'],
      summary: 'Modifier un projet',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ProjetModification' },
          },
        },
      },
      responses: {
        200: { description: 'Projet modifié' },
        403: { description: 'Action réservée au propriétaire' },
      },
    },
    delete: {
      tags: ['Projets'],
      summary: 'Supprimer un projet',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        200: { description: 'Projet supprimé' },
        403: { description: 'Action réservée au propriétaire' },
      },
    },
  },

  '/api/projets/{id}/like': {
    post: {
      tags: ['Projets'],
      summary: 'Aimer un projet',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        200: { description: 'Opération effectuée' },
      },
    },
  },

  '/api/projets/{id}/commentaires': {
    get: {
      tags: ['Projets'],
      summary: 'Lister les commentaires d’un projet',
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
          description: 'Identifiant MongoDB du projet',
        },
      ],
      responses: {
        200: {
          description: 'Commentaires récupérés',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  commentaires: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        _id: { type: 'string' },
                        contenu: { type: 'string' },
                        created_at: {
                          type: 'string',
                          format: 'date-time',
                        },
                        auteur_id: {
                          oneOf: [
                            { type: 'string' },
                            {
                              type: 'object',
                              properties: {
                                _id: { type: 'string' },
                                pseudo: { type: 'string' },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        404: { description: 'Projet introuvable' },
      },
    },

    post: {
      tags: ['Projets'],
      summary: 'Ajouter un commentaire à un projet',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
          description: 'Identifiant MongoDB du projet',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['contenu'],
              properties: {
                contenu: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 5000,
                  example: 'Très intéressant comme projet !',
                },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Commentaire créé avec succès' },
        400: { description: 'Contenu invalide' },
        401: { description: 'Authentification requise' },
        404: { description: 'Projet introuvable' },
      },
    },
  },
};
