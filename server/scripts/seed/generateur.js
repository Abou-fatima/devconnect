// Générateur du jeu de démonstration : fonction pure et déterministe (même graine = mêmes données).
// Il ne touche pas à la base : seed-demo.js écrit le résultat. Les identifiants sont des chaînes hexadécimales de 24 caractères.
const c = require("./contenu");
const { effetVote, BAREME, badgesPour } = require("../../src/services/bareme");

const DOMAINE = "demo.devconnect.local";
const JOUR = 86400000;
const ANGLOPHONES = new Set(["NG", "GH"]);

function creerAleatoire(graine) {
  let a = graine >>> 0;
  const suivant = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const entier = (min, max) => min + Math.floor(suivant() * (max - min + 1));
  const choix = (liste) => liste[Math.floor(suivant() * liste.length)];
  const proba = (p) => suivant() < p;
  const extraire = (liste, n) => {
    const copie = [...liste];
    const res = [];
    while (res.length < n && copie.length)
      res.push(copie.splice(Math.floor(suivant() * copie.length), 1)[0]);
    return res;
  };
  const pondere = (poids) => {
    const total = Object.values(poids).reduce((s, x) => s + x, 0);
    let r = suivant() * total;
    for (const [k, p] of Object.entries(poids)) {
      r -= p;
      if (r < 0) return k;
    }
    return Object.keys(poids)[0];
  };
  return { suivant, entier, choix, proba, extraire, pondere };
}

const sansAccent = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const remplir = (txt, s) => txt.replace(/\{s\}/g, s);

/* options : { utilisateurs, questions, projets, graine, maintenant } */
function genererJeu({
  utilisateurs = 200,
  questions = 60,
  projets = 32,
  graine = 2026,
  maintenant = Date.now(),
} = {}) {
  const R = creerAleatoire(graine);
  let compteur = 0;
  const oid = () => {
    compteur += 1;
    return (
      graine.toString(16).padStart(8, "0") +
      compteur.toString(16).padStart(16, "0")
    ).slice(-24);
  };
  const date = (joursMin, joursMax) =>
    new Date(
      maintenant - (joursMin + R.suivant() * (joursMax - joursMin)) * JOUR,
    );
  const apres = (d, heures) =>
    new Date(Math.min(maintenant, d.getTime() + heures * 3600000)); // jamais dans le futur

  // ---------- Utilisateurs
  const users = [];
  const pseudos = new Set();
  for (let i = 0; i < utilisateurs; i += 1) {
    const prenom = R.choix(c.PRENOMS);
    const nom = R.choix(c.NOMS);
    let pseudo = `${sansAccent(prenom)}_${sansAccent(nom)}`;
    let n = 2;
    while (pseudos.has(pseudo.toLowerCase())) {
      pseudo = `${sansAccent(prenom)}_${sansAccent(nom)}${n}`;
      n += 1;
    }
    pseudos.add(pseudo.toLowerCase());
    const pays = R.pondere(c.POIDS_PAYS);
    const lang = ANGLOPHONES.has(pays) ? "en" : "fr";
    const niveau = R.pondere({
      debutant: 4,
      intermediaire: 4,
      avance: 2,
      expert: 1,
    });
    const objectifs = R.extraire(
      ["apprendre", "collaborer", "mentorat", "emploi", "projet_perso"],
      R.entier(1, 2),
    );
    if (["avance", "expert"].includes(niveau) && R.proba(0.4))
      objectifs.push("offrir_mentorat");
    users.push({
      _id: oid(),
      pseudo,
      email: `${pseudo}@${DOMAINE}`,
      role: "dev",
      lang,
      profil: {
        bio: R.choix(c.BIOS[lang]),
        niveau,
        liens: { github: `https://github.com/${pseudo}` },
      },
      stacks: R.extraire(c.STACKS, R.entier(2, 5)),
      objectifs,
      badges: [],
      reputation: 0,
      pays,
      ville: R.choix(c.PAYS[pays]),
      created_at: date(60, 120),
    });
  }
  const parId = new Map(users.map((u) => [u._id, u]));
  const hasard = (sauf = []) => {
    let u;
    do {
      u = R.choix(users);
    } while (sauf.includes(u._id));
    return u;
  };
  const gagner = (userId, pts) => {
    parId.get(userId).reputation += pts;
  };

  const echanges = [];
  const voter = (cible, cibleType, auteurId) => {
    const nb = R.entier(0, Math.min(12, users.length - 1));
    const votants = new Set();
    let somme = 0;
    for (let k = 0; k < nb; k += 1) {
      const v = hasard([auteurId, ...votants]);
      votants.add(v._id);
      const valeur = R.proba(0.85) ? 1 : -1;
      somme += valeur;
      echanges.push({
        _id: oid(),
        type: "vote",
        auteur_id: v._id,
        cible_type: cibleType,
        cible_id: cible._id,
        metadata: { valeur },
        nb_votes: 0,
        nb_vues: 0,
        created_at: apres(cible.created_at, R.entier(1, 48)),
      });
      gagner(auteurId, effetVote(0, valeur, cibleType).delta_reputation);
    }
    cible.nb_votes = somme;
  };

  // ---------- Forum : questions, réponses, réponses acceptées, commentaires
  const posts = [];
  const reponses = [];
  for (let i = 0; i < questions; i += 1) {
    const auteur = R.choix(users);
    const lang =
      auteur.lang === "en" && R.proba(0.8) ? "en" : R.proba(0.1) ? "en" : "fr";
    const modele = R.choix(c.QUESTIONS[lang]);
    const stack = R.choix(auteur.stacks);
    const tags = [
      stack,
      ...R.extraire(
        c.STACKS.filter((x) => x !== stack),
        R.entier(0, 2),
      ),
    ];
    const creation = date(1, 55);
    const post = {
      _id: oid(),
      type: "post",
      auteur_id: auteur._id,
      titre: remplir(modele.t, stack).replace(/^./, (x) => x.toUpperCase()),
      contenu: remplir(modele.c, stack),
      nb_vues: R.entier(5, 400),
      nb_votes: 0,
      created_at: creation,
      metadata: {
        tags,
        statut: "ouvert",
        nb_reponses: 0,
        suiveurs: [auteur._id],
        derniere_activite: creation,
      },
    };
    posts.push(post);
    echanges.push(post);
    voter(post, "post", auteur._id);

    const nbRep = R.proba(0.15) ? 0 : R.entier(1, 5);
    const lesReps = [];
    const repondants = new Set([auteur._id]);
    for (let k = 0; k < nbRep; k += 1) {
      const r = hasard([...repondants]);
      repondants.add(r._id);
      const rep = {
        _id: oid(),
        type: "reponse",
        auteur_id: r._id,
        parent_id: post._id,
        cible_type: "post",
        cible_id: post._id,
        contenu: remplir(modele.r, stack),
        nb_votes: 0,
        nb_vues: 0,
        metadata: { acceptee: false },
        created_at: apres(creation, R.entier(1, 72)),
      };
      lesReps.push(rep);
      reponses.push(rep);
      echanges.push(rep);
      voter(rep, "reponse", r._id);
      post.metadata.suiveurs.push(r._id);
      post.metadata.derniere_activite = rep.created_at;
    }
    post.metadata.nb_reponses = lesReps.length;
    if (lesReps.length && R.proba(0.55)) {
      const meilleure = R.choix(lesReps);
      meilleure.metadata.acceptee = true;
      post.metadata.statut = "resolu";
      post.metadata.reponse_acceptee_id = meilleure._id;
      gagner(meilleure.auteur_id, BAREME.reponse_acceptee);
    }
    if (R.proba(0.4)) {
      const cible = R.choix([post, ...lesReps]);
      const com = hasard([]);
      echanges.push({
        _id: oid(),
        type: "commentaire",
        auteur_id: com._id,
        parent_id: cible._id,
        cible_type: cible.type,
        cible_id: cible._id,
        contenu: R.choix(c.COMMENTAIRES[lang]),
        nb_votes: 0,
        nb_vues: 0,
        metadata: {},
        created_at: apres(cible.created_at, R.entier(1, 24)),
      });
    }
  }

  // ---------- Notifications (réponses reçues)
  reponses.slice(0, 120).forEach((rep) => {
    const post = posts.find((p) => p._id === rep.parent_id);
    if (!post || post.auteur_id === rep.auteur_id) return;
    echanges.push({
      _id: oid(),
      type: "notification",
      auteur_id: rep.auteur_id,
      cible_type: "user",
      cible_id: post.auteur_id,
      contenu: `${parId.get(rep.auteur_id).pseudo} a répondu à ta question`,
      nb_votes: 0,
      nb_vues: 0,
      metadata: {
        kind: "reponse",
        lue: R.proba(0.5),
        sujet: { type: "post", id: post._id },
      },
      created_at: rep.created_at,
    });
  });

  // ---------- Projets : équipes, tâches, likes, commentaires, candidatures
  const listeProjets = [];
  const pris = new Map();
  const base = c.PROJETS.fr.concat(c.PROJETS.en);
  for (let i = 0; i < projets; i += 1) {
    const [nom, description, categorie] = base[i % base.length];
    const rang = Math.floor(i / base.length);
    const porteur = R.choix(users);
    const titre = rang === 0 ? nom : `${nom} ${porteur.ville}`;
    const equipe = R.extraire(
      users.filter((u) => u._id !== porteur._id),
      R.proba(0.3) ? 0 : R.entier(1, 3),
    );
    const creation = date(1, 50);
    const statut = R.pondere({ idee: 3, en_cours: 5, termine: 2 });
    const personnes = [porteur, ...equipe];
    const nbTaches = statut === "idee" ? R.entier(0, 2) : R.entier(2, 7);
    const lang = i % base.length >= c.PROJETS.fr.length ? "en" : "fr";
    const taches = Array.from({ length: nbTaches }, () => ({
      _id: oid(),
      titre: R.choix(c.TACHES[lang]),
      assigne_a: R.proba(0.8) ? R.choix(personnes)._id : undefined,
      statut:
        statut === "termine"
          ? "termine"
          : R.pondere({ a_faire: 4, en_cours: 3, termine: 3 }),
    }));
    const projet = {
      _id: oid(),
      porteur_id: porteur._id,
      titre,
      description,
      categorie,
      membres: equipe.map((u) => ({
        user_id: u._id,
        role: R.choix(c.ROLES_PROJET),
      })),
      roles_recherches: R.extraire(c.ROLES_PROJET, R.entier(1, 3)),
      taches,
      stack: R.extraire(
        porteur.stacks.concat(R.extraire(c.STACKS, 2)),
        R.entier(2, 4),
      ),
      liens: R.proba(0.5)
        ? { github: `https://github.com/${porteur.pseudo}/${sansAccent(nom)}` }
        : {},
      statut,
      nb_vues: R.entier(10, 600),
      nb_likes: 0,
      created_at: creation,
    };
    listeProjets.push(projet);
    pris.set(projet._id, new Set(personnes.map((u) => u._id)));

    const nbLikes = R.entier(0, 14);
    const aimants = R.extraire(
      users.filter((u) => u._id !== porteur._id),
      nbLikes,
    );
    aimants.forEach((u) =>
      echanges.push({
        _id: oid(),
        type: "vote",
        auteur_id: u._id,
        cible_type: "projet",
        cible_id: projet._id,
        metadata: { valeur: 1 },
        nb_votes: 0,
        nb_vues: 0,
        created_at: apres(creation, R.entier(1, 400)),
      }),
    );
    projet.nb_likes = aimants.length;
    for (let k = R.entier(0, 3); k > 0; k -= 1)
      echanges.push({
        _id: oid(),
        type: "commentaire",
        auteur_id: R.choix(users)._id,
        cible_type: "projet",
        cible_id: projet._id,
        contenu: R.choix(c.COMMENTAIRES[lang]),
        nb_votes: 0,
        nb_vues: 0,
        metadata: {},
        created_at: apres(creation, R.entier(1, 300)),
      });
    if (statut !== "termine") {
      R.extraire(
        users.filter((u) => !pris.get(projet._id).has(u._id)),
        R.entier(0, 2),
      ).forEach((u) =>
        echanges.push({
          _id: oid(),
          type: "candidature",
          auteur_id: u._id,
          cible_type: "projet",
          cible_id: projet._id,
          contenu: R.choix(c.MESSAGES_CANDIDATURE),
          nb_votes: 0,
          nb_vues: 0,
          metadata: {
            statut: "en_attente",
            role: R.choix(projet.roles_recherches),
          },
          created_at: apres(creation, R.entier(2, 200)),
        }),
      );
    }
  }

  // ---------- Mentorat : respecte les limites (5 accompagnés par mentor, 3 demandes en attente par personne, une relation active par paire)
  const mentors = users.filter((u) => u.objectifs.includes("offrir_mentorat"));
  const accompagnes = new Map();
  const enAttente = new Map();
  const paires = new Set();
  if (mentors.length) {
    for (let i = 0; i < Math.min(60, Math.floor(utilisateurs / 3)); i += 1) {
      const mentor = R.choix(mentors);
      const mentee = hasard([mentor._id]);
      let statut = R.pondere({
        en_attente: 3,
        acceptee: 3,
        refusee: 1,
        terminee: 1,
      });
      const cle = `${mentee._id}>${mentor._id}`;
      if (paires.has(cle)) continue;
      if (statut === "acceptee" && (accompagnes.get(mentor._id) || 0) >= 5)
        statut = "terminee";
      if (statut === "en_attente" && (enAttente.get(mentee._id) || 0) >= 3)
        statut = "refusee";
      if (statut === "acceptee")
        accompagnes.set(mentor._id, (accompagnes.get(mentor._id) || 0) + 1);
      if (statut === "en_attente")
        enAttente.set(mentee._id, (enAttente.get(mentee._id) || 0) + 1);
      paires.add(cle);
      const stack = R.choix(mentor.stacks);
      const creation = date(1, 30);
      echanges.push({
        _id: oid(),
        type: "mentorat",
        auteur_id: mentee._id,
        cible_type: "user",
        cible_id: mentor._id,
        contenu: R.choix(c.MESSAGES_MENTORAT),
        nb_votes: 0,
        nb_vues: 0,
        metadata: {
          statut,
          sujet: remplir(R.choix(c.SUJETS_MENTORAT), stack),
          ...(statut !== "en_attente"
            ? { decide_le: apres(creation, 24) }
            : {}),
        },
        created_at: creation,
      });
    }
  }

  // ---------- Chat : quelques messages dans les salons par technologie
  const compteSalons = {};
  users.forEach((u) =>
    u.stacks.forEach((s) => {
      compteSalons[s] = (compteSalons[s] || 0) + 1;
    }),
  );
  Object.entries(compteSalons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .forEach(([s]) => {
      for (let k = 0; k < 8; k += 1) {
        const u = R.choix(users.filter((x) => x.stacks.includes(s)));
        echanges.push({
          _id: oid(),
          type: "message",
          auteur_id: u._id,
          cible_type: "canal",
          contenu: R.choix(c.MESSAGES[u.lang]),
          nb_votes: 0,
          nb_vues: 0,
          metadata: { canal: `stack:${s}` },
          created_at: date(0, 7),
        });
      }
    });

  users.forEach((u) => {
    u.badges = badgesPour(u.reputation);
  });
  return {
    utilisateurs: users,
    echanges,
    projets: listeProjets,
    domaine: DOMAINE,
  };
}

module.exports = { genererJeu, creerAleatoire, DOMAINE };
