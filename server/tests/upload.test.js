// Tests des images envoyées (sans MongoDB ni serveur) : npm run test:logic
// Les tests de conversion utilisent le vrai module sharp ; ils sont ignorés s'il n'est pas installé.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const env = require('../src/config/env');
const stockage = require('../src/services/stockage');
const c = require('../src/validators/common');
const usersV = require('../src/validators/users');

let sharp = null;
try { sharp = require('sharp'); } catch { /* ignoré */ }

test('nom de fichier : aléatoire, en .webp, jamais deux fois le même', () => {
  const noms = new Set(Array.from({ length: 200 }, () => stockage.nomFichier()));
  assert.strictEqual(noms.size, 200);
  assert.match([...noms][0], /^[a-z0-9]+-[a-f0-9]{16}\.webp$/);
  assert.strictEqual(stockage.urlPublique('a.webp'), '/uploads/images/a.webp');
});

test('chemin local : seulement dans le dossier d’envoi, jamais de ..', () => {
  const racine = path.resolve(os.tmpdir(), 'racine-test');
  assert.strictEqual(stockage.cheminLocal('/uploads/images/a.webp', racine), path.join(racine, 'images', 'a.webp'));
  for (const mauvais of ['/uploads/../secret', '/uploads/images/../../etc/passwd', '/uploads//etc', '/uploads/images/a b.webp', 'https://x.com/a.webp', '/autre/a.webp', '/uploads/', '/uploads/.', null, 42]) {
    assert.strictEqual(stockage.cheminLocal(mauvais, racine), null, String(mauvais));
  }
});

test('adresse de photo : http(s) ou fichier envoyé, jamais javascript: ni ..', () => {
  const photo = c.urlHttpOuFichier(300);
  assert.ok(photo.safeParse('https://exemple.com/moi.jpg').success);
  assert.ok(photo.safeParse('/uploads/images/abc-123.webp').success);
  for (const mauvais of ['javascript:alert(1)', 'data:image/png;base64,AAAA', '/uploads/../secret', '/uploads/images/../x.webp', '/autre/x.webp', 'ftp://x.com/a', '//evil.com/a.png', '']) {
    assert.ok(!photo.safeParse(mauvais).success, mauvais);
  }
});

test('profil : la photo peut être un fichier envoyé, vide pour l’effacer, mais pas javascript:', () => {
  assert.ok(usersV.updateProfile.safeParse({ profil: { photo: '/uploads/images/a.webp' } }).success);
  assert.ok(usersV.updateProfile.safeParse({ profil: { photo: '' } }).success);
  assert.ok(!usersV.updateProfile.safeParse({ profil: { photo: 'javascript:alert(1)' } }).success);
  // les autres liens restent en http(s) uniquement
  assert.ok(!usersV.updateProfile.safeParse({ profil: { liens: { github: '/uploads/images/a.webp' } } }).success);
});

test('conversion : grande image réduite à 1600 px et convertie en WebP, plus légère', { skip: !sharp }, async () => {
  const png = await sharp({ create: { width: 3200, height: 2000, channels: 3, background: { r: 30, g: 80, b: 160 } } }).png().toBuffer();
  const r = await stockage.versWebp(png);
  assert.ok(r.largeur <= 1600 && r.hauteur <= 1600);
  assert.strictEqual(r.largeur, 1600);
  assert.strictEqual(r.hauteur, 1000);
  assert.strictEqual(r.data.subarray(0, 4).toString(), 'RIFF');
  assert.strictEqual(r.data.subarray(8, 12).toString(), 'WEBP');
  assert.ok(r.data.length < png.length);
});

test('conversion : une petite image n’est pas agrandie ; les métadonnées sont retirées', { skip: !sharp }, async () => {
  const jpg = await sharp({ create: { width: 300, height: 200, channels: 3, background: '#fff' } }).jpeg().withExif({ IFD0: { Copyright: 'secret' } }).toBuffer();
  const r = await stockage.versWebp(jpg);
  assert.strictEqual(r.largeur, 300);
  const meta = await sharp(r.data).metadata();
  assert.strictEqual(meta.format, 'webp');
  assert.ok(!meta.exif, 'les métadonnées EXIF doivent être retirées');
});

test('conversion : un fichier qui n’est pas une image est refusé (400), même annoncé comme image', { skip: !sharp }, async () => {
  await assert.rejects(stockage.versWebp(Buffer.from('<?php echo 1; ?>')), (e) => e.status === 400 || e.statusCode === 400);
  await assert.rejects(stockage.versWebp(Buffer.alloc(0)), (e) => e.status === 400 || e.statusCode === 400);
});

test('enregistrer puis supprimer une image (stockage local)', { skip: !sharp }, async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'devconnect-up-'));
  const avant = env.uploadsDir; const driverAvant = env.uploadDriver;
  env.uploadsDir = dossier; env.uploadDriver = 'local';
  try {
    const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#c00' } }).png().toBuffer();
    const r = await stockage.enregistrerImage(png);
    assert.match(r.url, /^\/uploads\/images\/[a-z0-9]+-[a-f0-9]{16}\.webp$/);
    assert.strictEqual(r.stockage, 'local');
    const chemin = stockage.cheminLocal(r.url, dossier);
    assert.ok(fs.existsSync(chemin), 'le fichier doit exister');
    assert.strictEqual(fs.statSync(chemin).size, r.taille);
    await stockage.supprimer({ url: r.url, metadata: {} });
    assert.ok(!fs.existsSync(chemin), 'le fichier doit être supprimé');
    await stockage.supprimer({ url: r.url, metadata: {} }); // déjà supprimé : aucune erreur
  } finally {
    env.uploadsDir = avant; env.uploadDriver = driverAvant;
    fs.rmSync(dossier, { recursive: true, force: true });
  }
});

test('suppression : une adresse piégée ne touche aucun fichier', async () => {
  await assert.doesNotReject(stockage.supprimer({ url: '/uploads/../../etc/passwd', metadata: {} }));
  await assert.doesNotReject(stockage.supprimer(null));
});
