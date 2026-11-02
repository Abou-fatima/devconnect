// Tests des images envoyées (sans MongoDB ni serveur) : npm run test:logic
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const env = require("../src/config/env");
const stockage = require("../src/services/stockage");
const c = require("../src/validators/common");
const usersV = require("../src/validators/users");

test("nom de fichier : aléatoire, extension demandée, jamais deux fois le même", () => {
  const noms = new Set(
    Array.from({ length: 200 }, () => stockage.nomFichier("jpg")),
  );
  assert.strictEqual(noms.size, 200);
  assert.match([...noms][0], /^[a-z0-9]+-[a-f0-9]{16}\.jpg$/);
  assert.strictEqual(stockage.urlPublique("a.webp"), "/uploads/images/a.webp");
});

test("chemin local : seulement dans le dossier d’envoi, jamais de ..", () => {
  const racine = path.resolve(os.tmpdir(), "racine-test");
  assert.strictEqual(
    stockage.cheminLocal("/uploads/images/a.webp", racine),
    path.join(racine, "images", "a.webp"),
  );
  for (const mauvais of [
    "/uploads/../secret",
    "/uploads/images/../../etc/passwd",
    "/uploads//etc",
    "/uploads/images/a b.webp",
    "https://x.com/a.webp",
    "/autre/a.webp",
    "/uploads/",
    "/uploads/.",
    null,
    42,
  ]) {
    assert.strictEqual(
      stockage.cheminLocal(mauvais, racine),
      null,
      String(mauvais),
    );
  }
});

test("adresse de photo : http(s) ou fichier envoyé, jamais javascript: ni ..", () => {
  const photo = c.urlHttpOuFichier(300);
  assert.ok(photo.safeParse("https://exemple.com/moi.jpg").success);
  assert.ok(photo.safeParse("/uploads/images/abc-123.webp").success);
  for (const mauvais of [
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "/uploads/../secret",
    "/uploads/images/../x.webp",
    "/autre/x.webp",
    "ftp://x.com/a",
    "//evil.com/a.png",
    "",
  ]) {
    assert.ok(!photo.safeParse(mauvais).success, mauvais);
  }
});

test("profil : la photo peut être un fichier envoyé, vide pour l’effacer, mais pas javascript:", () => {
  assert.ok(
    usersV.updateProfile.safeParse({
      profil: { photo: "/uploads/images/a.webp" },
    }).success,
  );
  assert.ok(usersV.updateProfile.safeParse({ profil: { photo: "" } }).success);
  assert.ok(
    !usersV.updateProfile.safeParse({
      profil: { photo: "javascript:alert(1)" },
    }).success,
  );
  // les autres liens restent en http(s) uniquement
  assert.ok(
    !usersV.updateProfile.safeParse({
      profil: { liens: { github: "/uploads/images/a.webp" } },
    }).success,
  );
});

// Images synthétiques (sans bibliothèque d'image) : en-têtes valides, contenu minimal.
const zlib = require("node:zlib");
const png = (w, h) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const chunk = (type, data) => {
    const l = Buffer.alloc(4);
    l.writeUInt32BE(data.length);
    return Buffer.concat([l, Buffer.from(type), data, Buffer.alloc(4)]);
  };
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.alloc(10))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};
const segment = (marqueur, data) => {
  const l = Buffer.alloc(2);
  l.writeUInt16BE(data.length + 2);
  return Buffer.concat([Buffer.from([0xff, marqueur]), l, data]);
};
const jpeg = (w, h, { exif = false } = {}) => {
  const sof = Buffer.alloc(15);
  sof[0] = 8;
  sof.writeUInt16BE(h, 1);
  sof.writeUInt16BE(w, 3);
  sof[5] = 3;
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    ...(exif
      ? [segment(0xe1, Buffer.from("Exif\0\0GPS-secret-position"))]
      : []),
    segment(0xc0, sof),
    segment(0xda, Buffer.alloc(8)),
    Buffer.from([0x12, 0x34, 0x56, 0xff, 0xd9]),
  ]);
};
const webpVp8x = (w, h) => {
  const d = Buffer.alloc(30);
  d.write("RIFF", 0);
  d.writeUInt32LE(22, 4);
  d.write("WEBP", 8);
  d.write("VP8X", 12);
  d.writeUInt32LE(10, 16);
  d.writeUIntLE(w - 1, 24, 3);
  d.writeUIntLE(h - 1, 27, 3);
  return d;
};
const gif = (w, h) => {
  const d = Buffer.alloc(30);
  d.write("GIF89a", 0);
  d.writeUInt16LE(w, 6);
  d.writeUInt16LE(h, 8);
  return d;
};

test("contrôle : JPEG, PNG, WebP et GIF reconnus avec leurs dimensions", () => {
  const lire = (b) => {
    const r = stockage.verifierImage(b);
    return [r.ext, r.largeur, r.hauteur];
  };
  assert.deepStrictEqual(lire(jpeg(1280, 720)), ["jpg", 1280, 720]);
  assert.deepStrictEqual(lire(png(800, 600)), ["png", 800, 600]);
  assert.deepStrictEqual(lire(webpVp8x(640, 480)), ["webp", 640, 480]);
  assert.deepStrictEqual(lire(gif(100, 50)), ["gif", 100, 50]);
});

test("contrôle : faux fichiers refusés (400), même annoncés comme image", () => {
  const refuse = (b) =>
    assert.throws(
      () => stockage.verifierImage(b),
      (e) => e.status === 400 || e.statusCode === 400,
    );
  refuse(Buffer.from("<?php echo 1; ?>" + " ".repeat(30)));
  refuse(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    ),
  );
  refuse(Buffer.from("MZ" + "x".repeat(60)));
  refuse(Buffer.alloc(0));
  refuse(Buffer.from("GIF89a")); // en-tête sans dimensions
  refuse(png(0, 0));
});

test("contrôle : image démesurée refusée (6000 px de côté au maximum)", () => {
  assert.throws(() => stockage.verifierImage(png(7000, 100)));
  assert.throws(() => stockage.verifierImage(jpeg(6001, 100)));
  assert.doesNotThrow(() => stockage.verifierImage(jpeg(6000, 6000)));
  assert.doesNotThrow(() => stockage.verifierImage(jpeg(4000, 3000)));
});

test("JPEG : métadonnées (EXIF, GPS) retirées, image conservée", () => {
  const avec = jpeg(1280, 720, { exif: true });
  assert.ok(avec.includes("GPS-secret-position"));
  const r = stockage.verifierImage(avec);
  assert.ok(
    !r.data.includes("GPS-secret-position"),
    "les métadonnées EXIF doivent être retirées",
  );
  assert.ok(r.data.length < avec.length);
  assert.deepStrictEqual([r.largeur, r.hauteur], [1280, 720]);
  assert.strictEqual(r.data.subarray(0, 2).toString("hex"), "ffd8");
  assert.ok(
    r.data.subarray(-5).equals(Buffer.from([0x12, 0x34, 0x56, 0xff, 0xd9])),
    "les données image doivent rester intactes",
  );
  assert.strictEqual(stockage.verifierImage(r.data).largeur, 1280); // toujours une image lisible
});

test("enregistrer puis supprimer une image (stockage local, extension d’après le vrai format)", async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "devconnect-up-"));
  const avant = env.uploadsDir;
  const driverAvant = env.uploadDriver;
  env.uploadsDir = dossier;
  env.uploadDriver = "local";
  try {
    const r = await stockage.enregistrerImage(png(800, 600));
    assert.match(r.url, /^\/uploads\/images\/[a-z0-9]+-[a-f0-9]{16}\.png$/);
    assert.strictEqual(r.mime, "image/png");
    assert.strictEqual(r.stockage, "local");
    const chemin = stockage.cheminLocal(r.url, dossier);
    assert.ok(fs.existsSync(chemin), "le fichier doit exister");
    assert.strictEqual(fs.statSync(chemin).size, r.taille);
    await stockage.supprimer({ url: r.url, metadata: {} });
    assert.ok(!fs.existsSync(chemin), "le fichier doit être supprimé");
    await stockage.supprimer({ url: r.url, metadata: {} }); // déjà supprimé : aucune erreur
    await assert.rejects(
      stockage.enregistrerImage(Buffer.from("pas une image" + " ".repeat(30))),
    );
  } finally {
    env.uploadsDir = avant;
    env.uploadDriver = driverAvant;
    fs.rmSync(dossier, { recursive: true, force: true });
  }
});

test("suppression : une adresse piégée ne touche aucun fichier", async () => {
  await assert.doesNotReject(
    stockage.supprimer({ url: "/uploads/../../etc/passwd", metadata: {} }),
  );
  await assert.doesNotReject(stockage.supprimer(null));
});
