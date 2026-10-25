// Tests de logique pure des notifications (sans MongoDB ni serveur) : npm run test:communication
const test = require('node:test');
const assert = require('node:assert');
const { KINDS, envoyer, serialiser, extraireMentions } = require('../notifications/notifier');

const A = 'a'.repeat(24);
const B = 'b'.repeat(24);

test('mentions : sans doublon, sans email, 5 au maximum', () => {
  assert.deepStrictEqual(extraireMentions('Salut @amina_dev et @moussa_bah, encore @amina_dev'), ['amina_dev', 'moussa_bah']);
  assert.deepStrictEqual(extraireMentions('écris à contact@devconnect.com'), []);
  assert.deepStrictEqual(extraireMentions('@ab trop court'), []);
  assert.strictEqual(extraireMentions('@aaa @bbb @ccc @ddd @eee @fff @ggg').length, 5);
  assert.deepStrictEqual(extraireMentions(42), []);
});

test('envoyer : kind inconnu ou identifiants invalides = erreur de programmation', async () => {
  await assert.rejects(envoyer({ destinataireId: A, acteurId: B, kind: 'inconnu', message: 'x' }), /kind inconnu/);
  await assert.rejects(envoyer({ destinataireId: 'abc', acteurId: B, kind: 'vote', message: 'x' }), /identifiants invalides/);
});

test('envoyer : pas d’auto-notification', async () => {
  assert.strictEqual(await envoyer({ destinataireId: A, acteurId: A, kind: 'vote', message: 'x' }), null);
});

test('kinds : ceux de F-20 (réponse, mention, vote) et de la collaboration', () => {
  ['reponse', 'mention', 'vote', 'candidature', 'mentorat'].forEach((k) => assert.ok(KINDS.includes(k), k));
});

test('serialiser : format client', () => {
  const d = new Date();
  const n = serialiser({ _id: 'n1', contenu: 'Salut', created_at: d, metadata: { kind: 'vote', lue: false, sujet: { type: 'post', id: 'p1' } } }, { _id: A, pseudo: 'amina_dev' });
  assert.deepStrictEqual(n, { id: 'n1', kind: 'vote', message: 'Salut', lue: false, sujet: { type: 'post', id: 'p1' }, acteur: { id: A, pseudo: 'amina_dev' }, created_at: d });
});
