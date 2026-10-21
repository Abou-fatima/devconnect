// Documentation Swagger du forum, des votes, du classement et de l'administration.
// Fusionnée dans l'objet OpenAPI principal (voir app.js), comme le module communication.
const ref = (n) => ({ $ref: `#/components/schemas/${n}` });
const json = (schema) => ({ 'application/json': { schema } });
const err = (description) => ({ description, content: json(ref('Erreur')) });
const ok = (description, schema) => ({ description, content: json(schema) });
const secured = [{ bearerAuth: [] }];
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Identifiant MongoDB (24 caractères)' };
const pageParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 50 } }
];
const body = (props, required = []) => ({ required: true, content: json({ type: 'object', required, properties: props }) });
const E = '/api/echanges';

const paths = {
  [`${E}/posts`]: {
    post: { tags: ['Forum'], summary: 'Poser une question (F-11)', security: secured,
      requestBody: body({ titre: { type: 'string', example: 'Comment utiliser useEffect ?' }, contenu: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' }, example: ['react', 'hooks'], description: '5 maximum, en minuscules' },
        audio_url: { type: 'string', example: '/uploads/audio/x.webm', description: 'Optionnel : note vocale envoyée via /api/audio' } }, ['titre', 'contenu']),
      responses: { 201: ok('Question créée', { type: 'object', properties: { post: ref('Post') } }), 400: err('Données invalides'), 401: err('Non connecté') } },
    get: { tags: ['Forum'], summary: 'Liste des questions (filtres, tri, pagination)',
      parameters: [
        { name: 'tag', in: 'query', schema: { type: 'string' }, example: 'react' },
        { name: 'statut', in: 'query', schema: { type: 'string', enum: ['ouvert', 'resolu'] } },
        { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Mot du titre' },
        { name: 'auteur', in: 'query', schema: { type: 'string' } },
        { name: 'tri', in: 'query', schema: { type: 'string', enum: ['recent', 'votes', 'sans_reponse', 'actifs'], default: 'recent' } },
        ...pageParams],
      responses: { 200: ok('Questions (contenu raccourci dans `extrait`)', ref('ListePosts')), 400: err('Paramètres invalides') } }
  },
  [`${E}/posts/{id}`]: { get: { tags: ['Forum'], summary: 'Détail d\'une question : réponses et commentaires (+1 vue)',
    description: 'Avec un token, chaque contenu contient `mon_vote` (1, -1 ou 0) et le post contient `suivi`.', parameters: [idParam],
    responses: { 200: ok('Question complète', ref('PostDetail')), 400: err('Identifiant invalide'), 404: err('Question introuvable') } } },
  [`${E}/posts/{id}/reponses`]: { post: { tags: ['Forum'], summary: 'Répondre à une question (F-13)', security: secured, parameters: [idParam],
    requestBody: body({ contenu: { type: 'string' }, audio_url: { type: 'string' } }, ['contenu']),
    responses: { 201: ok('Réponse créée', { type: 'object', properties: { reponse: ref('Post') } }), 400: err('Données invalides'), 401: err('Non connecté'), 404: err('Question introuvable') } } },
  [`${E}/{id}/commentaires`]: { post: { tags: ['Forum'], summary: 'Commenter un post ou une réponse (F-14)', security: secured, parameters: [idParam],
    requestBody: body({ contenu: { type: 'string', maxLength: 1000 } }, ['contenu']),
    responses: { 201: ok('Commentaire créé', { type: 'object', properties: { commentaire: ref('Post') } }), 400: err('Données invalides'), 401: err('Non connecté'), 404: err('Post ou réponse introuvable') } } },
  [`${E}/{id}`]: {
    put: { tags: ['Forum'], summary: 'Modifier son post, sa réponse ou son commentaire (auteur uniquement)', security: secured, parameters: [idParam],
      requestBody: body({ titre: { type: 'string' }, contenu: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }),
      responses: { 200: ok('Contenu modifié', { type: 'object', properties: { echange: ref('Post') } }), 400: err('Données invalides'), 403: err('Pas l\'auteur'), 404: err('Introuvable') } },
    delete: { tags: ['Forum'], summary: 'Supprimer son contenu et ce qui en dépend (auteur, modérateur ou admin)', security: secured, parameters: [idParam],
      responses: { 200: ok('Supprimé', { type: 'object', properties: { ok: { type: 'boolean' }, supprimes: { type: 'integer' } } }), 403: err('Pas l\'auteur'), 404: err('Introuvable') } }
  },
  [`${E}/{id}/vote`]: { post: { tags: ['Forum'], summary: 'Voter pour un post ou une réponse (F-15)',
    description: 'Revoter la même valeur retire le vote ; l\'autre valeur l\'inverse. Un seul vote par utilisateur et par contenu. Interdit sur son propre contenu.',
    security: secured, parameters: [idParam], requestBody: body({ valeur: { type: 'integer', enum: [1, -1] } }, ['valeur']),
    responses: { 200: ok('Vote enregistré', ref('ResultatVote')), 400: err('Valeur invalide'), 403: err('Vote sur son propre contenu'), 404: err('Introuvable'), 409: err('Vote déjà enregistré') } } },
  [`${E}/reponses/{id}/accepter`]: {
    post: { tags: ['Forum'], summary: 'Accepter une réponse (F-16) : auteur de la question uniquement', security: secured, parameters: [idParam],
      responses: { 200: ok('Réponse acceptée', { type: 'object', properties: { ok: { type: 'boolean' }, reponse_acceptee_id: { type: 'string' } } }), 403: err('Pas l\'auteur de la question'), 404: err('Introuvable') } },
    delete: { tags: ['Forum'], summary: 'Retirer l\'acceptation d\'une réponse', security: secured, parameters: [idParam],
      responses: { 200: { description: 'Acceptation retirée' }, 403: err('Pas l\'auteur de la question'), 409: err('Réponse non acceptée') } }
  },
  [`${E}/tags`]: { get: { tags: ['Forum'], summary: 'Tags les plus utilisés (F-17) ; `q` pour l\'autocomplétion',
    parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 30, maximum: 100 } }],
    responses: { 200: ok('Tags', { type: 'object', properties: { data: { type: 'array', items: ref('TagCompte') } } }) } } },
  [`${E}/{id}/signaler`]: { post: { tags: ['Forum'], summary: 'Signaler un contenu (F-21)', security: secured, parameters: [idParam],
    requestBody: body({ motif: { type: 'string', example: 'Spam' } }, ['motif']),
    responses: { 201: { description: 'Signalement enregistré' }, 403: err('Contenu personnel'), 404: err('Introuvable'), 409: err('Déjà signalé') } } },
  [`${E}/posts/{id}/suivre`]: {
    post: { tags: ['Forum'], summary: 'Suivre une question (F-22)', security: secured, parameters: [idParam],
      responses: { 200: ok('Suivi', { type: 'object', properties: { suivi: { type: 'boolean' } } }), 404: err('Question introuvable') } },
    delete: { tags: ['Forum'], summary: 'Ne plus suivre une question', security: secured, parameters: [idParam],
      responses: { 200: ok('Plus suivi', { type: 'object', properties: { suivi: { type: 'boolean' } } }), 404: err('Question introuvable') } }
  },
  '/api/classement': { get: { tags: ['Classement'], summary: 'Classement des développeurs par réputation (F-09), filtre pays',
    parameters: [{ name: 'pays', in: 'query', schema: { type: 'string' }, example: 'GN' }, ...pageParams],
    responses: { 200: ok('Classement', ref('ClassementDevs')) } } },
  '/api/classement/pays': { get: { tags: ['Classement'], summary: 'Classement des pays (F-43)',
    responses: { 200: ok('Pays classés par réputation totale', { type: 'object', properties: { data: { type: 'array', items: ref('ClassementPays') } } }) } } },
  '/api/admin/signalements': { get: { tags: ['Admin'], summary: 'Contenus signalés (modérateur ou admin)', security: secured, parameters: pageParams,
    responses: { 200: ok('Signalements', ref('ListePosts')), 401: err('Non connecté'), 403: err('Accès refusé') } } },
  '/api/admin/echanges/{id}': { delete: { tags: ['Admin'], summary: 'Supprimer un contenu (modérateur ou admin)', security: secured, parameters: [idParam],
    responses: { 200: { description: 'Supprimé' }, 403: err('Accès refusé'), 404: err('Introuvable') } } },
  '/api/admin/echanges/{id}/signalements/classer': { put: { tags: ['Admin'], summary: 'Classer les signalements d\'un contenu (le garder)', security: secured, parameters: [idParam],
    responses: { 200: { description: 'Signalements effacés' }, 403: err('Accès refusé'), 404: err('Introuvable') } } },
  '/api/admin/users/{id}/role': { put: { tags: ['Admin'], summary: 'Changer le rôle d\'un utilisateur (admin uniquement)', security: secured, parameters: [idParam],
    requestBody: body({ role: { type: 'string', enum: ['dev', 'moderateur', 'admin'] } }, ['role']),
    responses: { 200: { description: 'Rôle modifié' }, 400: err('Rôle invalide ou son propre compte'), 403: err('Réservé aux admins'), 404: err('Utilisateur introuvable') } } }
};

const auteur = { type: 'object', nullable: true, properties: { id: { type: 'string' }, pseudo: { type: 'string' }, photo: { type: 'string', nullable: true },
  reputation: { type: 'integer' }, badges: { type: 'array', items: { type: 'string' } }, pays: { type: 'string', nullable: true } } };
const Post = { type: 'object', properties: {
  id: { type: 'string' }, type: { type: 'string', enum: ['post', 'reponse', 'commentaire'] }, auteur, titre: { type: 'string' }, contenu: { type: 'string' },
  extrait: { type: 'string', description: 'Dans les listes, à la place de `contenu`' }, audio_url: { type: 'string', nullable: true }, transcription: { type: 'string', nullable: true },
  tags: { type: 'array', items: { type: 'string' } }, statut: { type: 'string', enum: ['ouvert', 'resolu'] }, nb_votes: { type: 'integer' }, nb_reponses: { type: 'integer' },
  nb_vues: { type: 'integer' }, nb_suiveurs: { type: 'integer' }, reponse_acceptee_id: { type: 'string', nullable: true }, acceptee: { type: 'boolean' },
  mon_vote: { type: 'integer', enum: [-1, 0, 1] }, suivi: { type: 'boolean' }, parent_id: { type: 'string', nullable: true },
  created_at: { type: 'string', format: 'date-time' }, derniere_activite: { type: 'string', format: 'date-time' } } };
const pagination = { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, pages: { type: 'integer' } };

const schemas = {
  Post,
  ListePosts: { type: 'object', properties: { data: { type: 'array', items: ref('Post') }, ...pagination } },
  PostDetail: { type: 'object', properties: { post: ref('Post'), reponses: { type: 'array', items: ref('Post') }, commentaires: { type: 'array', items: ref('Post') } } },
  ResultatVote: { type: 'object', properties: { nb_votes: { type: 'integer' }, mon_vote: { type: 'integer', enum: [-1, 0, 1] } } },
  TagCompte: { type: 'object', properties: { tag: { type: 'string' }, nb_posts: { type: 'integer' } } },
  ClassementDevs: { type: 'object', properties: { data: { type: 'array', items: { type: 'object', properties: { rang: { type: 'integer' }, id: { type: 'string' }, pseudo: { type: 'string' }, reputation: { type: 'integer' }, pays: { type: 'string' }, badges: { type: 'array', items: { type: 'string' } } } } }, ...pagination } },
  ClassementPays: { type: 'object', properties: { rang: { type: 'integer' }, pays: { type: 'string' }, nb_devs: { type: 'integer' }, reputation_totale: { type: 'integer' } } }
};

module.exports = (openapi) => {
  ['Forum', 'Classement', 'Admin'].forEach((name) => { if (!openapi.tags.some((t) => t.name === name)) openapi.tags.push({ name }); });
  Object.assign(openapi.paths, paths);
  Object.assign(openapi.components.schemas, schemas);
};
