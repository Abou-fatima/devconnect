const Redis = require('ioredis');
const env = require('../config/env');

// Deux clients Redis (pub / sub) exigés par l'adapter Socket.IO.
// Sans REDIS_URL : retourne null et le serveur tourne en mémoire (un seul processus, utile en dev).
function createRedisClients() {
  if (!env.redisUrl) return null;
  const pub = new Redis(env.redisUrl, { maxRetriesPerRequest: null });
  const sub = pub.duplicate();
  [pub, sub].forEach((c) => c.on('error', (e) => console.error('[redis]', e.message)));
  return { pub, sub };
}

module.exports = { createRedisClients };
