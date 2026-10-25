// Tests de logique pure des correctifs projets / sécurité (sans MongoDB) : npm run test:logic
const test = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'test-secret-0123456789abcdef';
process.env.REDIS_URL = '';

const u = require('../src/validators/users');
const c = require('../src/validators/common');

test('liens du profil : seulement http(s), jamais javascript:', () => {
  const ok = u.updateProfile.parse({ profil: { liens: { github: 'https://github.com/alpha', site: 'http://exemple.com' } } });
  assert.strictEqual(ok.profil.liens.github, 'https://github.com/alpha');
  assert.throws(() => u.updateProfile.parse({ profil: { liens: { site: 'javascript:alert(1)' } } }));
  assert.throws(() => u.updateProfile.parse({ profil: { photo: 'data:text/html,<script>x</script>' } }));
  assert.throws(() => u.updateProfile.parse({ profil: { liens: { github: 'ftp://x.com/a' } } }));
});

test('un lien vide efface le champ (autorisé)', () => {
  assert.strictEqual(u.updateProfile.parse({ profil: { liens: { site: '' } } }).profil.liens.site, '');
});

test('urlHttp : refuse les schémas dangereux', () => {
  const v = c.urlHttp(100);
  assert.ok(v.parse('https://devconnect.africa/x?y=1'));
  ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/plain,x', 'file:///etc/passwd', 'ftp://a.b'].forEach((x) => assert.throws(() => v.parse(x), x));
});

test('configuration : valeur Mongo par défaut correcte, Cloudinary désactivé sans clés', () => {
  delete process.env.MONGO_URI;
  delete process.env.CLOUDINARY_CLOUD_NAME;
  const env = require('../src/config/env');
  assert.match(env.mongoUri, /^mongodb(\+srv)?:\/\//);
  assert.deepStrictEqual(Object.keys(env.cloudinary), ['cloudName', 'apiKey', 'apiSecret']);
});

test('erreur multer : fichier trop gros -> 413, autre erreur d\'envoi -> 400', () => {
  const { errorHandler } = require('../src/middleware/error');
  const run = (err) => {
    let out = {};
    const res = { status(s) { out.status = s; return this; }, json(b) { out.body = b; return this; } };
    errorHandler(err, {}, res, () => {});
    return out;
  };
  const gros = Object.assign(new Error('File too large'), { name: 'MulterError', code: 'LIMIT_FILE_SIZE' });
  const autre = Object.assign(new Error('Unexpected field'), { name: 'MulterError', code: 'LIMIT_UNEXPECTED_FILE' });
  assert.strictEqual(run(gros).status, 413);
  assert.strictEqual(run(autre).status, 400);
});
