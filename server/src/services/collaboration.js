// Règles de la collaboration sur un projet (candidatures, membres) et notifications associées.
// Les règles sont des fonctions pures (testables sans base) ; les routes ne font que les appeler.

const MAX_CANDIDATURES_PAR_PROJET = 3; // par personne : évite le harcèlement d'un porteur après plusieurs refus

const id = (x) => String(x && (x._id || x.id || x));

/* Peut-on déposer une candidature ?  Retourne null si oui, sinon { status, message }.
   - projet : { porteur_id, statut, membres }
   - enAttente : la personne a déjà une candidature en attente sur ce projet
   - nbPrecedentes : nombre total de ses candidatures sur ce projet (tous états) */
function verifierCandidature({
  projet,
  userId,
  enAttente = false,
  nbPrecedentes = 0,
}) {
  if (id(projet.porteur_id) === id(userId))
    return { status: 400, message: "Tu es le porteur de ce projet" };
  if ((projet.membres || []).some((m) => id(m.user_id) === id(userId)))
    return { status: 409, message: "Tu fais déjà partie de l’équipe" };
  if (projet.statut === "termine")
    return {
      status: 409,
      message: "Ce projet est terminé : il ne recrute plus",
    };
  if (enAttente)
    return {
      status: 409,
      message: "Tu as déjà une candidature en attente pour ce projet",
    };
  if (nbPrecedentes >= MAX_CANDIDATURES_PAR_PROJET)
    return {
      status: 409,
      message: "Tu as atteint le nombre maximal de candidatures pour ce projet",
    };
  return null;
}

// Rôle donné au membre accepté : celui choisi par le porteur, sinon celui demandé, sinon « membre ».
const roleFinal = (candidature, roleChoisi) =>
  roleChoisi || candidature?.metadata?.role || "membre";

const TEXTES = {
  candidature: (pseudo, titre) =>
    `${pseudo} souhaite rejoindre ton projet « ${titre} »`,
  candidature_acceptee: (pseudo, titre) =>
    `${pseudo} a accepté ta candidature au projet « ${titre} »`,
  candidature_refusee: (pseudo, titre) =>
    `${pseudo} a décliné ta candidature au projet « ${titre} »`,
};

const parDefaut = {
  envoyer: (opts) => require("../communication").notifier.envoyer(opts),
};

/* Prévient l'autre personne. N'échoue jamais : un incident de notification ne doit pas bloquer l'action. */
async function notifierCollab(
  { kind, destinataireId, acteur, projet },
  deps = parDefaut,
) {
  try {
    if (!TEXTES[kind])
      throw new Error(`kind collaboration inconnu « ${kind} »`);
    const acteurId = id(acteur);
    if (!destinataireId || id(destinataireId) === acteurId) return null;
    return await deps.envoyer({
      destinataireId: id(destinataireId),
      acteurId,
      kind,
      message: TEXTES[kind](acteur.pseudo || "Quelqu’un", projet.titre),
      sujet: { type: "projet", id: id(projet) },
    });
  } catch (e) {
    console.error("[collaboration] notification :", e.message);
    return null;
  }
}

// Format envoyé au client
function serialiserCandidature(doc, candidat = null) {
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const m = o.metadata || {};
  const c = candidat && typeof candidat === "object" ? candidat : null;
  return {
    id: String(o._id),
    projet_id: String(o.cible_id),
    statut: m.statut,
    role: m.role || null,
    role_final: m.role_final || null,
    message: o.contenu || "",
    created_at: o.created_at,
    decide_le: m.decide_le || null,
    ...(c
      ? {
          candidat: {
            id: String(c._id),
            pseudo: c.pseudo,
            photo: c.profil?.photo || null,
            reputation: c.reputation ?? 0,
            pays: c.pays || null,
            ville: c.ville || null,
            stacks: c.stacks || [],
          },
        }
      : {}),
  };
}

module.exports = {
  MAX_CANDIDATURES_PAR_PROJET,
  verifierCandidature,
  roleFinal,
  TEXTES,
  notifierCollab,
  serialiserCandidature,
};
