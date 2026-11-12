// Défi de la semaine : règles, classement, défis de démonstration (exécutés pour de vrai), câblage : node --test tests/defis.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const svc = require('../src/services/defis');
const { DEFIS_DEMO } = require('../scripts/defis-donnees');

const t = (entree, attendu, visible = false) => ({ entree, attendu, visible });
const bons = [t([1], 1, true), t([2], 2), t([3], 3)];
const defi = { tests: bons, debut: '2026-11-02T00:00:00Z', fin: '2026-11-09T00:00:00Z' };
const MAINTENANT = new Date('2026-11-04T10:00:00Z');

test('erreurTests : 3 tests minimum, un visible et un caché, tailles et formes', () => {
  assert.strictEqual(svc.erreurTests(bons), null);
  assert.match(svc.erreurTests([t([1], 1, true), t([2], 2)]), /Au moins 3 tests/);
  assert.match(svc.erreurTests([t([1], 1, true), t([2], 2, true), t([3], 3, true)]), /caché/);
  assert.match(svc.erreurTests([t([1], 1), t([2], 2), t([3], 3)]), /visible/);
  assert.match(svc.erreurTests([...bons, { entree: 'x', attendu: 1, visible: true }]), /entrée/);
  assert.match(svc.erreurTests([...bons, { entree: [1], visible: true }]), /attendu/);
  assert.match(svc.erreurTests([...bons, t([1, 2, 3, 4, 5, 6], 1, true)]), /entrée/);
  assert.match(svc.erreurTests([...bons, t(['x'.repeat(2000)], 1)]), /trop grande/);
  assert.match(svc.erreurTests([...bons, { entree: [1], attendu: 1, visible: 'oui' }]), /visible/);
  assert.match(svc.erreurTests(Array.from({ length: 31 }, () => t([1], 1, true))), /30 tests/);
});

test('statut : à venir, en cours, terminé', () => {
  assert.strictEqual(svc.statut(defi, new Date('2026-11-01T00:00:00Z')), 'a_venir');
  assert.strictEqual(svc.statut(defi, MAINTENANT), 'en_cours');
  assert.strictEqual(svc.statut(defi, new Date('2026-11-09T00:00:00Z')), 'termine');
});

test('serialiserDefi : seuls les exemples (tests visibles) sont montrés, jamais les tests cachés', () => {
  const s = svc.serialiserDefi({ _id: 'a1', titre: 'T', enonce: 'E', nom_fonction: 'f', code_depart: '', tags: [], ...defi }, MAINTENANT);
  assert.strictEqual(s.nb_tests, 3);
  assert.deepStrictEqual(s.exemples, [{ entree: [1], attendu: 1 }]);
  assert.ok(!JSON.stringify(s).includes('"visible"'));
  assert.strictEqual(s.statut, 'en_cours');
});

test('verifierSoumission : cas normal, trop rapide, incomplet, incohérent, hors période', () => {
  const part = { debut_at: new Date(MAINTENANT.getTime() - 120 * 1000) };
  const code = 'function f(x) { return x; }';
  assert.deepStrictEqual(svc.verifierSoumission({ defi, participation: part, s: { code, tests_reussis: 3, total: 3 }, maintenant: MAINTENANT }), { reussi: true, duree_s: 120 });
  assert.strictEqual(svc.verifierSoumission({ defi, participation: part, s: { code, tests_reussis: 2, total: 3 }, maintenant: MAINTENANT }).reussi, false);
  const vite = { debut_at: new Date(MAINTENANT.getTime() - 5 * 1000) };
  assert.strictEqual(svc.verifierSoumission({ defi, participation: vite, s: { code, tests_reussis: 3, total: 3 }, maintenant: MAINTENANT }).status, 422);
  assert.strictEqual(svc.verifierSoumission({ defi, participation: vite, s: { code, tests_reussis: 1, total: 3 }, maintenant: MAINTENANT }).reussi, false); // un essai raté rapide reste permis
  assert.strictEqual(svc.verifierSoumission({ defi, participation: part, s: { code, tests_reussis: 3, total: 4 }, maintenant: MAINTENANT }).status, 422);
  assert.strictEqual(svc.verifierSoumission({ defi, participation: part, s: { code, tests_reussis: 9, total: 3 }, maintenant: MAINTENANT }).status, 422);
  assert.strictEqual(svc.verifierSoumission({ defi, participation: part, s: { code: '', tests_reussis: 3, total: 3 }, maintenant: MAINTENANT }).status, 422);
  assert.strictEqual(svc.verifierSoumission({ defi, participation: null, s: { code, tests_reussis: 3, total: 3 }, maintenant: MAINTENANT }).status, 409);
  assert.strictEqual(svc.verifierSoumission({ defi, participation: part, s: { code, tests_reussis: 3, total: 3 }, maintenant: new Date('2026-12-01T00:00:00Z') }).status, 409);
});

test('classer : seulement les réussites ; durée, puis essais, puis premier arrivé', () => {
  const r = svc.classer([
    { id: 'a', reussi: true, duree_s: 300, essais: 2, valide_at: '2026-11-04T10:00:00Z' },
    { id: 'b', reussi: true, duree_s: 120, essais: 5, valide_at: '2026-11-04T10:05:00Z' },
    { id: 'c', reussi: false, duree_s: 10, essais: 1, valide_at: '2026-11-04T10:06:00Z' },
    { id: 'd', reussi: true, duree_s: 300, essais: 1, valide_at: '2026-11-04T10:07:00Z' },
    { id: 'e', reussi: true, duree_s: 300, essais: 1, valide_at: '2026-11-04T10:03:00Z' },
  ]);
  assert.deepStrictEqual(r.map((x) => [x.id, x.rang]), [['b', 1], ['e', 2], ['d', 3], ['a', 4]]);
  assert.deepStrictEqual(svc.classer(null), []);
});

test('défis de démonstration : valides, et chaque solution de référence réussit tous ses tests (exécutés pour de vrai)', () => {
  assert.strictEqual(DEFIS_DEMO.length, 3);
  for (const d of DEFIS_DEMO) {
    assert.match(d.nom_fonction, svc.NOM_FONCTION);
    assert.strictEqual(svc.erreurTests(d.tests), null, d.titre);
    const fn = new Function(`${d.solution}\nreturn ${d.nom_fonction};`)();
    d.tests.forEach((x, i) => assert.deepStrictEqual(fn(...JSON.parse(JSON.stringify(x.entree))), x.attendu, `${d.titre} : test ${i + 1}`));
    // une solution fausse (renvoie toujours la même valeur) ne doit pas tout réussir : les tests ont du sens
    const faux = new Function(`return function(){ return 0; };`)();
    assert.ok(d.tests.some((x) => JSON.stringify(faux(...x.entree)) !== JSON.stringify(x.attendu)), `${d.titre} : tests trop faibles`);
  }
});

test('câblage : route montée dans app.js, modèles et script', () => {
  const lire = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  assert.match(lire('src/app.js'), /\/api\/defis/);
  assert.match(lire('src/routes/defis.js'), /requireRole\("admin", "moderateur"\)/);
  assert.match(lire('src/routes/defis.js'), /\/:id\/soumettre/);
});

test('podium : les trois premiers, avec le sujet de la notification', () => {
  const classes = svc.classer([1, 2, 3, 4].map((n) => ({ _id: n, user_id: `u${n}`, reussi: true, duree_s: 20 + n, essais: 1, valide_at: '2026-11-04T10:00:00Z' })));
  const p = svc.podium(classes, { _id: 'd1', titre: 'Inverser' });
  assert.deepStrictEqual(p.map((x) => [x.user_id, x.rang]), [['u1', 1], ['u2', 2], ['u3', 3]]);
  assert.deepStrictEqual(p[0].sujet, { type: 'defi', id: 'd1', rang: 1, titre: 'Inverser' });
  assert.deepStrictEqual(svc.podium([], { _id: 'd1' }), []);
});

test('câblage : clôture notifiée une fois, kind défini, mon rang hors top 10', () => {
  const r = fs.readFileSync(path.join(__dirname, '../src/routes/defis.js'), 'utf8');
  assert.match(r, /cloture_notifiee: \{ \$ne: true \}/);
  assert.match(r, /kind: "defi_podium"/);
  assert.match(r, /mon_classement/);
  assert.match(fs.readFileSync(path.join(__dirname, '../src/models/Defi.js'), 'utf8'), /cloture_notifiee/);
});
