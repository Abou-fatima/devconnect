// Tests de logique pure de l'espace projet (sans MongoDB) : npm run test:logic
const test = require('node:test');
const assert = require('node:assert');
const s = require('../src/services/taches');
const v = require('../src/validators/taches');

const P = 'a'.repeat(24), M = 'b'.repeat(24), X = 'c'.repeat(24);
const projet = { _id: 'd'.repeat(24), titre: 'DevConnect', porteur_id: P, membres: [{ user_id: M, role: 'frontend' }] };

test('équipe : porteur et membres seulement', () => {
  assert.ok(s.peutTravailler(projet, P));
  assert.ok(s.peutTravailler(projet, M));
  assert.ok(!s.peutTravailler(projet, X));
  assert.ok(!s.peutTravailler(projet, null));
  assert.ok(s.estPorteur(projet, P) && !s.estPorteur(projet, M));
});

test('assignation : seulement à quelqu’un du projet, ou à personne', () => {
  assert.strictEqual(s.verifierAssigne(projet, null), null);
  assert.strictEqual(s.verifierAssigne(projet, M), null);
  assert.strictEqual(s.verifierAssigne(projet, X).status, 400);
});

test('capacité : 100 tâches au maximum', () => {
  assert.strictEqual(s.verifierCapacite(99), null);
  assert.strictEqual(s.verifierCapacite(100).status, 409);
});

test('validation : création et modification', () => {
  assert.strictEqual(v.creer.parse({ titre: '  Maquette  ' }).titre, 'Maquette');
  assert.throws(() => v.creer.parse({ titre: 'a' }));
  assert.throws(() => v.creer.parse({ titre: 'ok ok', statut: 'fini' }));
  assert.throws(() => v.creer.parse({ titre: 'ok ok', assigne_a: 'abc' }));
  assert.strictEqual(v.creer.parse({ titre: 'ok ok', assigne_a: null }).assigne_a, null);
  assert.strictEqual(v.modifier.parse({ statut: 'en_cours' }).statut, 'en_cours');
  assert.throws(() => v.modifier.parse({}));
  assert.strictEqual(v.modifier.parse({ assigne_a: null }).assigne_a, null);
});

test('format client : statut inconnu ramené à « à faire »', () => {
  assert.deepStrictEqual(s.serialiserTache({ _id: 't1', titre: 'x', statut: 'bizarre' }), { id: 't1', titre: 'x', statut: 'a_faire', assigne_a: null });
  assert.strictEqual(s.serialiserTache({ _id: 't1', titre: 'x', statut: 'termine', assigne_a: M }).assigne_a, M);
});

test('notification : kind « tache », pas d’auto-notification, jamais d’exception', async () => {
  const appels = [];
  const deps = { envoyer: async (o) => { appels.push(o); return { id: 'n' }; } };
  const tache = { _id: 't1', titre: 'Maquette' };
  await s.notifierTache({ destinataireId: M, acteur: { _id: P, pseudo: 'alpha' }, projet, tache }, deps);
  assert.strictEqual(appels[0].kind, 'tache');
  assert.strictEqual(appels[0].message, 'alpha t’a confié la tâche « Maquette » (DevConnect)');
  assert.deepStrictEqual(appels[0].sujet, { type: 'projet', id: projet._id, tache: 't1' });
  assert.strictEqual(await s.notifierTache({ destinataireId: P, acteur: { _id: P, pseudo: 'alpha' }, projet, tache }, deps), null);
  const erreur = console.error; console.error = () => {};
  try { assert.strictEqual(await s.notifierTache({ destinataireId: M, acteur: { _id: P }, projet, tache }, { envoyer: async () => { throw new Error('x'); } }), null); }
  finally { console.error = erreur; }
  assert.strictEqual(appels.length, 1);
});
