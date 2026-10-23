const openapi = require('./openapi');
const projetsPaths = require('./paths/projets');
const projetsSchemas = require('./schemas/projets');
const uploadPaths = require('./paths/upload');

module.exports = {
  ...openapi,
  tags: [
    ...openapi.tags,
    {
      name: 'Projets',
      description: 'Gestion des projets collaboratifs',
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
  },
  components: {
    ...openapi.components,
    schemas: {
      ...openapi.components.schemas,
      ...projetsSchemas,
    },
  },
};
