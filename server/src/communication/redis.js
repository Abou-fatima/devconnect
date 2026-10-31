const Redis = require('ioredis');
const env = require('../config/env');

// Deux clients Redis (pub / sub) exigés par l'adapter Socket.IO.
// Sans REDIS_URL : retourne null et le serveur tourne en mémoire (un seul processus, utile en dev).
function createRedisClients() {
  if (!env.redisUrl) return null;
  const options = { maxRetriesPerRequest: null, retryStrategy: (essai) => Math.min(essai * 500, 10000) };
  const pub = new Redis(env.redisUrl, options);
  const sub = pub.duplicate();

  // Redis injoignable : un seul message explicite (au lieu d'une ligne à chaque tentative), puis un message au retour.
  let signale = false;
  const surErreur = (e) => {
    if (signale) return;
    signale = true;
    console.error(`[redis] injoignable (${e.code || e.message}). Les tentatives continuent en silence. Pour travailler sans Redis, laisse REDIS_URL vide dans .env.`);
  };
  const surPret = () => { if (signale) { signale = false; console.log('[redis] connexion rétablie'); } };
  [pub, sub].forEach((c) => { c.on('error', surErreur); c.on('ready', surPret); });
  return { pub, sub };
}

module.exports = { createRedisClients };
