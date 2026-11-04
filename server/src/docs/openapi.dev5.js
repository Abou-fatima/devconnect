const openapi = require("./openapi");
const projetsPaths = require("./paths/projets");
const projetsSchemas = require("./schemas/projets");
const uploadPaths = require("./paths/upload");
const collabPaths = require("./paths/candidatures");
const mentoratPaths = require("./paths/mentorat");
const tachesPaths = require("./paths/taches");
const audioPaths = require("./paths/audio");
const salonsPaths = require("./paths/salons");

module.exports = {
  ...openapi,
  tags: [
    ...openapi.tags,
    {
      name: "Projets",
      description: "Gestion des projets collaboratifs",
    },
    {
      name: "Collaboration",
      description: "Candidatures, équipe et rôles d’un projet",
    },
    {
      name: "Audio",
      description: "Notes vocales et transcription Whisper",
    },
    {
      name: "Espace projet",
      description: "Tableau de tâches de l’équipe d’un projet",
    },
    {
      name: "Mentorat",
      description: "Trouver un mentor, demander et suivre un accompagnement",
    },
    {
      name: "Salons",
      description:
        "Salons de discussion créés par les utilisateurs (publics ou sur invitation)",
    },
    {
      name: "Upload",
      description: "Envoi et stockage des fichiers",
    },
  ],
  paths: {
    ...openapi.paths,
    ...projetsPaths,
    ...uploadPaths,
    ...collabPaths,
    ...mentoratPaths,
    ...tachesPaths,
    ...audioPaths,
    ...salonsPaths,
  },
  components: {
    ...openapi.components,
    schemas: {
      ...openapi.components.schemas,
      ...projetsSchemas,
    },
  },
};
