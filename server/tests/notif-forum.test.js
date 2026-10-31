// Tests de logique pure des notifications du forum (sans MongoDB ni serveur) : npm run test:logic
const test = require('node:test');
const assert = require('node:assert');
const { notifierForum, TEXTES } = require('../src/services/notifForum');

const AUTEUR = 'a'.repeat(24);
const AUTRE = 'b'.repeat(24);
const POST = 'c'.repeat(24);
const acteur = { _id: AUTRE, pseudo: 'mariama' };

const faux = (deja = false) => {
  const appels = [];
  return { appels, deps: { envoyer: async (o) => { appels.push(o); return { id: 'n1' }; }, existe: async () => deja } };
};

test('réponse : l’auteur de la question est prévenu, avec la question comme sujet', async () => {
  const { appels, deps } = faux();
  await notifierForum({ kind: 'reponse', destinataireId: AUTEUR, acteur, sujet: { type: 'post', id: POST } }, deps);
  assert.strictEqual(appels.length, 1);
  assert.strictEqual(appels[0].kind, 'reponse');
  assert.strictEqual(appels[0].destinataireId, AUTEUR);
  assert.strictEqual(appels[0].acteurId, AUTRE);
  assert.strictEqual(appels[0].message, 'mariama a répondu à ta question');
  assert.deepStrictEqual(appels[0].sujet, { type: 'post', id: POST });
});

test('trois types de notification avec leur texte', () => {
  assert.strictEqual(TEXTES.reponse_acceptee('Ali'), 'Ali a accepté ta réponse');
  assert.strictEqual(TEXTES.vote('Ali'), 'Ali a voté pour ta contribution');
  assert.deepStrictEqual(Object.keys(TEXTES).sort(), ['reponse', 'reponse_acceptee', 'vote']);
});

test('pas d’auto-notification', async () => {
  const { appels, deps } = faux();
  assert.strictEqual(await notifierForum({ kind: 'vote', destinataireId: AUTRE, acteur, sujet: { type: 'post', id: POST } }, deps), null);
  assert.strictEqual(appels.length, 0);
});

test('unique : une notification identique déjà envoyée n’est pas répétée', async () => {
  const { appels, deps } = faux(true);
  assert.strictEqual(await notifierForum({ kind: 'vote', destinataireId: AUTEUR, acteur, sujet: { type: 'post', id: POST }, unique: true }, deps), null);
  assert.strictEqual(appels.length, 0);
});

test('unique : le contrôle cherche le même acteur, le même type et la même question', async () => {
  let filtre;
  const deps = { envoyer: async () => ({}), existe: async (f) => { filtre = f; return false; } };
  await notifierForum({ kind: 'vote', destinataireId: AUTEUR, acteur, sujet: { type: 'post', id: POST }, unique: true }, deps);
  assert.strictEqual(filtre.auteur_id, AUTRE);
  assert.strictEqual(filtre['metadata.kind'], 'vote');
  assert.strictEqual(filtre['metadata.sujet.id'], POST);
  assert.strictEqual(filtre.cible_id, AUTEUR);
});

test('une panne du notifier ne casse jamais l’action de l’utilisateur', async () => {
  const deps = { envoyer: async () => { throw new Error('panne'); }, existe: async () => false };
  const erreur = console.error;
  console.error = () => {};
  try {
    assert.strictEqual(await notifierForum({ kind: 'reponse', destinataireId: AUTEUR, acteur, sujet: { type: 'post', id: POST } }, deps), null);
    assert.strictEqual(await notifierForum({ kind: 'inconnu', destinataireId: AUTEUR, acteur }, deps), null);
  } finally { console.error = erreur; }
});
