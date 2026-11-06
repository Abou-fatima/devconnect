// Conversations privées : aperçu, interlocuteur, assemblage de la liste et compteur (sans base de données) : node --test tests/prives.test.js
const test = require('node:test');
const assert = require('node:assert');
const { autreParticipant, apercuMessage, assembler } = require('../src/services/prives');
const fs = require('fs');
const path = require('path');

const A = 'a'.repeat(24); const B = 'b'.repeat(24); const C = 'c'.repeat(24);

test('autreParticipant : renvoie l’interlocuteur, quel que soit l’ordre', () => {
  assert.strictEqual(autreParticipant(`prive:${A}_${B}`, A), B);
  assert.strictEqual(autreParticipant(`prive:${A}_${B}`, B), A);
  assert.strictEqual(autreParticipant('stack:react', A), null);
});

test('apercuMessage : texte coupé, image ou vocal sans texte', () => {
  assert.deepStrictEqual(apercuMessage({ contenu: ' Salut ' }), { type: 'texte', texte: 'Salut' });
  assert.strictEqual(apercuMessage({ contenu: 'x'.repeat(200) }).texte.length, 80);
  assert.strictEqual(apercuMessage({ image_url: '/uploads/images/a.webp' }).type, 'image');
  assert.strictEqual(apercuMessage({ audio_url: '/uploads/a.webm' }).type, 'audio');
  assert.strictEqual(apercuMessage({ contenu: 'voici', image_url: '/uploads/images/a.webp' }).type, 'texte');
});

test('assembler : tri récent d’abord, compteur et total', () => {
  const r = assembler({
    moiId: A,
    derniers: [
      { canal: `prive:${A}_${B}`, dernier: { auteur_id: B, contenu: 'ancien', created_at: '2026-11-01T10:00:00Z' } },
      { canal: `prive:${A}_${C}`, dernier: { auteur_id: A, contenu: 'récent', created_at: '2026-11-05T10:00:00Z' } }
    ],
    utilisateurs: { [B]: { pseudo: 'bob', photo: 'p.png' }, [C]: { pseudo: 'carla' } },
    nonLus: { [`prive:${A}_${B}`]: 3 }
  });
  assert.deepStrictEqual(r.conversations.map((c) => c.autre.pseudo), ['carla', 'bob']);
  assert.strictEqual(r.conversations[0].dernier.de_moi, true);
  assert.strictEqual(r.conversations[1].non_lus, 3);
  assert.strictEqual(r.conversations[0].non_lus, 0);
  assert.strictEqual(r.total_non_lus, 3);
});

test('assembler : une conversation dont l’interlocuteur n’existe plus est ignorée', () => {
  const r = assembler({ moiId: A, derniers: [{ canal: `prive:${A}_${B}`, dernier: { auteur_id: B, contenu: 'x', created_at: new Date() } }], utilisateurs: {}, nonLus: {} });
  assert.deepStrictEqual(r, { conversations: [], total_non_lus: 0 });
});

test('notifications : le type « message_prive » existe', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/communication/notifications/notifier.js'), 'utf8');
  assert.match(src, /const KINDS = \[[^\]]*'message_prive'/);
});
