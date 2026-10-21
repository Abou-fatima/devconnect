
module.exports = {
  '/api/upload': {
    post: {
      tags: ['Upload'],
      summary: 'Envoyer une image vers un projet',
      description:
        'Envoie une image sur Cloudinary et enregistre ses informations dans MongoDB. Seuls le propriétaire et les membres du projet peuvent ajouter une image.',
      operationId: 'uploadImageProjet',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file', 'cible_id'],
              properties: {
                file: {
                  type: 'string',
                  format: 'binary',
                  description: 'Image JPEG, PNG, WebP ou GIF (5 Mo maximum)',
                },
                cible_id: {
                  type: 'string',
                  description: 'Identifiant MongoDB du projet',
                  example: '507f1f77bcf86cd799439011',
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Image envoyée et enregistrée avec succès',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  data: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      proprietaire_id: { type: 'string' },
                      cible_type: { type: 'string', example: 'projet' },
                      cible_id: { type: 'string' },
                      type_fichier: { type: 'string', example: 'image' },
                      url: { type: 'string', format: 'uri' },
                      nom_original: { type: 'string' },
                      taille_octets: { type: 'number' },
                      mime_type: { type: 'string' },
                      created_at: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: 'Image absente, format invalide ou identifiant incorrect',
        },
        401: {
          description: 'Authentification requise ou jeton invalide',
        },
        403: {
          description: 'Utilisateur non autorisé à ajouter une image au projet',
        },
        404: {
          description: 'Projet introuvable',
        },
        413: {
          description: 'Image supérieure à la taille maximale autorisée',
        },
        500: {
          description: 'Erreur interne ou erreur du service de stockage',
        },
      },
    },
  },
};
