
module.exports = {
  '/api/upload': {
    post: {
      tags: ['Upload'],
      summary: 'Envoyer une image (projet ou photo de profil)',
      description:
        "L'image est réduite à 1600 px au maximum, convertie en WebP (métadonnées retirées) puis enregistrée sur le serveur (ou sur Cloudinary si UPLOAD_DRIVER=cloudinary). Pour un projet, seuls le propriétaire et les membres peuvent ajouter une image. Avec cible_type=user, l'image devient tout de suite la photo de profil de l'utilisateur connecté (profil.photo est mis à jour) et remplace la précédente.",
      operationId: 'uploadImageProjet',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: {
                  type: 'string',
                  format: 'binary',
                  description: 'Image JPEG, PNG, WebP ou GIF (5 Mo maximum)',
                },
                cible_type: {
                  type: 'string',
                  enum: ['projet', 'user'],
                  default: 'projet',
                  description: 'projet (défaut) ou user (photo de profil)',
                },
                cible_id: {
                  type: 'string',
                  description: 'Identifiant MongoDB du projet (obligatoire pour cible_type=projet, ignoré pour user)',
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
                      url: { type: 'string', example: '/uploads/images/lq3k2x-9f8e7d6c5b4a3210.webp', description: 'Adresse du fichier WebP' },
                      nom_original: { type: 'string' },
                      taille_octets: { type: 'number' },
                      mime_type: { type: 'string', example: 'image/webp' },
                      created_at: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Image absente, fichier qui n'est pas une image lisible, cible_type invalide ou identifiant incorrect",
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
        429: {
          description: "Trop d'images envoyées (30 par 10 minutes)",
        },
        503: {
          description: 'Compression indisponible (module sharp absent) ou Cloudinary non configuré',
        },
        500: {
          description: 'Erreur interne ou erreur du service de stockage',
        },
      },
    },
  },
};
