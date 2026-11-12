// Carte d'Afrique : comptage par pays, route et carte (tracés) : node --test tests/cartePays.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { normaliser } = require('../src/services/cartePays');

test('normaliser : majuscules, fusion des doublons, tri du plus au moins peuplé (égalité : ordre alphabétique)', () => {
  const r = normaliser([{ _id: 'gn', total: 5 }, { _id: 'SN', total: 9 }, { _id: 'GN', total: 2 }, { _id: 'ci', total: 7 }]);
  assert.deepStrictEqual(r.pays, [{ pays: 'SN', total: 9 }, { pays: 'CI', total: 7 }, { pays: 'GN', total: 7 }]);
  assert.strictEqual(r.membres, 23);
});

test('normaliser : codes invalides, totaux nuls ou absurdes ignorés', () => {
  const r = normaliser([{ _id: '', total: 3 }, { _id: 'GIN', total: 3 }, { _id: null, total: 2 }, { _id: 'ML', total: 0 }, { _id: 'BF', total: 'x' }, { _id: 'TG', total: 4 }]);
  assert.deepStrictEqual(r.pays, [{ pays: 'TG', total: 4 }]);
  assert.deepStrictEqual(normaliser(undefined), { pays: [], membres: 0 });
});

test('câblage : route /pays dans meta.js', () => {
  const meta = fs.readFileSync(path.join(__dirname, '..', 'src', 'routes', 'meta.js'), 'utf8');
  assert.match(meta, /router\.get\(["']\/pays["']/);
});
