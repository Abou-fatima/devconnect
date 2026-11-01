const openapi = require('./openapi');
const projetsPaths = require('./paths/projets');
const projetsSchemas = require('./schemas/projets');
const uploadPaths = require('./paths/upload');
const collabPaths = require('./paths/candidatures');

module.exports = {
  ...openapi,
  tags: [
    ...openapi.tags,
    {
      name: 'Projets',
      description: 'Gestion des projets collaboratifs',
    },
    {
      name: 'Collaboration',
      description: 'Candidatures, équipe et rôles d’un projet',
    },
    {
      name: 'Upload',
      description: 'Envoi et stockage des fichiers',
    },
  ],
  paths: {
    ...openapi.paths,
    ...projetsPaths,
    ...uploadPaths,
    ...collabPaths,
  },
  components: {
    ...openapi.components,
    schemas: {
      ...openapi.components.schemas,
      ...projetsSchemas,
    },
  },
};
