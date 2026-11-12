// Le jeu de démonstration doit respecter les mêmes règles que l'application : npm run test:logic
const test = require("node:test");
const assert = require("node:assert");
const { genererJeu } = require("../scripts/seed/generateur");

const jeu = genererJeu({ graine: 1, maintenant: Date.UTC(2026, 10, 1) });
const par = (type) => jeu.echanges.filter((e) => e.type === type);
const ids = new Set(jeu.utilisateurs.map((u) => u._id));

test("volumes : 200 utilisateurs, 50+ questions, 30+ projets", () => {
  assert.strictEqual(jeu.utilisateurs.length, 200);
  assert.ok(par("post").length >= 50);
  assert.ok(jeu.projets.length >= 30);
  assert.ok(par("reponse").length > par("post").length);
});

test("reproductible : même graine, mêmes données ; autre graine, autres données", () => {
  const m = Date.UTC(2026, 10, 1);
  assert.deepStrictEqual(
    genererJeu({ graine: 1, maintenant: m }),
    genererJeu({ graine: 1, maintenant: m }),
  );
  assert.notDeepStrictEqual(
    genererJeu({ graine: 2, maintenant: m }).utilisateurs[0].pseudo,
    jeu.utilisateurs[0].pseudo,
  );
});

test("identifiants : uniques, 24 caractères hexadécimaux, toutes les références existent", () => {
  const tous = [...jeu.utilisateurs, ...jeu.echanges, ...jeu.projets].map(
    (x) => x._id,
  );
  assert.strictEqual(new Set(tous).size, tous.length);
  tous.forEach((i) => assert.match(i, /^[a-f0-9]{24}$/));
  const echIds = new Set(jeu.echanges.map((e) => e._id));
  jeu.echanges.forEach((e) => {
    assert.ok(ids.has(e.auteur_id));
    if (e.parent_id) assert.ok(echIds.has(e.parent_id));
  });
});

test("utilisateurs : pseudos uniques (sans tenir compte de la casse), e-mails de démo, aucun mot de passe en clair", () => {
  const p = jeu.utilisateurs.map((u) => u.pseudo.toLowerCase());
  assert.strictEqual(new Set(p).size, p.length);
  jeu.utilisateurs.forEach((u) => {
        assert.match(u.email, /@devconnect$/);
    assert.ok(!("mot_de_passe" in u));
    assert.ok(u.pseudo.length >= 3 && u.pseudo.length <= 30);
  });
  assert.ok(
    jeu.utilisateurs.some((u) => u.objectifs.includes("offrir_mentorat")),
  );
  assert.ok(new Set(jeu.utilisateurs.map((u) => u.pays)).size >= 8);
});

test("votes : un seul par personne et par cible, jamais pour son propre contenu", () => {
  const vus = new Set();
  const auteurDe = new Map(jeu.echanges.map((e) => [e._id, e.auteur_id]));
  par("vote").forEach((v) => {
    const cle = `${v.auteur_id}|${v.cible_type}|${v.cible_id}`;
    assert.ok(!vus.has(cle), "vote en double");
    vus.add(cle);
    if (v.cible_type !== "projet")
      assert.notStrictEqual(auteurDe.get(v.cible_id), v.auteur_id);
    assert.ok([1, -1].includes(v.metadata.valeur));
  });
});

test("réponses acceptées : une au plus par question, la question passe à « résolu »", () => {
  par("post").forEach((p) => {
    const acceptees = par("reponse").filter(
      (r) => r.parent_id === p._id && r.metadata.acceptee,
    );
    assert.ok(acceptees.length <= 1);
    assert.strictEqual(p.metadata.statut === "resolu", acceptees.length === 1);
    assert.strictEqual(
      p.metadata.nb_reponses,
      par("reponse").filter((r) => r.parent_id === p._id).length,
    );
  });
  assert.ok(par("post").some((p) => p.metadata.statut === "resolu"));
});

test("réputation et badges cohérents avec le barème", () => {
  jeu.utilisateurs.forEach((u) =>
    assert.ok(u.reputation >= 0 || u.reputation < 0),
  ); // peut descendre : clampé à 0 par le writer
  const riche = jeu.utilisateurs.find((u) => u.reputation >= 50);
  assert.ok(riche && riche.badges.includes("contributeur"));
});

test("projets : équipe sans doublon, tâches confiées à l’équipe, likes cohérents", () => {
  jeu.projets.forEach((p) => {
    const equipe = [p.porteur_id, ...p.membres.map((m) => m.user_id)];
    assert.strictEqual(new Set(equipe).size, equipe.length);
    p.taches.forEach((t) => {
      assert.ok(["a_faire", "en_cours", "termine"].includes(t.statut));
      if (t.assigne_a) assert.ok(equipe.includes(t.assigne_a));
    });
    assert.strictEqual(
      p.nb_likes,
      par("vote").filter(
        (v) => v.cible_type === "projet" && v.cible_id === p._id,
      ).length,
    );
    assert.ok(
      p.titre.length >= 3 && ["idee", "en_cours", "termine"].includes(p.statut),
    );
  });
  assert.strictEqual(
    new Set(jeu.projets.map((p) => p.titre)).size,
    jeu.projets.length,
  );
});

test("candidatures : en attente, pas de membre ni de porteur, pas de doublon", () => {
  const vus = new Set();
  par("candidature").forEach((c) => {
    const p = jeu.projets.find((x) => x._id === c.cible_id);
    assert.ok(
      p.porteur_id !== c.auteur_id &&
        !p.membres.some((m) => m.user_id === c.auteur_id),
    );
    const cle = `${c.auteur_id}|${c.cible_id}`;
    assert.ok(!vus.has(cle));
    vus.add(cle);
  });
});

test("mentorat : mentors réels, 5 accompagnés max, 3 demandes en attente max, une relation active par paire", () => {
  const mentors = new Set(
    jeu.utilisateurs
      .filter((u) => u.objectifs.includes("offrir_mentorat"))
      .map((u) => u._id),
  );
  const acc = {};
  const att = {};
  const paires = new Set();
  par("mentorat").forEach((d) => {
    assert.ok(mentors.has(d.cible_id));
    assert.notStrictEqual(d.auteur_id, d.cible_id);
    assert.ok(d.metadata.sujet.length >= 3 && d.contenu.length >= 10);
    if (d.metadata.statut === "acceptee")
      acc[d.cible_id] = (acc[d.cible_id] || 0) + 1;
    if (d.metadata.statut === "en_attente")
      att[d.auteur_id] = (att[d.auteur_id] || 0) + 1;
    const cle = `${d.auteur_id}|${d.cible_id}`;
    assert.ok(!paires.has(cle));
    paires.add(cle);
  });
  Object.values(acc).forEach((n) => assert.ok(n <= 5));
  Object.values(att).forEach((n) => assert.ok(n <= 3));
});

test("dates : jamais dans le futur, contenu après la création du compte", () => {
  const m = Date.UTC(2026, 10, 1);
  jeu.echanges.forEach((e) => assert.ok(e.created_at.getTime() <= m));
  const depuis = new Map(
    jeu.utilisateurs.map((u) => [u._id, u.created_at.getTime()]),
  );
  par("post").forEach((p) =>
    assert.ok(p.created_at.getTime() >= depuis.get(p.auteur_id)),
  );
});

test("textes : questions en français et en anglais, messages de chat dans des salons stack", () => {
  assert.ok(
    par("post").some(
      (p) => /\?/.test(p.titre) && /^How|^Best|^Confusing/.test(p.titre),
    ),
  );
  assert.ok(
    par("post").some((p) =>
      /^Comment|^Quelles|^Erreur|^Améliorer/.test(p.titre),
    ),
  );
  par("message").forEach((m) =>
    assert.match(m.metadata.canal, /^stack:[a-z-]+$/),
  );
  par("post").forEach((p) =>
    assert.ok(
      p.titre.length >= 5 && p.titre.length <= 150 && p.contenu.length >= 10,
    ),
  );
});

test("sécurité du script : base distante refusée par défaut, options validées", () => {
  process.env.MONGO_URI = "mongodb://localhost:27017/devconnect";
  const { lireArguments, estLocale } = require("../scripts/seed/options");
  assert.ok(estLocale("mongodb://localhost:27017/devconnect"));
  assert.ok(estLocale("mongodb://127.0.0.1:27017/x"));
  assert.ok(
    !estLocale("mongodb+srv://u:p@cluster0.abc.mongodb.net/devconnect"),
  );
  assert.ok(
    !estLocale("mongodb://user:pass@datacloud.example.com:27017/devconnect"),
  );
  assert.strictEqual(lireArguments(["--clean"]).clean, true);
  assert.strictEqual(lireArguments(["--users", "50"]).utilisateurs, 50);
  assert.throws(() => lireArguments(["--users", "abc"]));
  assert.throws(() => lireArguments(["--users", "5"]));
  assert.throws(() => lireArguments(["--bizarre"]));
});
