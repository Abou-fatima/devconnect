// Stockage des codes OTP : Redis si disponible, sinon mémoire (suffisant en dev / un seul processus).
const crypto = require('crypto');
const env = require('./env');

const memory = new Map(); // cle -> { hash, expire, essais }
let redis = null;

if (env.redisUrl) {
  const Redis = require('ioredis');
  redis = new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
  redis.on('error', () => {}); // on retombe sur la mémoire, pas de crash
  redis.connect().catch(() => { redis = null; });
}

const hash = (code) => crypto.createHash('sha256').update(`${env.jwtSecret}:${code}`).digest('hex');
const key = (cible) => `otp:${cible}`;
const MAX_ESSAIS = 5;

async function save(cible, code) {
  const record = JSON.stringify({ hash: hash(code), essais: 0 });
  if (redis && redis.status === 'ready') {
    await redis.set(key(cible), record, 'EX', env.otpTtl);
    return;
  }
  memory.set(key(cible), { hash: hash(code), essais: 0, expire: Date.now() + env.otpTtl * 1000 });
}

// Retourne true si le code est bon (et le consomme), false sinon.
async function verify(cible, code) {
  const k = key(cible);
  const expected = hash(code);

  if (redis && redis.status === 'ready') {
    const raw = await redis.get(k);
    if (!raw) return false;
    const rec = JSON.parse(raw);
    if (rec.essais >= MAX_ESSAIS) { await redis.del(k); return false; }
    if (safeEqual(rec.hash, expected)) { await redis.del(k); return true; }
    rec.essais += 1;
    const ttl = await redis.ttl(k);
    await redis.set(k, JSON.stringify(rec), 'EX', ttl > 0 ? ttl : env.otpTtl);
    return false;
  }

  const rec = memory.get(k);
  if (!rec || rec.expire < Date.now()) { memory.delete(k); return false; }
  if (rec.essais >= MAX_ESSAIS) { memory.delete(k); return false; }
  if (safeEqual(rec.hash, expected)) { memory.delete(k); return true; }
  rec.essais += 1;
  return false;
}

function safeEqual(a, b) {
  const A = Buffer.from(a); const B = Buffer.from(b);
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

// Nettoyage périodique de la mémoire
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memory) if (v.expire < now) memory.delete(k);
}, 60 * 1000).unref();

const generateCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

module.exports = { save, verify, generateCode };
