// Tests de logique pure de la collaboration (sans MongoDB ni serveur) : npm run test:logic
const test = require('node:test');
const assert = require('node:assert');
const c = require('../src/services/collaboration');
const v = require('../src/validators/candidatures');

const PORTEUR = 'a'.repeat(24);
const AUTRE = 'b'.repeat(24);
const MEMBRE = 'c'.repeat(24);
const projet = (extra = {}) => ({ _id: 'd'.repeat(24), titre: 'AgriConnect', porteur_id: PORTEUR, statut: 'en_cours', membres: [{ user_id: MEMBRE, role: 'design' }], ...extra });

test('candidature : cas normal accepté', () => {
  assert.strictEqual(c.verifierCandidature({ projet: projet(), userId: AUTRE }), null);
});

test('candidature : le porteur ne se candidate pas à son propre projet', () => {
  assert.strictEqual(c.verifierCandidature({ projet: projet(), userId: PORTEUR }).status, 400);
});

test('candidature : un membre de l’équipe ne se recandidate pas (id simple ou objet peuplé)', () => {
  assert.strictEqual(c.verifierCandidature({ projet: projet(), userId: MEMBRE }).status, 409);
  const peuple = projet({ membres: [{ user_id: { _id: MEMBRE, pseudo: 'x' } }] });
  assert.strictEqual(c.verifierCandidature({ projet: peuple, userId: MEMBRE }).status, 409);
});

test('candidature : projet terminé, candidature déjà en attente, ou trop de tentatives', () => {
  assert.strictEqual(c.verifierCandidature({ projet: projet({ statut: 'termine' }), userId: AUTRE }).status, 409);
  assert.match(c.verifierCandidature({ projet: projet(), userId: AUTRE, enAttente: true }).message, /en attente/);
  assert.strictEqual(c.verifierCandidature({ projet: projet(), userId: AUTRE, nbPrecedentes: c.MAX_CANDIDATURES_PAR_PROJET - 1 }), null);
  assert.strictEqual(c.verifierCandidature({ projet: projet(), userId: AUTRE, nbPrecedentes: c.MAX_CANDIDATURES_PAR_PROJET }).status, 409);
});

test('rôle donné : choix du porteur > rôle demandé > « membre »', () => {
  assert.strictEqual(c.roleFinal({ metadata: { role: 'frontend' } }, 'lead'), 'lead');
  assert.strictEqual(c.roleFinal({ metadata: { role: 'frontend' } }), 'frontend');
  assert.strictEqual(c.roleFinal({ metadata: {} }), 'membre');
});

test('validation : message de 10 caractères minimum, rôle facultatif et limité', () => {
  assert.throws(() => v.candidater.parse({ message: 'court' }));
  assert.throws(() => v.candidater.parse({}));
  assert.strictEqual(v.candidater.parse({ message: '  Je connais React et Node.  ' }).message, 'Je connais React et Node.');
  assert.strictEqual(v.candidater.parse({ message: 'Je suis motivé pour aider', role: ' frontend ' }).role, 'frontend');
  assert.throws(() => v.candidater.parse({ message: 'Je suis motivé pour aider', role: 'x'.repeat(101) }));
  assert.deepStrictEqual(v.decision.parse({}), {});
  assert.throws(() => v.changerRole.parse({}));
});

test('notification : texte, destinataire et sujet (le projet)', async () => {
  const appels = [];
  const deps = { envoyer: async (o) => { appels.push(o); return { id: 'n1' }; } };
  await c.notifierCollab({ kind: 'candidature', destinataireId: PORTEUR, acteur: { _id: AUTRE, pseudo: 'mariama' }, projet: projet() }, deps);
  assert.strictEqual(appels.length, 1);
  assert.strictEqual(appels[0].kind, 'candidature');
  assert.strictEqual(appels[0].destinataireId, PORTEUR);
  assert.strictEqual(appels[0].acteurId, AUTRE);
  assert.strictEqual(appels[0].message, 'mariama souhaite rejoindre votre projet « AgriConnect »');
  assert.deepStrictEqual(appels[0].sujet, { type: 'projet', id: 'd'.repeat(24) });
  assert.deepStrictEqual(Object.keys(c.TEXTES).sort(), ['candidature', 'candidature_acceptee', 'candidature_refusee']);
});

test('notification : jamais d’auto-notification, et une panne ne casse rien', async () => {
  const appels = [];
  const ok = { envoyer: async (o) => { appels.push(o); } };
  assert.strictEqual(await c.notifierCollab({ kind: 'candidature_acceptee', destinataireId: PORTEUR, acteur: { _id: PORTEUR, pseudo: 'x' }, projet: projet() }, ok), null);
  assert.strictEqual(appels.length, 0);
  const panne = { envoyer: async () => { throw new Error('panne'); } };
  const erreur = console.error; console.error = () => {};
  try {
    assert.strictEqual(await c.notifierCollab({ kind: 'candidature', destinataireId: PORTEUR, acteur: { _id: AUTRE, pseudo: 'x' }, projet: projet() }, panne), null);
    assert.strictEqual(await c.notifierCollab({ kind: 'inconnu', destinataireId: PORTEUR, acteur: { _id: AUTRE, pseudo: 'x' }, projet: projet() }, ok), null);
  } finally { console.error = erreur; }
});

test('format client d’une candidature (avec candidat, sans données sensibles)', () => {
  const doc = { _id: 'e'.repeat(24), cible_id: 'd'.repeat(24), contenu: 'Bonjour', created_at: new Date('2026-10-31'), metadata: { statut: 'en_attente', role: 'mobile' } };
  const s = c.serialiserCandidature(doc, { _id: AUTRE, pseudo: 'kofi', profil: { photo: '/uploads/images/x.webp' }, reputation: 40, pays: 'GH', stacks: ['flutter'], email: 'secret@x.com', mot_de_passe_hash: 'h' });
  assert.strictEqual(s.statut, 'en_attente');
  assert.strictEqual(s.candidat.pseudo, 'kofi');
  assert.strictEqual(s.candidat.photo, '/uploads/images/x.webp');
  assert.ok(!JSON.stringify(s).includes('secret@x.com') && !JSON.stringify(s).includes('mot_de_passe'));
});
