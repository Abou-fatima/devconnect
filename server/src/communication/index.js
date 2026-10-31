// Module communication : temps réel (chat), notifications, fichiers et notes vocales.
// Les fichiers principaux de l'application n'y font appel qu'en une ligne chacun.
const { createAdapter } = require('@socket.io/redis-adapter');
const Echange = require('../models/Echange');
const { createRedisClients } = require('./redis');
const attachSockets = require('./sockets');
const notifier = require('./notifications/notifier');

// Appelé par src/index.js : Redis + chat Socket.IO.
function initSockets(io) {
  const redis = createRedisClients();
  if (redis) io.adapter(createAdapter(redis.pub, redis.sub));
  else console.warn('[socket] REDIS_URL absent : adapter mémoire (un seul processus)');

  // Index de l'historique du chat (créé ici pour ne pas modifier le modèle Echange).
  // Mongoose met la commande en attente jusqu'à la connexion MongoDB.
  Echange.collection.createIndex({ 'metadata.canal': 1, created_at: -1 })
    .catch((e) => console.error('[communication] index metadata.canal :', e.message));

  notifier.setIo(io); // permet à notifier.envoyer() de pousser en temps réel
  attachSockets(io);
}

// Appelé par src/app.js : routes REST du module communication.
function mountRoutes(app) {
  app.use('/api/chat', require('./chat.routes'));
  app.use('/api/notifications', require('./notifications/notifications.routes'));
  // L'envoi d'images est dans routes/upload.js. Les notes vocales (transcription Whisper) viendront ici : /api/audio.
}

// Appelé par src/app.js AVANT swagger : ajoute la doc du module communication à l'objet OpenAPI.
function extendOpenapi(openapi) {
  require('./openapi')(openapi);
}

module.exports = { initSockets, mountRoutes, extendOpenapi, notifier };
