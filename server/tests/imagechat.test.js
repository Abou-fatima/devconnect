// Images jointes au chat : adresses acceptées et propriété de l'image (sans base de données) : node --test tests/imagechat.test.js
const test = require('node:test');
const assert = require('node:assert');
const { formeUrlValide, imageDe } = require('../src/services/imagesChat');

test('adresse : fichier local ou Cloudinary seulement', () => {
  assert.strictEqual(formeUrlValide('/uploads/images/abc123-def.webp'), true);
  assert.strictEqual(formeUrlValide('https://res.cloudinary.com/demo/image/upload/v1/devconnect/x.jpg'), true);
});

test('adresse : tout le reste est refusé', () => {
  for (const u of ['', null, undefined, 42, '/uploads/audio/x.webm', '/uploads/images/../../etc/passwd', '/uploads/images/a/b.png',
    'http://res.cloudinary.com/x/y.jpg', 'https://exemple.com/x.png', 'javascript:alert(1)', `/uploads/images/${'a'.repeat(600)}`]) {
    assert.strictEqual(formeUrlValide(u), false, String(u).slice(0, 40));
  }
});

test('propriété : l’image doit être un dépôt « chat » de la personne', async () => {
  let requete;
  const Depot = { findOne: (q) => { requete = q; return { select: () => ({ lean: async () => (q.proprietaire_id === 'u1' ? { _id: 1 } : null) }) }; } };
  assert.strictEqual(await imageDe('/uploads/images/x.webp', 'u1', { Depot }), '/uploads/images/x.webp');
  assert.deepStrictEqual([requete.type_fichier, requete.cible_type], ['image', 'chat']);
  assert.strictEqual(await imageDe('/uploads/images/x.webp', 'autre', { Depot }), undefined);
});

test('propriété : une adresse invalide ne touche pas la base', async () => {
  const Depot = { findOne: () => { throw new Error('ne doit pas être appelée'); } };
  assert.strictEqual(await imageDe('https://exemple.com/x.png', 'u1', { Depot }), undefined);
});
