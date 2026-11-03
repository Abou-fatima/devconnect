const test = require("node:test");
const assert = require("node:assert/strict");
const { lireArguments } = require("../scripts/admin/options");
const {
  derniersJours,
  debutPeriode,
  completerSerie,
  parRole,
  idQuestion,
} = require("../src/services/stats");

test("commande admin : e-mail seul = rôle admin, e-mail en minuscules", () => {
  assert.deepEqual(lireArguments(["Ousmane@Exemple.com"]), {
    email: "ousmane@exemple.com",
    role: "admin",
    liste: false,
  });
});

test("commande admin : rôle choisi, liste, et erreurs claires", () => {
  assert.equal(
    lireArguments(["a@b.co", "--role", "moderateur"]).role,
    "moderateur",
  );
  assert.equal(lireArguments(["--liste"]).liste, true);
  assert.throws(() => lireArguments([]), /e-mail/);
  assert.throws(() => lireArguments(["pas-un-email"]), /invalide/);
  assert.throws(
    () => lireArguments(["a@b.co", "--role", "roi"]),
    /Rôle inconnu/,
  );
  assert.throws(() => lireArguments(["a@b.co", "--force"]), /Option inconnue/);
  assert.throws(() => lireArguments(["a@b.co", "c@d.co"]), /Une seule/);
});

test("statistiques : 14 jours consécutifs, le dernier est aujourd'hui (UTC)", () => {
  const j = derniersJours(14, new Date("2026-11-03T23:30:00Z"));
  assert.equal(j.length, 14);
  assert.equal(j[13], "2026-11-03");
  assert.equal(j[0], "2026-10-21");
  assert.equal(
    debutPeriode(14, new Date("2026-11-03T08:00:00Z")).toISOString(),
    "2026-10-21T00:00:00.000Z",
  );
});

test("statistiques : jours sans inscription remplis par 0", () => {
  const jours = derniersJours(3, new Date("2026-11-03T10:00:00Z"));
  const s = completerSerie([{ _id: "2026-11-02", n: 4 }], jours);
  assert.deepEqual(s, [
    { jour: "2026-11-01", n: 0 },
    { jour: "2026-11-02", n: 4 },
    { jour: "2026-11-03", n: 0 },
  ]);
  assert.deepEqual(
    completerSerie(undefined, jours).map((x) => x.n),
    [0, 0, 0],
  );
});

test("statistiques : rôles, sans rôle = dev", () => {
  assert.deepEqual(
    parRole([
      { _id: "admin", n: 2 },
      { _id: null, n: 5 },
      { _id: "dev", n: 1 },
    ]),
    { dev: 6, moderateur: 0, admin: 2 },
  );
  assert.deepEqual(parRole([]), { dev: 0, moderateur: 0, admin: 0 });
});

test("contenu signalé : retrouver la question à ouvrir", () => {
  const parents = new Map([
    ["r1", { _id: "r1", type: "reponse", parent_id: "q1" }],
    ["q1", { _id: "q1", type: "post" }],
  ]);
  assert.equal(idQuestion({ _id: "q9", type: "post" }, parents), "q9");
  assert.equal(
    idQuestion({ _id: "r1", type: "reponse", parent_id: "q1" }, parents),
    "q1",
  );
  assert.equal(
    idQuestion({ _id: "c1", type: "commentaire", parent_id: "r1" }, parents),
    "q1",
  );
  assert.equal(
    idQuestion({ _id: "c2", type: "commentaire", parent_id: "q1" }, parents),
    "q1",
  );
  assert.equal(
    idQuestion(
      { _id: "c3", type: "commentaire", parent_id: "inconnu" },
      parents,
    ),
    null,
  );
  assert.equal(idQuestion({ _id: "c4", type: "commentaire" }, parents), null);
});
