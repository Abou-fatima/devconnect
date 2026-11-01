const id = (name, description) => ({ in: 'path', name, required: true, schema: { type: 'string' }, description });
const securite = [{ bearerAuth: [] }];
const json = (schema) => ({ 'application/json': { schema } });

module.exports = {
  '/api/mentorat/mentors': {
    get: {
      tags: ['Mentorat'], summary: 'Lister les développeurs qui offrent du mentorat',
      description: 'Les mieux notés d’abord. Avec un token, chaque mentor indique ta relation actuelle avec lui (`ma_relation`).',
      parameters: [
        { in: 'query', name: 'q', schema: { type: 'string' }, description: 'Recherche par pseudo' },
        { in: 'query', name: 'stack', schema: { type: 'string' }, description: 'Technologies séparées par des virgules' },
        { in: 'query', name: 'pays', schema: { type: 'string' }, description: 'Code pays à 2 lettres' },
        { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1 } }
      ],
      responses: { 200: { description: 'Liste paginée, avec places restantes (5 accompagnés au maximum par mentor)' } }
    }
  },
  '/api/mentorat/demandes': {
    post: {
      tags: ['Mentorat'], summary: 'Demander à être accompagné', security: securite,
      description: 'Le mentor est notifié. 3 demandes en attente au maximum par personne.',
      requestBody: { required: true, content: json({ type: 'object', required: ['mentor_id', 'sujet', 'message'], properties: { mentor_id: { type: 'string' }, sujet: { type: 'string', example: 'Apprendre React' }, message: { type: 'string', minLength: 10, maxLength: 1000 } } }) },
      responses: { 201: { description: 'Demande enregistrée' }, 404: { description: 'Mentor introuvable' }, 409: { description: 'Pas mentor, déjà accompagné, demande déjà en attente ou trop de demandes' } }
    }
  },
  '/api/mentorat/mes': {
    get: {
      tags: ['Mentorat'], summary: 'Mes demandes reçues et envoyées', security: securite,
      responses: { 200: { description: '{ recues, envoyees, a_traiter }' } }
    }
  },
  '/api/mentorat/demandes/{id}/accepter': {
    put: { tags: ['Mentorat'], summary: 'Accepter une demande (mentor)', security: securite, parameters: [id('id', 'Identifiant de la demande')],
      responses: { 200: { description: 'Accompagnement commencé, demandeur notifié' }, 403: { description: 'Réservé au mentor' }, 409: { description: 'Déjà traitée, ou 5 accompagnés déjà en cours' } } }
  },
  '/api/mentorat/demandes/{id}/refuser': {
    put: { tags: ['Mentorat'], summary: 'Refuser une demande (mentor)', security: securite, parameters: [id('id', 'Identifiant de la demande')],
      responses: { 200: { description: 'Demande refusée, demandeur notifié' }, 403: { description: 'Réservé au mentor' }, 409: { description: 'Déjà traitée' } } }
  },
  '/api/mentorat/demandes/{id}/terminer': {
    put: { tags: ['Mentorat'], summary: 'Terminer un accompagnement (mentor ou accompagné)', security: securite, parameters: [id('id', 'Identifiant de la demande')],
      responses: { 200: { description: 'Accompagnement terminé, une place est libérée' }, 403: { description: 'Tu ne fais pas partie de cet accompagnement' }, 409: { description: 'Pas en cours' } } }
  },
  '/api/mentorat/demandes/{id}': {
    delete: { tags: ['Mentorat'], summary: 'Retirer sa demande (tant qu’elle est en attente)', security: securite, parameters: [id('id', 'Identifiant de la demande')],
      responses: { 200: { description: 'Demande retirée' }, 403: { description: 'Ce n’est pas la tienne' }, 409: { description: 'Déjà traitée' } } }
  }
};
