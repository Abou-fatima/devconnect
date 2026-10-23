// Tests de logique pure du forum (sans MongoDB ni serveur) : npm run test:logic
const test = require('node:test');
const assert = require('node:assert');

const v = require('../src/validators/echanges');
const { BAREME, pointsVote, effetVote, badgesPour } = require('../src/services/bareme');

test('question valide : tags en minuscules, dédupliqués', () => {
  const r = v.creerPost.parse({ titre: 'Comment utiliser useEffect ?', contenu: 'Je ne comprends pas les dépendances.', tags: ['React', 'react', ' Hooks '] });
  assert.deepStrictEqual(r.tags, ['react', 'hooks']);
  assert.deepStrictEqual(v.creerPost.parse({ titre: 'Un titre correct', contenu: 'Un contenu assez long' }).tags, []);
});

test('question refusée : titre ou contenu trop court, trop de tags, audio hors /uploads', () => {
  assert.throws(() => v.creerPost.parse({ titre: 'abc', contenu: 'Un contenu assez long' }));
  assert.throws(() => v.creerPost.parse({ titre: 'Un titre correct', contenu: 'court' }));
  assert.throws(() => v.creerPost.parse({ titre: 'Un titre correct', contenu: 'Un contenu assez long', tags: ['a', 'b', 'c', 'd', 'e', 'f'] }));
  assert.throws(() => v.creerPost.parse({ titre: 'Un titre correct', contenu: 'Un contenu assez long', audio_url: 'http://evil.com/a.webm' }));
  assert.throws(() => v.creerPost.parse({ titre: 'Un titre correct', contenu: 'Un contenu assez long', audio_url: '/uploads/../secret' }));
  assert.ok(v.creerPost.parse({ titre: 'Un titre correct', contenu: 'Un contenu assez long', audio_url: '/uploads/audio/a1.webm' }));
});

test('modification : au moins un champ', () => {
  assert.throws(() => v.modifierPost.parse({}));
  assert.deepStrictEqual(v.modifierPost.parse({ tags: ['Node'] }).tags, ['node']);
});

test('vote : seulement 1 ou -1', () => {
  assert.strictEqual(v.vote.parse({ valeur: 1 }).valeur, 1);
  assert.strictEqual(v.vote.parse({ valeur: -1 }).valeur, -1);
  [0, 2, '1', null].forEach((x) => assert.throws(() => v.vote.parse({ valeur: x })));
});

test('listes : valeurs par défaut, plafonds, filtres invalides refusés', () => {
  const q = v.listePosts.parse({ tag: 'React', limit: '10' });
  assert.deepStrictEqual([q.tag, q.page, q.limit, q.tri], ['react', 1, 10, 'recent']);
  assert.throws(() => v.listePosts.parse({ limit: '500' }));
  assert.throws(() => v.listePosts.parse({ tri: 'au_hasard' }));
  assert.throws(() => v.listePosts.parse({ auteur: 'pas-un-id' }));
  assert.strictEqual(v.classement.parse({ pays: 'gn' }).pays, 'GN');
  assert.throws(() => v.role.parse({ role: 'roi' }));
});

test('réputation : barème du cahier des charges', () => {
  assert.strictEqual(pointsVote(1, 'reponse'), 10);
  assert.strictEqual(pointsVote(1, 'post'), 5);
  assert.strictEqual(pointsVote(-1, 'reponse'), -2);
  assert.strictEqual(BAREME.reponse_acceptee, 15);
});

test('effet d\'un vote : nouveau, retiré, inversé', () => {
  assert.deepStrictEqual(effetVote(0, 1, 'reponse'), { delta_votes: 1, delta_reputation: 10 });
  assert.deepStrictEqual(effetVote(1, 0, 'reponse'), { delta_votes: -1, delta_reputation: -10 });
  assert.deepStrictEqual(effetVote(1, -1, 'reponse'), { delta_votes: -2, delta_reputation: -12 });
  assert.deepStrictEqual(effetVote(-1, 1, 'post'), { delta_votes: 2, delta_reputation: 7 });
  assert.deepStrictEqual(effetVote(0, -1, 'post'), { delta_votes: -1, delta_reputation: -2 });
  // voter puis annuler ne change rien
  const a = effetVote(0, 1, 'reponse'); const b = effetVote(1, 0, 'reponse');
  assert.strictEqual(a.delta_votes + b.delta_votes, 0);
  assert.strictEqual(a.delta_reputation + b.delta_reputation, 0);
});

test('badges : paliers de réputation', () => {
  assert.deepStrictEqual(badgesPour(0), []);
  assert.deepStrictEqual(badgesPour(50), ['contributeur']);
  assert.deepStrictEqual(badgesPour(250), ['contributeur', 'expert']);
  assert.deepStrictEqual(badgesPour(900), ['contributeur', 'expert', 'maitre']);
});

test('OpenAPI forum : fusion sans schéma manquant ni doublon, idempotente', () => {
  const spec = require('../src/docs/openapi');
  const extend = require('../src/docs/openapi.forum');
  extend(spec); extend(spec);
  ['Forum', 'Classement', 'Admin'].forEach((n) => assert.strictEqual(spec.tags.filter((t) => t.name === n).length, 1));
  ['/api/echanges/posts', '/api/echanges/{id}/vote', '/api/classement', '/api/admin/signalements'].forEach((p) => assert.ok(spec.paths[p], `route manquante : ${p}`));
  const refs = [...JSON.stringify(spec).matchAll(/#\/components\/schemas\/(\w+)/g)].map((m) => m[1]);
  refs.forEach((n) => assert.ok(spec.components.schemas[n], `schéma manquant : ${n}`));
});
