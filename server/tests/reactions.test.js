// Réactions emoji : règles (ajout, retrait, remplacement, une par personne), regroupement, câblage : node --test tests/reactions.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { EMOJIS, emojiValide, appliquer, grouper } = require('../src/services/reactions');

const A = 'a'.repeat(24); const B = 'b'.repeat(24);

test('emojiValide : seulement les six emojis proposés', () => {
  assert.deepStrictEqual(EMOJIS, ['👍', '❤️', '😂', '😮', '😢', '🙏']);
  EMOJIS.forEach((e) => assert.ok(emojiValide(e)));
  ['🔥', '', 'x', null, undefined, 42, '👍👍'].forEach((e) => assert.strictEqual(emojiValide(e), false));
});

test('appliquer : ajoute une première réaction', () => {
  const r = appliquer([], A, '👍');
  assert.strictEqual(r.action, 'ajoutee');
  assert.deepStrictEqual(r.reactions, [{ user_id: A, emoji: '👍' }]);
});

test('appliquer : même emoji = retire la réaction', () => {
  const r = appliquer([{ user_id: A, emoji: '👍' }], A, '👍');
  assert.strictEqual(r.action, 'retiree');
  assert.deepStrictEqual(r.reactions, []);
});

test('appliquer : un autre emoji remplace (une seule réaction par personne)', () => {
  const r = appliquer([{ user_id: A, emoji: '👍' }, { user_id: B, emoji: '👍' }], A, '❤️');
  assert.strictEqual(r.action, 'changee');
  assert.strictEqual(r.reactions.filter((x) => x.user_id === A).length, 1);
  assert.strictEqual(r.reactions.find((x) => x.user_id === A).emoji, '❤️');
  assert.strictEqual(r.reactions.find((x) => x.user_id === B).emoji, '👍'); // l'autre personne n'est pas touchée
});

test('appliquer : ne modifie pas le tableau reçu et accepte des ObjectId (texte)', () => {
  const avant = [{ user_id: { toString: () => A }, emoji: '😮' }];
  const copie = JSON.stringify(avant);
  appliquer(avant, A, '😮');
  assert.strictEqual(JSON.stringify(avant), copie);
  assert.deepStrictEqual(appliquer(undefined, A, '🙏').reactions, [{ user_id: A, emoji: '🙏' }]);
});

test('grouper : par emoji, dans l’ordre des six, sans groupe vide', () => {
  const g = grouper([
    { user_id: A, emoji: '🙏' }, { user_id: B, emoji: '👍' }, { user_id: A.replace(/a/g, 'c'), emoji: '👍' }
  ]);
  assert.deepStrictEqual(g.map((x) => x.emoji), ['👍', '🙏']);
  assert.strictEqual(g[0].users.length, 2);
  assert.deepStrictEqual(grouper([]), []);
  assert.deepStrictEqual(grouper(null), []);
});

test('câblage : événement socket, modèle, historique et notification', () => {
  const lire = (p) => fs.readFileSync(path.join(__dirname, '..', 'src', p), 'utf8');
  assert.match(lire('communication/sockets.js'), /socket\.on\('reaction'/);
  assert.match(lire('models/Echange.js'), /reactions/);
  assert.match(lire('communication/chat.routes.js'), /reactions: grouper/);
  assert.match(lire('communication/notifications/notifier.js'), /'reaction'/);
});
