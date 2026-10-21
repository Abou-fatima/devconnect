const Echange = require('../models/Echange');
const reputation = require('./reputation');
const { BAREME } = require('./bareme');

// Champs de l'auteur renvoyés avec un post / une réponse (jamais d'email ni de téléphone)
const AUTEUR_FIELDS = 'pseudo profil.photo reputation badges pays';

const auteurPublic = (u) => (u && u.pseudo
  ? { id: String(u._id), pseudo: u.pseudo, photo: (u.profil && u.profil.photo) || null, reputation: u.reputation || 0, badges: u.badges || [], pays: u.pays || null }
  : null);

const sid = (x) => (x ? String(x) : null);

// Document Mongo (lean, auteur peuplé) -> objet renvoyé par l'API.
// opts : { resume, votes: Map(id -> 1|-1), moi: idUtilisateur, admin }
function formater(d, opts = {}) {
  const m = d.metadata || {};
  const out = {
    id: sid(d._id),
    type: d.type,
    auteur: auteurPublic(d.auteur_id),
    audio_url: d.audio_url || null,
    transcription: d.transcription || null,
    nb_votes: d.nb_votes || 0,
    parent_id: sid(d.parent_id),
    created_at: d.created_at
  };
  if (opts.resume) out.extrait = (d.contenu || '').slice(0, 300);
  else out.contenu = d.contenu || null;
  if (d.type === 'post') {
    Object.assign(out, {
      titre: d.titre,
      tags: m.tags || [],
      statut: m.statut || 'ouvert',
      nb_reponses: m.nb_reponses || 0,
      nb_vues: d.nb_vues || 0,
      nb_suiveurs: (m.suiveurs || []).length,
      reponse_acceptee_id: sid(m.reponse_acceptee_id),
      derniere_activite: m.derniere_activite || d.created_at
    });
    if (opts.moi) out.suivi = (m.suiveurs || []).some((s) => String(s) === opts.moi);
  }
  if (d.type === 'reponse') out.acceptee = Boolean(m.acceptee);
  if (m.modifie_le) out.modifie_le = m.modifie_le;
  if (opts.votes) out.mon_vote = opts.votes.get(sid(d._id)) || 0;
  if (opts.admin) out.nb_signalements = m.nb_signalements || 0;
  return out;
}

// Supprime un échange et tout ce qui en dépend : réponses, commentaires et votes.
// Limite connue : la réputation gagnée grâce aux votes des contenus supprimés n'est pas retirée.
async function supprimerArbre(id) {
  const reps = await Echange.find({ parent_id: id, type: 'reponse' }).select('_id').lean();
  const repIds = reps.map((r) => r._id);
  const coms = await Echange.find({ parent_id: { $in: [id, ...repIds] }, type: 'commentaire' }).select('_id').lean();
  const tous = [id, ...repIds, ...coms.map((c) => c._id)];
  await Echange.deleteMany({ type: 'vote', cible_id: { $in: tous } });
  await Echange.deleteMany({ _id: { $in: tous } });
  return tous.length;
}

// Supprime en gardant le post cohérent (compteur de réponses, réponse acceptée).
async function supprimerEchange(doc) {
  if (doc.type === 'reponse') {
    const post = await Echange.findById(doc.parent_id).select('auteur_id metadata').lean();
    if (post) {
      const maj = { $inc: { 'metadata.nb_reponses': -1 } };
      if (post.metadata && String(post.metadata.reponse_acceptee_id) === String(doc._id)) {
        maj.$unset = { 'metadata.reponse_acceptee_id': '' };
        maj.$set = { 'metadata.statut': 'ouvert' };
        if (String(doc.auteur_id) !== String(post.auteur_id)) await reputation.changer(doc.auteur_id, -BAREME.reponse_acceptee);
      }
      await Echange.updateOne({ _id: post._id }, maj);
    }
  }
  return supprimerArbre(doc._id);
}

module.exports = { AUTEUR_FIELDS, auteurPublic, formater, supprimerArbre, supprimerEchange };
