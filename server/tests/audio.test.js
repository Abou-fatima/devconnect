// Notes vocales : format, transcription Whisper (sans réseau), tolérance aux pannes : npm run test:logic
const test = require("node:test");
const assert = require("node:assert");
const a = require("../src/services/audio");

const avec = (octets, taille = 32) => {
  const b = Buffer.alloc(taille);
  Buffer.from(octets).copy(b);
  return b;
};
const mp4 = Buffer.concat([
  Buffer.from([0, 0, 0, 0x20]),
  Buffer.from("ftypM4A "),
  Buffer.alloc(20),
]);
const wav = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.alloc(4),
  Buffer.from("WAVE"),
  Buffer.alloc(20),
]);

test("format : reconnu par les premiers octets, pas par le nom ni le type annoncé", () => {
  assert.strictEqual(
    a.detecterFormat(avec([0x1a, 0x45, 0xdf, 0xa3])).ext,
    "webm",
  );
  assert.strictEqual(a.detecterFormat(avec(Buffer.from("OggS"))).ext, "ogg");
  assert.strictEqual(a.detecterFormat(mp4).mime, "audio/mp4");
  assert.strictEqual(a.detecterFormat(wav).ext, "wav");
  assert.strictEqual(a.detecterFormat(avec(Buffer.from("ID3"))).ext, "mp3");
  assert.strictEqual(a.detecterFormat(avec([0xff, 0xfb, 0x90])).ext, "mp3");
});

test("format : un fichier qui n’est pas un audio est refusé (exécutable, image, texte, trop court)", () => {
  assert.strictEqual(
    a.detecterFormat(Buffer.from("MZ" + "x".repeat(40))),
    null,
  );
  assert.strictEqual(
    a.detecterFormat(Buffer.from("<?php echo 1; ?>" + " ".repeat(20))),
    null,
  );
  assert.strictEqual(a.detecterFormat(avec([0x89, 0x50, 0x4e, 0x47])), null);
  assert.strictEqual(a.detecterFormat(Buffer.from("OggS")), null);
  assert.strictEqual(a.detecterFormat("texte"), null);
});

test("adresse publique : toujours dans /uploads/audio/, nom imprévisible", () => {
  assert.match(a.urlPublique("x.webm"), /^\/uploads\/audio\/x\.webm$/);
});

test("transcription : nettoyée (espaces, longueur maximale)", () => {
  assert.strictEqual(
    a.nettoyerTranscription("  Bonjour \n\n  tout   le monde  "),
    "Bonjour tout le monde",
  );
  assert.strictEqual(
    a.nettoyerTranscription("x".repeat(5000)).length,
    a.MAX_TRANSCRIPTION,
  );
  assert.strictEqual(a.nettoyerTranscription(null), "");
});

test("configuration : Whisper OpenAI par défaut, Groq ou autre par variables", () => {
  const d = a.configWhisper({});
  assert.match(d.url, /api\.openai\.com/);
  assert.strictEqual(d.modele, "whisper-1");
  assert.strictEqual(d.cle, "");
  assert.strictEqual(a.transcriptionActive({}), false);
  assert.strictEqual(a.transcriptionActive({ OPENAI_API_KEY: "k" }), true);
  const g = a.configWhisper({
    WHISPER_API_KEY: "g",
    WHISPER_API_URL: "https://api.groq.com/openai/v1/audio/transcriptions",
    WHISPER_MODEL: "whisper-large-v3",
    WHISPER_TIMEOUT_MS: "5000",
  });
  assert.deepStrictEqual(
    [g.cle, g.modele, g.delaiMs],
    ["g", "whisper-large-v3", 5000],
  );
});

test("transcription : sans clé, rien n’est envoyé sur le réseau", async () => {
  let appels = 0;
  const r = await a.transcrire(
    Buffer.alloc(50),
    { ext: "webm" },
    {
      config: { cle: "" },
      fetch: async () => {
        appels += 1;
      },
    },
  );
  assert.strictEqual(r, null);
  assert.strictEqual(appels, 0);
});

test("transcription : requête envoyée à Whisper avec clé, modèle, langue et fichier", async () => {
  let vu;
  const fetchFactice = async (url, opts) => {
    vu = { url, opts };
    return { ok: true, json: async () => ({ text: "  Bonjour   à tous " }) };
  };
  const config = {
    url: "https://exemple.test/v1/audio/transcriptions",
    cle: "secret",
    modele: "whisper-1",
    delaiMs: 1000,
  };
  const r = await a.transcrire(
    Buffer.from("audio"),
    { ext: "webm", mime: "audio/webm", langue: "fr" },
    { config, fetch: fetchFactice },
  );
  assert.strictEqual(r, "Bonjour à tous");
  assert.strictEqual(vu.url, config.url);
  assert.strictEqual(vu.opts.headers.Authorization, "Bearer secret");
  assert.strictEqual(vu.opts.body.get("model"), "whisper-1");
  assert.strictEqual(vu.opts.body.get("language"), "fr");
  assert.strictEqual(vu.opts.body.get("file").name, "note.webm");
});

test("transcription : langue inconnue ignorée (Whisper détecte seul)", async () => {
  let corps;
  const fetchFactice = async (_u, o) => {
    corps = o.body;
    return { ok: true, json: async () => ({ text: "ok" }) };
  };
  await a.transcrire(
    Buffer.from("a"),
    { ext: "ogg", langue: "xx" },
    {
      config: { url: "u", cle: "k", modele: "m", delaiMs: 1000 },
      fetch: fetchFactice,
    },
  );
  assert.strictEqual(corps.get("language"), null);
});

test("transcription : une panne ne casse jamais l’envoi du vocal", async () => {
  const erreur = console.error;
  console.error = () => {};
  try {
    const config = { url: "u", cle: "k", modele: "m", delaiMs: 1000 };
    assert.strictEqual(
      await a.transcrire(
        Buffer.from("a"),
        { ext: "webm" },
        { config, fetch: async () => ({ ok: false, status: 429 }) },
      ),
      null,
    );
    assert.strictEqual(
      await a.transcrire(
        Buffer.from("a"),
        { ext: "webm" },
        {
          config,
          fetch: async () => {
            throw new Error("réseau coupé");
          },
        },
      ),
      null,
    );
    assert.strictEqual(
      await a.transcrire(
        Buffer.from("a"),
        { ext: "webm" },
        {
          config,
          fetch: async () => ({
            ok: true,
            json: async () => ({ text: "   " }),
          }),
        },
      ),
      null,
    );
  } finally {
    console.error = erreur;
  }
});

test("adresse audio étrangère : aucune transcription cherchée", async () => {
  assert.strictEqual(
    await a.transcriptionDe("/uploads/images/x.webp", "u"),
    undefined,
  );
  assert.strictEqual(
    await a.transcriptionDe("https://evil.test/a.webm", "u"),
    undefined,
  );
  assert.strictEqual(await a.transcriptionDe(undefined, "u"), undefined);
});
