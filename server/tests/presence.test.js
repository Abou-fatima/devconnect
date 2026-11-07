// Présence : salles privées d'une personne et état en ligne / hors ligne (sans base de données) : node --test tests/presence.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const presence = require('../src/communication/presence');

const A = 'a'.repeat(24); const B = 'b'.repeat(24); const C = 'c'.repeat(24);

test('sallesPrivees : seulement les conversations privées où figure la personne', () => {
  const rooms = new Map([
    [`prive:${A}_${B}`, new Set(['s1'])], [`prive:${B}_${C}`, new Set(['s2'])],
    ['stack:react', new Set(['s3'])], [`user:${A}`, new Set(['s1'])], ['socket-id', new Set(['s1'])]
  ]);
  assert.deepEqual(presence.sallesPrivees(rooms, A), [`prive:${A}_${B}`]);
  assert.deepEqual(presence.sallesPrivees(rooms, B).sort(), [`prive:${A}_${B}`, `prive:${B}_${C}`].sort());
  assert.deepEqual(presence.sallesPrivees(rooms, 'd'.repeat(24)), []);
});

test('etat : hors ligne sans serveur Socket.IO (pas de salle ouverte)', async () => {
  assert.equal(await presence.enLigne(A), false);
});

test('surConnexion : prévient les salles privées de la personne', () => {
  const emis = [];
  const io = {
    sockets: { adapter: { rooms: new Map([[`prive:${A}_${B}`, new Set(['s'])], [`prive:${B}_${C}`, new Set(['t'])]]) } },
    to: (salle) => ({ emit: (evt, data) => emis.push({ salle, evt, data }) }),
    in: () => ({ fetchSockets: async () => [] })
  };
  presence.setIo(io);
  presence.surConnexion(A);
  assert.equal(emis.length, 1);
  assert.deepEqual(emis[0], { salle: `prive:${A}_${B}`, evt: 'presence', data: { user_id: A, en_ligne: true, vu_le: null } });
  presence.setIo(null);
});
