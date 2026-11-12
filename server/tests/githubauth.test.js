// Connexion GitHub : se connecter ne crée jamais de compte (sans base de données) : node --test tests/githubauth.test.js
const test = require('node:test');
const assert = require('node:assert');
const { modeValide, peutCreerCompte } = require('../src/services/githubAuth');

test('mode : seuls connexion et inscription existent, le reste devient inscription', () => {
  assert.strictEqual(modeValide('connexion'), 'connexion');
  assert.strictEqual(modeValide('inscription'), 'inscription');
  for (const m of [undefined, null, '', 'admin', 42, ['connexion']]) assert.strictEqual(modeValide(m), 'inscription');
});

test('création de compte : refusée en mode connexion, permise en inscription', () => {
  assert.strictEqual(peutCreerCompte('connexion'), false);
  assert.strictEqual(peutCreerCompte('inscription'), true);
  assert.strictEqual(peutCreerCompte(undefined), true);
});
