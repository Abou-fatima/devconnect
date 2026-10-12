// Tests de logique pure (sans MongoDB ni serveur) : npm run test:logic
const test = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'test-secret-0123456789abcdef';
process.env.OTP_TTL_SECONDS = '60';
process.env.REDIS_URL = ''; // pas de connexion Redis pendant les tests (sinon le processus reste ouvert)

const v = require('../src/validators/auth');
const u = require('../src/validators/users');
const { publicUser, privateUser } = require('../src/utils/serialize');
const otp = require('../src/config/otpStore');

test('inscription valide, email normalisé', () => {
  const r = v.register.parse({ pseudo: 'alpha_bah', email: '  Alpha@Mail.COM ', mot_de_passe: 'Azerty123', pays: 'gn' });
  assert.strictEqual(r.email, 'alpha@mail.com');
  assert.strictEqual(r.pays, 'GN');
});

test('inscription refusée : mot de passe faible, pseudo court, téléphone mal formé', () => {
  assert.throws(() => v.register.parse({ pseudo: 'alpha', email: 'a@b.co', mot_de_passe: 'abcdefgh' }));
  assert.throws(() => v.register.parse({ pseudo: 'al', email: 'a@b.co', mot_de_passe: 'Azerty123' }));
  assert.throws(() => v.register.parse({ pseudo: 'alpha', email: 'a@b.co', mot_de_passe: 'Azerty123', telephone: '620000000' }));
});

test('OTP : un seul canal accepté', () => {
  assert.ok(v.otpSend.parse({ telephone: '+224620000000' }));
  assert.throws(() => v.otpSend.parse({}));
  assert.throws(() => v.otpSend.parse({ telephone: '+224620000000', email: 'a@b.co' }));
  assert.throws(() => v.otpVerify.parse({ email: 'a@b.co', code: '12ab56' }));
});

test('mise à jour du profil : stacks dédupliquées en minuscules, champs inconnus ignorés', () => {
  const r = u.updateProfile.parse({ stacks: ['React', 'react', ' Node '], role: 'admin', profil: { niveau: 'avance' } });
  assert.deepStrictEqual(r.stacks, ['react', 'node']);
  assert.strictEqual(r.role, undefined); // pas d'élévation de privilège
  assert.throws(() => u.updateProfile.parse({ profil: { niveau: 'dieu' } }));
});

test('recherche : valeurs par défaut, stack en liste, limite plafonnée', () => {
  const r = u.search.parse({ stack: 'React, node', pays: 'gn' });
  assert.deepStrictEqual(r.stack, ['react', 'node']);
  assert.strictEqual(r.pays, 'GN');
  assert.strictEqual(r.page, 1);
  assert.strictEqual(r.limit, 20);
  assert.throws(() => u.search.parse({ limit: '500' }));
});

test('sérialisation : jamais de hash, email/téléphone seulement en privé', () => {
  const doc = { _id: 'abc', pseudo: 'x', email: 'x@y.z', telephone: '+224620000000', mot_de_passe_hash: 'HASH', reputation: 3 };
  const pub = publicUser(doc);
  assert.strictEqual(pub.email, undefined);
  assert.strictEqual(pub.mot_de_passe_hash, undefined);
  const priv = privateUser(doc);
  assert.strictEqual(priv.email, 'x@y.z');
  assert.strictEqual(priv.mot_de_passe_hash, undefined);
  assert.strictEqual(priv.a_un_mot_de_passe, true);
});

test('OTP : bon code accepté une seule fois, mauvais code refusé, blocage après 5 essais', async () => {
  const cible = '+224620111111';
  const code = otp.generateCode();
  assert.match(code, /^\d{6}$/);
  await otp.save(cible, code);
  assert.strictEqual(await otp.verify(cible, '000000' === code ? '111111' : '000000'), false);
  assert.strictEqual(await otp.verify(cible, code), true);
  assert.strictEqual(await otp.verify(cible, code), false); // déjà consommé

  await otp.save(cible, code);
  for (let i = 0; i < 5; i += 1) await otp.verify(cible, '000000' === code ? '111111' : '000000');
  assert.strictEqual(await otp.verify(cible, code), false); // bloqué même avec le bon code
});

test('OpenAPI : chaque $ref pointe vers un schéma existant', () => {
  const spec = require('../src/docs/openapi');
  const refs = [...JSON.stringify(spec).matchAll(/#\/components\/schemas\/(\w+)/g)].map((m) => m[1]);
  refs.forEach((n) => assert.ok(spec.components.schemas[n], `schéma manquant : ${n}`));
});