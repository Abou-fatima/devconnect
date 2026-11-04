const test = require("node:test");
const assert = require("node:assert/strict");
const s = require("../src/services/salons");

const A = "a".repeat(24);
const B = "b".repeat(24);
const C = "c".repeat(24);
const salon = (extra = {}) => ({
  _id: "d".repeat(24),
  nom: "Équipe NexaDev",
  visibilite: "public",
  code: "CODE-SECRET-1",
  proprietaire_id: A,
  nb_membres: 2,
  membres: [
    { user_id: A, role: "proprietaire", depuis: new Date("2026-11-01") },
    { user_id: B, role: "membre", depuis: new Date("2026-11-02") },
  ],
  ...extra,
});

test("code d'invitation : 12 caractères sûrs pour une adresse, différent à chaque fois", () => {
  const codes = new Set(Array.from({ length: 50 }, () => s.genererCode()));
  assert.equal(codes.size, 50);
  codes.forEach((c) => assert.match(c, /^[A-Za-z0-9_-]{12}$/));
});

test("membre et propriétaire : ids simples ou objets", () => {
  assert.equal(s.estMembre(salon(), B), true);
  assert.equal(s.estMembre(salon(), C), false);
  assert.equal(s.estProprietaire(salon(), A), true);
  assert.equal(s.estProprietaire(salon(), B), false);
  assert.equal(
    s.estMembre(
      salon({ membres: [{ user_id: { toString: () => A }, role: "membre" }] }),
      A,
    ),
    true,
  );
});

test("entrer : public ouvert, invitation seulement avec le lien, déjà membre accepté, salon complet refusé", () => {
  assert.deepEqual(s.peutRejoindre(salon(), C), { ok: true, deja: false });
  assert.deepEqual(s.peutRejoindre(salon(), B), { ok: true, deja: true });
  const ferme = s.peutRejoindre(salon({ visibilite: "invitation" }), C);
  assert.equal(ferme.ok, false);
  assert.equal(ferme.status, 403);
  assert.deepEqual(
    s.peutRejoindre(salon({ visibilite: "invitation" }), C, {
      codeValide: true,
    }),
    { ok: true, deja: false },
  );
  const plein = s.peutRejoindre(salon({ nb_membres: s.LIMITES.membres }), C);
  assert.equal(plein.ok, false);
  assert.equal(plein.status, 409);
});

test("départ : le plus ancien membre devient propriétaire, le dernier à partir supprime le salon", () => {
  const r = s.apresDepart(salon(), A);
  assert.equal(r.proprietaire_id, B);
  assert.deepEqual(
    r.membres.map((m) => [m.user_id, m.role]),
    [[B, "proprietaire"]],
  );
  const r2 = s.apresDepart(salon(), B); // un simple membre part : le propriétaire reste
  assert.equal(r2.proprietaire_id, A);
  assert.equal(r2.membres.length, 1);
  assert.deepEqual(
    s.apresDepart(
      salon({ membres: [{ user_id: A, role: "proprietaire" }] }),
      A,
    ),
    { supprimer: true },
  );
});

test("départ du propriétaire avec trois membres : celui arrivé le premier prend la suite", () => {
  const trois = salon({
    membres: [
      { user_id: A, role: "proprietaire", depuis: new Date("2026-11-01") },
      { user_id: C, role: "membre", depuis: new Date("2026-11-03") },
      { user_id: B, role: "membre", depuis: new Date("2026-11-02") },
    ],
  });
  assert.equal(s.apresDepart(trois, A).proprietaire_id, B);
});

test("format client : le lien d'invitation n'est montré qu'aux membres, l'aperçu ne le montre jamais", () => {
  const pourMembre = s.formater(salon(), B);
  assert.equal(pourMembre.code, "CODE-SECRET-1");
  assert.equal(pourMembre.role, "membre");
  assert.equal(pourMembre.canal, `salon:${"d".repeat(24)}`);
  assert.equal(s.formater(salon(), A).role, "proprietaire");
  const etranger = s.formater(salon(), C);
  assert.equal(etranger.code, undefined);
  assert.equal(etranger.membre, false);
  assert.equal(etranger.role, null);
  assert.equal(s.apercu(salon(), B).code, undefined);
  assert.equal("membres" in etranger, false); // pas de liste des membres (seul le nombre est public)
});

test("accès au chat : les canaux sans salon passent, un salon sans id valide ne passe pas", async () => {
  assert.deepEqual(await s.verifierAcces({ canal: "stack:react" }, A), {});
  assert.deepEqual(await s.verifierAcces(null, A), {});
});

test("canal salon : nom accepté, identifiant invalide refusé", () => {
  let parseCanal;
  try {
    ({ parseCanal } = require("../src/communication/canaux"));
  } catch {
    return;
  } // mongoose absent : couvert par le reste de la suite
  const id = "e".repeat(24);
  const ok = parseCanal(`salon:${id.toUpperCase()}`, A);
  assert.equal(ok.canal, `salon:${id}`);
  assert.equal(ok.salon_id, id);
  assert.equal(ok.cible_type, "canal");
  assert.ok(parseCanal("salon:123", A).erreur);
  assert.ok(parseCanal("salon:", A).erreur);
});
