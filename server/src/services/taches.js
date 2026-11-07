// Règles de l'espace projet (tableau de tâches). Fonctions pures, testables sans base.

const STATUTS = ['a_faire', 'en_cours', 'termine'];
const MAX_TACHES = 100;

const id = (x) => String(x && (x._id || x.user_id || x.id || x));

const estPorteur = (projet, userId) => id(projet.porteur_id) === id(userId);
const estMembre = (projet, userId) => (projet.membres || []).some((m) => id(m.user_id) === id(userId));
/* Seuls le porteur et les membres travaillent dans l'espace projet. */
const peutTravailler = (projet, userId) => Boolean(userId) && (estPorteur(projet, userId) || estMembre(projet, userId));

/* Une tâche ne peut être confiée qu'au porteur ou à un membre. null si ok. */
function verifierAssigne(projet, assigneId) {
  if (!assigneId) return null;
  return peutTravailler(projet, assigneId) ? null : { status: 400, message: 'Cette personne ne fait pas partie du projet' };
}

const verifierCapacite = (nb) => (nb >= MAX_TACHES ? { status: 409, message: `Un projet ne peut pas dépasser ${MAX_TACHES} tâches` } : null);

const serialiserTache = (t) => ({ id: String(t._id), titre: t.titre, statut: STATUTS.includes(t.statut) ? t.statut : 'a_faire', assigne_a: t.assigne_a ? String(t.assigne_a) : null });

const TEXTE = (pseudo, tache, projet) => `${pseudo} vous a confié la tâche « ${tache} » (${projet})`;

const parDefaut = { envoyer: (opts) => require('../communication').notifier.envoyer(opts) };

/* Prévient la personne à qui une tâche est confiée (kind « tache »). N'échoue jamais. */
async function notifierTache({ destinataireId, acteur, projet, tache }, deps = parDefaut) {
  try {
    const acteurId = id(acteur);
    if (!destinataireId || id(destinataireId) === acteurId) return null;
    return await deps.envoyer({
      destinataireId: id(destinataireId), acteurId, kind: 'tache',
      message: TEXTE(acteur.pseudo || 'Quelqu’un', tache.titre, projet.titre),
      sujet: { type: 'projet', id: id(projet._id), tache: String(tache._id) }
    });
  } catch (e) {
    console.error('[taches] notification :', e.message);
    return null;
  }
}

module.exports = { STATUTS, MAX_TACHES, peutTravailler, estPorteur, verifierAssigne, verifierCapacite, serialiserTache, notifierTache };
