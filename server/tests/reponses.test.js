// Répondre à un message : citation, réponse en privé, règles de canal, câblage : node --test tests/reponses.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { citationDe, citationExterne, parentValide, reponseA } = require('../src/services/reponses');

const A = 'a'.repeat(24); const B = 'b'.repeat(24);
const parent = { _id: A, type: 'message', contenu: 'Salut tout le monde', auteur_id: { _id: B, pseudo: 'amy' }, metadata: { canal: 'stack:react' } };

test('citationDe : auteur, aperçu court, image et vocal sans texte', () => {
  assert.deepStrictEqual(citationDe(parent), { id: A, externe: false, auteur: { id: B, pseudo: 'amy' }, type: 'texte', texte: 'Salut tout le monde' });
  assert.strictEqual(citationDe({ ...parent, contenu: 'x'.repeat(200) }).texte.length, 80);
  assert.strictEqual(citationDe({ ...parent, contenu: '', image_url: '/uploads/images/a.webp' }).type, 'image');
  assert.strictEqual(citationDe({ ...parent, contenu: '', audio_url: '/uploads/a.webm' }).type, 'audio');
  assert.strictEqual(citationDe({ ...parent, auteur_id: null }).auteur, null);
  assert.strictEqual(citationDe(null), null);
});

test('parentValide : seulement un message du même canal', () => {
  assert.strictEqual(parentValide(parent, 'stack:react'), true);
  assert.strictEqual(parentValide(parent, 'stack:python'), false);
  assert.strictEqual(parentValide({ ...parent, type: 'post' }, 'stack:react'), false);
  assert.strictEqual(parentValide(null, 'stack:react'), false);
});

test('citationExterne : nettoyée, types connus, texte coupé, refus du vide', () => {
  assert.deepStrictEqual(citationExterne({ pseudo: ' amy ', type: 'texte', texte: ' Salut ' }), { pseudo: 'amy', type: 'texte', texte: 'Salut' });
  assert.strictEqual(citationExterne({ pseudo: 'amy', type: 'texte', texte: 'x'.repeat(500) }).texte.length, 80);
  assert.deepStrictEqual(citationExterne({ pseudo: 'amy', type: 'image', texte: 'ignoré' }), { pseudo: 'amy', type: 'image', texte: '' });
  assert.strictEqual(citationExterne({ pseudo: 'amy', type: 'bizarre', texte: 'ok' }).type, 'texte');
  [null, 'x', {}, { pseudo: '', texte: 'a' }, { pseudo: 'amy', type: 'texte', texte: '  ' }].forEach((c) => assert.strictEqual(citationExterne(c), null));
});

test('reponseA : citation du même canal, citation copiée, sinon rien', () => {
  const doc = { parent_id: A, metadata: { canal: 'stack:react' } };
  assert.strictEqual(reponseA(doc, { [A]: parent }, 'stack:react').auteur.pseudo, 'amy');
  assert.strictEqual(reponseA(doc, { [A]: parent }, 'stack:python'), null); // autre canal : jamais de fuite
  assert.strictEqual(reponseA(doc, {}, 'stack:react'), null);
  const ext = reponseA({ metadata: { canal: 'prive:x', citation: { pseudo: 'amy', type: 'texte', texte: 'Salut' } } }, {}, 'prive:x');
  assert.deepStrictEqual(ext, { id: null, externe: true, auteur: { id: null, pseudo: 'amy' }, type: 'texte', texte: 'Salut' });
  assert.strictEqual(reponseA({ metadata: {} }, {}, 'stack:react'), null);
});

test('câblage : socket, historique, notification', () => {
  const lire = (p) => fs.readFileSync(path.join(__dirname, '..', 'src', p), 'utf8');
  assert.match(lire('communication/sockets.js'), /reponse_a/);
  assert.match(lire('communication/sockets.js'), /notifierReponse/);
  assert.match(lire('communication/chat.routes.js'), /reponseA\(/);
  assert.match(lire('communication/notifications/notifier.js'), /'reponse_chat'/);
});
