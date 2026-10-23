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
    responses: { 200: { description: 'Messages (ordre chronologique dans la page)', content: json(ref('HistoriqueChat')) }, 400: err('Canal invalide'), 401: err('Non connecté'), 403: err('Conversation privée interdite') } } }
};

const schemas = {
  MessageChat: { type: 'object', properties: {
    id: { type: 'string' }, canal: { type: 'string' }, contenu: { type: 'string', nullable: true }, audio_url: { type: 'string', nullable: true },
    transcription: { type: 'string', nullable: true }, created_at: { type: 'string', format: 'date-time' },
    auteur: { type: 'object', properties: { id: { type: 'string' }, pseudo: { type: 'string' } } } } },
  HistoriqueChat: { type: 'object', properties: {
    canal: { type: 'string' }, page: { type: 'integer' }, limit: { type: 'integer' }, a_suivre: { type: 'boolean' },
    messages: { type: 'array', items: ref('MessageChat') } } }
};

module.exports = (openapi) => {
  if (!openapi.tags.some((t) => t.name === 'Chat')) openapi.tags.push({ name: 'Chat' });
  Object.assign(openapi.paths, paths);
  Object.assign(openapi.components.schemas, schemas);
};
