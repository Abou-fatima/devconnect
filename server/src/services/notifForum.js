// Notifications du forum : réponse reçue, réponse acceptée, vote.
// Un incident de notification ne doit JAMAIS faire échouer l'action de l'utilisateur : tout est journalisé et ignoré.

const TEXTES = {
  reponse: (pseudo) => `${pseudo} a répondu à ta question`,
  reponse_acceptee: (pseudo) => `${pseudo} a accepté ta réponse`,
  vote: (pseudo) => `${pseudo} a voté pour ta contribution`
};

// Par défaut : le vrai notifier et la vraie base (chargés à la demande, pour que les tests n'en aient pas besoin).
const parDefaut = {
  envoyer: (opts) => require('../communication').notifier.envoyer(opts),
  existe: (filtre) => require('../models/Echange').exists(filtre)
};

/* notifierForum({ kind, destinataireId, acteur: { _id, pseudo }, sujet, unique })
   - sujet : { type: 'post', id } (toujours l'identifiant de la QUESTION, même pour un vote sur une réponse)
   - unique : true = pas de seconde notification identique du même acteur pour le même sujet (évite le spam
     quand on vote, retire, puis revote). */
async function notifierForum({ kind, destinataireId, acteur, sujet, unique = false }, deps = parDefaut) {
  try {
    if (!TEXTES[kind]) throw new Error(`kind forum inconnu « ${kind} »`);
    if (!destinataireId || !acteur) return null;
    const acteurId = String(acteur._id || acteur.id);
    if (String(destinataireId) === acteurId) return null; // jamais d'auto-notification

    if (unique && sujet?.id) {
      const deja = await deps.existe({
        type: 'notification', cible_type: 'user', cible_id: destinataireId, auteur_id: acteurId,
        'metadata.kind': kind, 'metadata.sujet.id': String(sujet.id)
      });
      if (deja) return null;
    }
    return await deps.envoyer({
      destinataireId: String(destinataireId), acteurId, kind,
      message: TEXTES[kind](acteur.pseudo || 'Quelqu’un'),
      sujet: sujet ? { type: sujet.type, id: String(sujet.id) } : null
    });
  } catch (e) {
    console.error('[forum] notification :', e.message);
    return null;
  }
}

module.exports = { notifierForum, TEXTES };
