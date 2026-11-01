// Tests de logique pure du mentorat (sans MongoDB ni serveur) : npm run test:logic
const test = require('node:test');
const assert = require('node:assert');
const s = require('../src/services/mentorat');
const v = require('../src/validators/mentorat');

const MENTEE = 'a'.repeat(24);
const MENTOR = 'b'.repeat(24);
const mentor = (objectifs = ['offrir_mentorat', 'collaborer']) => ({ _id: MENTOR, pseudo: 'amadou', objectifs });
const doc = (extra = {}) => ({ _id: 'c'.repeat(24), auteur_id: MENTEE, cible_id: MENTOR, contenu: 'Bonjour', created_at: new Date('2026-11-01'), metadata: { statut: 'en_attente', sujet: 'Apprendre Node' }, ...extra });

test('demande : cas normal accepté', () => {
  assert.strictEqual(s.verifierDemande({ mentor: mentor(), userId: MENTEE }), null);
});

test('demande : pas à soi-même, et seulement à quelqu’un qui offre du mentorat', () => {
  assert.strictEqual(s.verifierDemande({ mentor: mentor(), userId: MENTOR }).status, 400);
  const refus = s.verifierDemande({ mentor: mentor(['apprendre']), userId: MENTEE });
  assert.strictEqual(refus.status, 409);
  assert.match(refus.message, /ne propose pas/);
  assert.strictEqual(s.verifierDemande({ mentor: { _id: MENTOR }, userId: MENTEE }).status, 409);
});

test('demande : déjà accompagné, déjà en attente chez lui, ou trop de demandes en attente', () => {
  assert.strictEqual(s.verifierDemande({ mentor: mentor(), userId: MENTEE, relationActive: true }).status, 409);
  assert.strictEqual(s.verifierDemande({ mentor: mentor(), userId: MENTEE, enAttenteAvecLui: true }).status, 409);
  assert.strictEqual(s.verifierDemande({ mentor: mentor(), userId: MENTEE, enAttenteTotal: s.MAX_DEMANDES_EN_ATTENTE - 1 }), null);
  assert.strictEqual(s.verifierDemande({ mentor: mentor(), userId: MENTEE, enAttenteTotal: s.MAX_DEMANDES_EN_ATTENTE }).status, 409);
});

test('capacité : un mentor accompagne 5 personnes au maximum', () => {
  assert.strictEqual(s.MAX_ACCOMPAGNES, 5);
  assert.strictEqual(s.verifierCapacite(s.MAX_ACCOMPAGNES - 1), null);
  assert.strictEqual(s.verifierCapacite(s.MAX_ACCOMPAGNES).status, 409);
});

test('validation : sujet 3 à 100, message 10 à 1000, identifiant du mentor valide', () => {
  const ok = { mentor_id: MENTOR, sujet: '  Apprendre Node  ', message: 'Je débute et je voudrais de l’aide.' };
  assert.strictEqual(v.demander.parse(ok).sujet, 'Apprendre Node');
  assert.throws(() => v.demander.parse({ ...ok, sujet: 'ab' }));
  assert.throws(() => v.demander.parse({ ...ok, message: 'court' }));
  assert.throws(() => v.demander.parse({ ...ok, message: 'x'.repeat(1001) }));
  assert.throws(() => v.demander.parse({ ...ok, mentor_id: 'abc' }));
});

test('validation : liste des mentors (pagination et code pays)', () => {
  const d = v.mentors.parse({});
  assert.strictEqual(d.page, 1);
  assert.strictEqual(d.limit, 12);
  assert.strictEqual(v.mentors.parse({ pays: 'gn' }).pays, 'GN');
  assert.throws(() => v.mentors.parse({ pays: 'GIN' }));
  assert.throws(() => v.mentors.parse({ limit: 500 }));
});

test('notification : kind « mentorat », texte et étape dans le sujet', async () => {
  const appels = [];
  const deps = { envoyer: async (o) => { appels.push(o); return { id: 'n1' }; } };
  const acteur = { _id: MENTEE, pseudo: 'mariama' };
  await s.notifierMentorat({ etape: 'demande', destinataireId: MENTOR, acteur, demandeId: 'c'.repeat(24), sujet: 'Apprendre Node' }, deps);
  assert.strictEqual(appels[0].kind, 'mentorat');
  assert.strictEqual(appels[0].destinataireId, MENTOR);
  assert.strictEqual(appels[0].message, 'mariama te demande du mentorat : « Apprendre Node »');
  assert.deepStrictEqual(appels[0].sujet, { type: 'mentorat', id: 'c'.repeat(24), etape: 'demande' });
  assert.deepStrictEqual(Object.keys(s.TEXTES).sort(), ['acceptee', 'demande', 'refusee']);
});

test('notification : pas d’auto-notification, une panne ne casse rien', async () => {
  const appels = [];
  const ok = { envoyer: async (o) => { appels.push(o); } };
  assert.strictEqual(await s.notifierMentorat({ etape: 'acceptee', destinataireId: MENTOR, acteur: { _id: MENTOR, pseudo: 'x' }, demandeId: 'c'.repeat(24) }, ok), null);
  assert.strictEqual(appels.length, 0);
  const erreur = console.error; console.error = () => {};
  try {
    const panne = { envoyer: async () => { throw new Error('panne'); } };
    assert.strictEqual(await s.notifierMentorat({ etape: 'demande', destinataireId: MENTOR, acteur: { _id: MENTEE, pseudo: 'x' }, demandeId: 'c'.repeat(24) }, panne), null);
    assert.strictEqual(await s.notifierMentorat({ etape: 'inconnue', destinataireId: MENTOR, acteur: { _id: MENTEE, pseudo: 'x' }, demandeId: 'c'.repeat(24) }, ok), null);
  } finally { console.error = erreur; }
});

test('format client : profils publics des deux personnes, rien de sensible', () => {
  const mentorDoc = { _id: MENTOR, pseudo: 'amadou', profil: { photo: '/uploads/images/a.webp' }, reputation: 90, pays: 'ML', stacks: ['node'], email: 'secret@x.com', mot_de_passe_hash: 'h' };
  const out = s.serialiserDemande(doc(), { mentor: mentorDoc });
  assert.strictEqual(out.statut, 'en_attente');
  assert.strictEqual(out.sujet, 'Apprendre Node');
  assert.strictEqual(out.mentor.pseudo, 'amadou');
  assert.strictEqual(out.mentee, null);
  assert.ok(!JSON.stringify(out).includes('secret@x.com') && !JSON.stringify(out).includes('mot_de_passe'));
});
