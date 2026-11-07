// Notifications push : validation, contenu, envoi et nettoyage des abonnements expirés (sans base ni réseau) : node --test tests/push.test.js
// Ces tests ne doivent pas dépendre de votre .env : on vide les clés VAPID avant de charger le service
// (dotenv ne remplace jamais une variable déjà définie, même vide).
process.env.VAPID_PUBLIC_KEY = '';
process.env.VAPID_PRIVATE_KEY = '';
const test = require('node:test');
const assert = require('node:assert/strict');
const { abonnementValide, lienPush, construirePush, envoyerPush, pushActif } = require('../src/services/push');

const bon = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'B'.repeat(80), auth: 'a'.repeat(22) } };

test('abonnementValide : accepte un abonnement correct, refuse le reste', () => {
  assert.equal(abonnementValide(bon), true);
  assert.equal(abonnementValide(null), false);
  assert.equal(abonnementValide({ ...bon, endpoint: 'http://non-securise.test/x' }), false);
  assert.equal(abonnementValide({ ...bon, endpoint: 'https://x.test/' + 'a'.repeat(700) }), false);
  assert.equal(abonnementValide({ endpoint: bon.endpoint }), false);
  assert.equal(abonnementValide({ ...bon, keys: { p256dh: 'x', auth: 'y' } }), false);
});

test('lienPush : conversation, question, projet, défaut', () => {
  assert.equal(lienPush({ sujet: { type: 'canal', canal: 'prive:a_b' } }), '/messages/prive%3Aa_b');
  assert.equal(lienPush({ sujet: { type: 'post', id: '12' } }), '/forum/questions/12');
  assert.equal(lienPush({ sujet: { type: 'projet', id: '7' } }), '/projets/7');
  assert.equal(lienPush({ sujet: null }), '/notifications');
});

test('construirePush : jamais le texte du message, seulement qui écrit', () => {
  const p = construirePush({ id: '1', kind: 'message_prive', message: 'bob vous a envoyé un message', sujet: { type: 'canal', canal: 'prive:a_b' }, acteur: { pseudo: 'bob' } });
  assert.equal(p.title, 'DevConnect');
  assert.equal(p.body, 'bob vous a envoyé un message');
  assert.equal(p.tag, 'prive:a_b');
  const q = construirePush({ id: '2', kind: 'vote', message: null, sujet: null, acteur: { pseudo: 'amy' } });
  assert.equal(q.body, 'amy a voté pour votre contribution');
});

test('envoyerPush : envoie à chaque appareil et supprime les abonnements expirés', async () => {
  const supprimes = [];
  const Abonnement = {
    find: () => ({ lean: async () => [{ _id: 1, endpoint: 'https://ok', keys: {} }, { _id: 2, endpoint: 'https://mort', keys: {} }] }),
    deleteOne: async (f) => { supprimes.push(f._id); }
  };
  const lib = { sendNotification: async (a) => { if (a.endpoint === 'https://mort') { const e = new Error('Gone'); e.statusCode = 410; throw e; } } };
  const r = await envoyerPush('u1', { id: 'n', kind: 'mention', message: 'x', sujet: null, acteur: null }, { Abonnement, lib });
  assert.equal(r.envoyes, 1);
  assert.deepEqual(supprimes, [2]);
});

test('envoyerPush : sans clés VAPID, ne fait rien', async () => {
  assert.equal(pushActif(), false);
  assert.deepEqual(await envoyerPush('u1', { kind: 'vote' }), { envoyes: 0 });
});
