// Documentation Swagger du module communication. Fusionnée dans l'objet OpenAPI principal (voir index.js).
const ref = (n) => ({ $ref: `#/components/schemas/${n}` });
const json = (schema) => ({ 'application/json': { schema } });
const err = (description) => ({ description, content: json(ref('Erreur')) });
const secured = [{ bearerAuth: [] }];

const paths = {
  '/api/chat/historique/{canal}': { get: { tags: ['Chat'], summary: "Historique d'un canal (F-18) — canal : stack:react, ville:conakry ou prive:<idA>_<idB>", security: secured,
    parameters: [
      { name: 'canal', in: 'path', required: true, schema: { type: 'string' }, example: 'stack:react' },
      { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
      { name: 'limit', in: 'query', schema: { type: 'integer', default: 30, maximum: 100 } }],
    responses: { 200: { description: 'Messages (ordre chronologique dans la page)', content: json(ref('HistoriqueChat')) }, 400: err('Canal invalide'), 401: err('Non connecté'), 403: err('Conversation privée interdite') } } },
  '/api/notifications': { get: { tags: ['Notifications'], summary: 'Mes notifications (F-20), plus récentes d’abord', security: secured,
    parameters: [
      { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
      { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 50 } },
      { name: 'non_lues', in: 'query', schema: { type: 'boolean' }, description: 'true : seulement les non lues' }],
    responses: { 200: { description: 'Liste paginée', content: json(ref('ListeNotifications')) }, 401: err('Non connecté') } } },
  '/api/notifications/{id}/lue': { put: { tags: ['Notifications'], summary: 'Marquer ma notification comme lue (F-20)', security: secured,
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Marquée comme lue' }, 400: err('Identifiant invalide'), 401: err('Non connecté'), 404: err('Notification introuvable') } } }
};

const schemas = {
  MessageChat: { type: 'object', properties: {
    id: { type: 'string' }, canal: { type: 'string' }, contenu: { type: 'string', nullable: true }, audio_url: { type: 'string', nullable: true },
    transcription: { type: 'string', nullable: true }, created_at: { type: 'string', format: 'date-time' },
    auteur: { type: 'object', properties: { id: { type: 'string' }, pseudo: { type: 'string' } } } } },
  HistoriqueChat: { type: 'object', properties: {
    canal: { type: 'string' }, page: { type: 'integer' }, limit: { type: 'integer' }, a_suivre: { type: 'boolean' },
    messages: { type: 'array', items: ref('MessageChat') } } },
  Notification: { type: 'object', properties: {
    id: { type: 'string' }, kind: { type: 'string', enum: ['reponse', 'reponse_acceptee', 'mention', 'vote', 'candidature', 'candidature_acceptee', 'candidature_refusee', 'mentorat'] },
    message: { type: 'string', nullable: true }, lue: { type: 'boolean' }, sujet: { type: 'object', nullable: true, additionalProperties: true },
    created_at: { type: 'string', format: 'date-time' }, acteur: { type: 'object', nullable: true, properties: { id: { type: 'string' }, pseudo: { type: 'string' } } } } },
  ListeNotifications: { type: 'object', properties: {
    page: { type: 'integer' }, limit: { type: 'integer' }, a_suivre: { type: 'boolean' }, non_lues: { type: 'integer' },
    notifications: { type: 'array', items: ref('Notification') } } }
};

module.exports = (openapi) => {
  ['Chat', 'Notifications'].forEach((n) => { if (!openapi.tags.some((t) => t.name === n)) openapi.tags.push({ name: n }); });
  Object.assign(openapi.paths, paths);
  Object.assign(openapi.components.schemas, schemas);
};
