module.exports = {
  Projet: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      titre: { type: 'string' },
      description: { type: 'string' },
      stack: {
        type: 'array',
        items: { type: 'string' },
      },
      statut: {
        type: 'string',
        enum: ['idee', 'en_cours', 'termine'],
      },
      nb_vues: { type: 'integer' },
      nb_likes: { type: 'integer' },
    },
  },

  ProjetCreation: {
    type: 'object',
    required: ['titre'],
    properties: {
      titre: { type: 'string', minLength: 3, maxLength: 150 },
      description: { type: 'string', maxLength: 5000 },
      stack: {
        type: 'array',
        items: { type: 'string' },
      },
      roles_recherches: {
        type: 'array',
        items: { type: 'string' },
      },
      statut: {
        type: 'string',
        enum: ['idee', 'en_cours', 'termine'],
      },
      categorie: { type: 'string' },
      liens: {
        type: 'object',
        properties: {
          github: { type: 'string' },
          demo: { type: 'string' },
          video: { type: 'string' },
        },
      },
    },
  },

  ProjetModification: {
    type: 'object',
    properties: {
      titre: { type: 'string', minLength: 3, maxLength: 150 },
      description: { type: 'string', maxLength: 5000 },
      stack: {
        type: 'array',
        items: { type: 'string' },
      },
      roles_recherches: {
        type: 'array',
        items: { type: 'string' },
      },
      statut: {
        type: 'string',
        enum: ['idee', 'en_cours', 'termine'],
      },
      categorie: { type: 'string' },
    },
  },
};