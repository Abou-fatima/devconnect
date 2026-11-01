const openapi = require('./openapi');
const projetsPaths = require('./paths/projets');
const projetsSchemas = require('./schemas/projets');
const uploadPaths = require('./paths/upload');
const collabPaths = require('./paths/candidatures');
const mentoratPaths = require('./paths/mentorat');
const tachesPaths = require('./paths/taches');

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
      name: 'Espace projet',
      description: 'Tableau de tâches de l’équipe d’un projet',
    },
    {
      name: 'Mentorat',
      description: 'Trouver un mentor, demander et suivre un accompagnement',
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
    ...mentoratPaths,
    ...tachesPaths,
  },
  components: {
    ...openapi.components,
    schemas: {
      ...openapi.components.schemas,
      ...projetsSchemas,
    },
  },
};
