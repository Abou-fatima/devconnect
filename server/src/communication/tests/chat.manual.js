// Test manuel du chat temps réel : deux connexions avec le même compte.
// Usage (depuis server/) : node src/communication/tests/chat.manual.js <TOKEN>
const { io } = require('socket.io-client');

const token = process.argv[2];
if (!token) { console.log('Usage : node src/communication/tests/chat.manual.js <TOKEN>'); process.exit(1); }

const url = process.env.API_URL || 'http://localhost:4000';
const emetteur = io(url, { auth: { token } });
const recepteur = io(url, { auth: { token } });

[emetteur, recepteur].forEach((s) => s.on('connect_error', (e) => { console.log('Erreur de connexion :', e.message); process.exit(1); }));

recepteur.on('message', (m) => { console.log('Message reçu :', m); process.exit(0); });

recepteur.emit('join_canal', { canal: 'stack:react' }, () =>
  emetteur.emit('join_canal', { canal: 'stack:react' }, () =>
    emetteur.emit('message', { canal: 'stack:react', contenu: 'Salut' }, (r) => console.log('Message envoyé :', r.ok))));