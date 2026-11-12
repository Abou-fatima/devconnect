// Tests de logique pure du chat (sans MongoDB ni Redis) : npm run test:logic
const test = require('node:test');
const assert = require('node:assert');
const { parseCanal } = require('../canaux');

const A = 'a'.repeat(24);
const B = 'b'.repeat(24);

test('canal stack et ville normalisés en minuscules', () => {
  assert.deepStrictEqual(parseCanal('stack:React', A), { canal: 'stack:react', cible_type: 'canal' });
  assert.deepStrictEqual(parseCanal('ville: Conakry ', A), { canal: 'ville:conakry', cible_type: 'canal' });
});

test('canal privé : même nom quel que soit l\'ordre, cible = l\'autre utilisateur', () => {
  const r1 = parseCanal(`prive:${B}_${A}`, A);
  const r2 = parseCanal(`prive:${A}_${B}`, B);
  assert.strictEqual(r1.canal, `prive:${A}_${B}`);
  assert.strictEqual(r1.canal, r2.canal);
  assert.strictEqual(r1.cible_type, 'user');
  assert.strictEqual(r1.cible_id, B);
  assert.strictEqual(r2.cible_id, A);
});

test('canal privé refusé : tiers, ids invalides, soi-même', () => {
  assert.match(parseCanal(`prive:${A}_${B}`, 'c'.repeat(24)).erreur, /Accès refusé/);
  assert.ok(parseCanal('prive:abc_def', A).erreur);
  assert.ok(parseCanal(`prive:${A}_${A}`, A).erreur);
});

test('canaux invalides', () => {
  assert.ok(parseCanal('stack:', A).erreur);
  assert.ok(parseCanal('stack:a b', A).erreur);
  assert.ok(parseCanal('autre:x', A).erreur);
  assert.ok(parseCanal(42, A).erreur);
});

test('OpenAPI du module communication : fusion sans schéma manquant ni doublon de tag', () => {
  const spec = require('../../docs/openapi');
  const extend = require('../openapi');
  extend(spec); extend(spec); // idempotent
  assert.strictEqual(spec.tags.filter((t) => t.name === 'Chat').length, 1);
  assert.ok(spec.paths['/api/chat/historique/{canal}']);
  const refs = [...JSON.stringify(spec).matchAll(/#\/components\/schemas\/(\w+)/g)].map((m) => m[1]);
  refs.forEach((n) => assert.ok(spec.components.schemas[n], `schéma manquant : ${n}`));
});
