const securite = [{ bearerAuth: [] }];

module.exports = {
  '/api/audio/statut': {
    get: { tags: ['Audio'], summary: 'La transcription Whisper est-elle active ?', responses: { 200: { description: '{ transcription: boolean, max_octets }' } } }
  },
  '/api/audio': {
    post: {
      tags: ['Audio'], summary: 'Envoyer une note vocale (et la transcrire)', security: securite,
      description: 'Formats : webm, ogg, mp4/m4a, mp3, wav (10 Mo max). Le format est vérifié sur le contenu. L’adresse renvoyée se met dans `audio_url` d’un message du chat ou d’une réponse. La transcription est `null` si Whisper n’est pas configuré ou indisponible : le vocal est enregistré dans tous les cas.',
      requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' }, langue: { type: 'string', enum: ['fr', 'en'] }, transcrire: { type: 'string', enum: ['true', 'false'] } } } } } },
      responses: { 201: { description: '{ audio_url, transcription, transcription_active, mime_type, taille }' }, 400: { description: 'Aucun fichier ou format non reconnu' }, 401: { description: 'Non connecté' }, 413: { description: 'Fichier trop gros' }, 429: { description: 'Trop d’envois' } }
    }
  }
};
