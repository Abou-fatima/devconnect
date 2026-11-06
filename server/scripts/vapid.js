// Génère une paire de clés VAPID pour les notifications push : npm run vapid
// À copier dans le .env du serveur (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY). La clé privée reste secrète : jamais dans Git.
const webpush = require('web-push');
const k = webpush.generateVAPIDKeys();
console.log(`VAPID_PUBLIC_KEY=${k.publicKey}\nVAPID_PRIVATE_KEY=${k.privateKey}\nVAPID_SUBJECT=mailto:contact@exemple.com`);
