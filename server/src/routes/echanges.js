const express = require('express');
const mongoose = require('mongoose');

const Echange = require('../models/Echange');
const AppError = require('../utils/AppError');
const { auth, optionalAuth } = require('../middleware/auth');
const { ecritureLimiter } = require('../middleware/rateLimit');
const v = require('../validators/echanges');
const reputation = require('../services/reputation');
const { BAREME, effetVote } = require('../services/bareme');
const { AUTEUR_FIELDS, formater, supprimerEchange } = require('../services/echanges');

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const oid = (x) => new mongoose.Types.ObjectId(String(x));

const idValide = (req, _res, next) => (mongoose.isValidObjectId(req.params.id) && String(req.params.id).length === 24
  ? next() : next(new AppError(400, 'Identifiant invalide')));

// metadata est de type Mixed : Mongoose n'y convertit pas les ObjectId, on le fait nous-mêmes.
const trouver = async (id, types, message = 'Introuvable') => {
  const doc = await Echange.findOne({ _id: id, type: { $in: types } });
  if (!doc) throw new AppError(404, message);
  return doc;
};

/* ----------------------------------------------------------------------------- Posts (F-11) */

// Créer une question
router.post('/posts', auth, ecritureLimiter, asyncRoute(async (req, res) => {
  const b = v.creerPost.parse(req.body);
  const post = await Echange.create({
    type: 'post',
    auteur_id: req.userId,
    titre: b.titre,
    contenu: b.contenu,
    audio_url: b.audio_url,
    metadata: { tags: b.tags, statut: 'ouvert', nb_reponses: 0, suiveurs: [oid(req.userId)], derniere_activite: new Date() }
  });
  const doc = await Echange.findById(post._id).populate('auteur_id', AUTEUR_FIELDS).lean();
  res.status(201).json({ post: formater(doc, { moi: req.userId }) });
}));

// Liste filtrée et paginée : ?tag=react&statut=resolu&q=mot&tri=votes&page=1
router.get('/posts', optionalAuth, asyncRoute(async (req, res) => {
  const q = v.listePosts.parse(req.query);
  const filtre = { type: 'post' };
  if (q.tag) filtre['metadata.tags'] = q.tag;
  if (q.statut) filtre['metadata.statut'] = q.statut;
  if (q.auteur) filtre.auteur_id = q.auteur;
  if (q.q) filtre.titre = { $regex: escapeRegex(q.q), $options: 'i' };
  if (q.tri === 'sans_reponse') filtre['metadata.nb_reponses'] = 0;
  const tri = { recent: { created_at: -1 }, sans_reponse: { created_at: -1 }, votes: { nb_votes: -1, created_at: -1 }, actifs: { 'metadata.derniere_activite': -1 } }[q.tri];

  const [docs, total] = await Promise.all([
    Echange.find(filtre).sort(tri).skip((q.page - 1) * q.limit).limit(q.limit).populate('auteur_id', AUTEUR_FIELDS).lean(),
    Echange.countDocuments(filtre)
  ]);
  res.json({ data: docs.map((d) => formater(d, { resume: true, moi: req.userId })), page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) });
}));

// Détail d'une question : +1 vue, réponses (acceptée d'abord, puis les plus votées) et commentaires
router.get('/posts/:id', idValide, optionalAuth, asyncRoute(async (req, res) => {
  const postDoc = await Echange.findOneAndUpdate({ _id: req.params.id, type: 'post' }, { $inc: { nb_vues: 1 } }, { new: true })
    .populate('auteur_id', AUTEUR_FIELDS).lean();
  if (!postDoc) throw new AppError(404, 'Question introuvable');

  const reps = await Echange.find({ parent_id: postDoc._id, type: 'reponse' }).populate('auteur_id', AUTEUR_FIELDS).lean();
  const parents = [postDoc._id, ...reps.map((r) => r._id)];
  const coms = await Echange.find({ parent_id: { $in: parents }, type: 'commentaire' }).sort({ created_at: 1 }).populate('auteur_id', AUTEUR_FIELDS).lean();

  let votes;
  if (req.userId) {
    const mesVotes = await Echange.find({ type: 'vote', auteur_id: req.userId, cible_id: { $in: parents } }).select('cible_id metadata').lean();
    votes = new Map(mesVotes.map((x) => [String(x.cible_id), x.metadata.valeur]));
  }
  const opts = { moi: req.userId, votes };
  const parParent = (id) => coms.filter((c) => String(c.parent_id) === String(id)).map((c) => formater(c, opts));

  const reponses = reps
    .sort((a, b) => Number(Boolean(b.metadata && b.metadata.acceptee)) - Number(Boolean(a.metadata && a.metadata.acceptee))
      || (b.nb_votes || 0) - (a.nb_votes || 0) || new Date(a.created_at) - new Date(b.created_at))
    .map((r) => ({ ...formater(r, opts), commentaires: parParent(r._id) }));

  res.json({ post: formater(postDoc, opts), reponses, commentaires: parParent(postDoc._id) });
}));

/* ------------------------------------------------------- Réponses et commentaires (F-13, F-14) */

router.post('/posts/:id/reponses', idValide, auth, ecritureLimiter, asyncRoute(async (req, res) => {
  const b = v.creerReponse.parse(req.body);
  const post = await trouver(req.params.id, ['post'], 'Question introuvable');
  const rep = await Echange.create({
    type: 'reponse', auteur_id: req.userId, parent_id: post._id, cible_type: 'post', cible_id: post._id,
    contenu: b.contenu, audio_url: b.audio_url, metadata: { acceptee: false }
  });
  await Echange.updateOne({ _id: post._id }, {
    $inc: { 'metadata.nb_reponses': 1 },
    $set: { 'metadata.derniere_activite': new Date() },
    $addToSet: { 'metadata.suiveurs': oid(req.userId) }
  });
  // TODO (Dev 3) : notifier l'auteur du post et les suiveurs quand le service de notifications sera disponible.
  const doc = await Echange.findById(rep._id).populate('auteur_id', AUTEUR_FIELDS).lean();
  res.status(201).json({ reponse: formater(doc, { votes: new Map() }) });
}));

// Commenter un post ou une réponse
router.post('/:id/commentaires', idValide, auth, ecritureLimiter, asyncRoute(async (req, res) => {
  const b = v.commentaire.parse(req.body);
  const cible = await trouver(req.params.id, ['post', 'reponse'], 'Impossible de commenter : post ou réponse introuvable');
  const com = await Echange.create({
    type: 'commentaire', auteur_id: req.userId, parent_id: cible._id, cible_type: cible.type, cible_id: cible._id, contenu: b.contenu
  });
  const postId = cible.type === 'post' ? cible._id : cible.parent_id;
  await Echange.updateOne({ _id: postId }, { $set: { 'metadata.derniere_activite': new Date() } });
  const doc = await Echange.findById(com._id).populate('auteur_id', AUTEUR_FIELDS).lean();
  res.status(201).json({ commentaire: formater(doc) });
}));

// Modifier son propre post, sa réponse ou son commentaire
router.put('/:id', idValide, auth, asyncRoute(async (req, res) => {
  const doc = await trouver(req.params.id, ['post', 'reponse', 'commentaire']);
  if (String(doc.auteur_id) !== req.userId) throw new AppError(403, 'Seul l\'auteur peut modifier ce contenu');

  const maj = { 'metadata.modifie_le': new Date() };
  if (doc.type === 'post') {
    const b = v.modifierPost.parse(req.body);
    if (b.titre !== undefined) maj.titre = b.titre;
    if (b.contenu !== undefined) maj.contenu = b.contenu;
    if (b.tags !== undefined) maj['metadata.tags'] = b.tags;
  } else {
    maj.contenu = (doc.type === 'commentaire' ? v.commentaire : v.modifierContenu).parse(req.body).contenu;
  }
  const nouveau = await Echange.findByIdAndUpdate(doc._id, { $set: maj }, { new: true }).populate('auteur_id', AUTEUR_FIELDS).lean();
  res.json({ echange: formater(nouveau, { moi: req.userId }) });
}));

// Supprimer son propre contenu (et ce qui en dépend)
router.delete('/:id', idValide, auth, asyncRoute(async (req, res) => {
  const doc = await trouver(req.params.id, ['post', 'reponse', 'commentaire']);
  const modo = ['admin', 'moderateur'].includes(req.user.role);
  if (String(doc.auteur_id) !== req.userId && !modo) throw new AppError(403, 'Seul l\'auteur peut supprimer ce contenu');
  const nb = await supprimerEchange(doc);
  res.json({ ok: true, supprimes: nb });
}));

/* ------------------------------------------------------------ Votes et réponse acceptée (F-15, F-16) */

// valeur 1 ou -1. Revoter la même valeur retire le vote ; l'autre valeur l'inverse.
router.post('/:id/vote', idValide, auth, ecritureLimiter, asyncRoute(async (req, res) => {
  const { valeur } = v.vote.parse(req.body);
  const cible = await trouver(req.params.id, ['post', 'reponse'], 'On ne peut voter que pour un post ou une réponse');
  if (String(cible.auteur_id) === req.userId) throw new AppError(403, 'Vous ne pouvez pas voter pour votre propre contenu');

  const critere = { type: 'vote', auteur_id: req.userId, cible_type: cible.type, cible_id: cible._id };
  const ancienDoc = await Echange.findOne(critere);
  const ancien = ancienDoc ? ancienDoc.metadata.valeur : 0;
  const nouveau = ancien === valeur ? 0 : valeur;

  if (ancienDoc && nouveau === 0) await Echange.deleteOne({ _id: ancienDoc._id });
  else if (ancienDoc) await Echange.updateOne({ _id: ancienDoc._id }, { $set: { 'metadata.valeur': nouveau } });
  else {
    try { await Echange.create({ ...critere, metadata: { valeur: nouveau } }); } catch (e) {
      // L'index unique partiel empêche le double vote (clic en double, requêtes simultanées)
      if (e && e.code === 11000) throw new AppError(409, 'Vote déjà enregistré');
      throw e;
    }
  }

  const effet = effetVote(ancien, nouveau, cible.type);
  const maj = await Echange.findByIdAndUpdate(cible._id, { $inc: { nb_votes: effet.delta_votes } }, { new: true }).select('nb_votes');
  await reputation.changer(cible.auteur_id, effet.delta_reputation);
  res.json({ nb_votes: maj.nb_votes, mon_vote: nouveau });
}));

// Seul l'auteur de la question peut accepter une réponse (une seule réponse acceptée par question)
router.post('/reponses/:id/accepter', idValide, auth, asyncRoute(async (req, res) => {
  const rep = await trouver(req.params.id, ['reponse'], 'Réponse introuvable');
  const post = await trouver(rep.parent_id, ['post'], 'Question introuvable');
  if (String(post.auteur_id) !== req.userId) throw new AppError(403, 'Seul l\'auteur de la question peut accepter une réponse');
  const precedent = post.metadata.reponse_acceptee_id;
  if (precedent && String(precedent) === String(rep._id)) return res.json({ ok: true, reponse_acceptee_id: String(rep._id) });

  if (precedent) {
    const ancienne = await Echange.findByIdAndUpdate(precedent, { $set: { 'metadata.acceptee': false } });
    if (ancienne && String(ancienne.auteur_id) !== req.userId) await reputation.changer(ancienne.auteur_id, -BAREME.reponse_acceptee);
  }
  await Echange.updateOne({ _id: rep._id }, { $set: { 'metadata.acceptee': true } });
  await Echange.updateOne({ _id: post._id }, { $set: { 'metadata.reponse_acceptee_id': rep._id, 'metadata.statut': 'resolu', 'metadata.derniere_activite': new Date() } });
  if (String(rep.auteur_id) !== req.userId) await reputation.changer(rep.auteur_id, BAREME.reponse_acceptee, ['resolveur']);
  res.json({ ok: true, reponse_acceptee_id: String(rep._id) });
}));

router.delete('/reponses/:id/accepter', idValide, auth, asyncRoute(async (req, res) => {
  const rep = await trouver(req.params.id, ['reponse'], 'Réponse introuvable');
  const post = await trouver(rep.parent_id, ['post'], 'Question introuvable');
  if (String(post.auteur_id) !== req.userId) throw new AppError(403, 'Seul l\'auteur de la question peut retirer l\'acceptation');
  if (!post.metadata.reponse_acceptee_id || String(post.metadata.reponse_acceptee_id) !== String(rep._id)) throw new AppError(409, 'Cette réponse n\'est pas acceptée');
  await Echange.updateOne({ _id: rep._id }, { $set: { 'metadata.acceptee': false } });
  await Echange.updateOne({ _id: post._id }, { $set: { 'metadata.statut': 'ouvert' }, $unset: { 'metadata.reponse_acceptee_id': '' } });
  if (String(rep.auteur_id) !== req.userId) await reputation.changer(rep.auteur_id, -BAREME.reponse_acceptee);
  res.json({ ok: true });
}));

/* ------------------------------------------------------------ Tags, signalement, suivi (F-17, F-21, F-22) */

// Tags les plus utilisés ; ?q=re pour l'autocomplétion
router.get('/tags', asyncRoute(async (req, res) => {
  const q = v.tags.parse(req.query);
  const pipeline = [{ $match: { type: 'post' } }, { $unwind: '$metadata.tags' }, { $group: { _id: '$metadata.tags', nb_posts: { $sum: 1 } } }];
  if (q.q) pipeline.push({ $match: { _id: { $regex: `^${escapeRegex(q.q)}` } } });
  pipeline.push({ $sort: { nb_posts: -1, _id: 1 } }, { $limit: q.limit });
  const data = await Echange.aggregate(pipeline);
  res.json({ data: data.map((t) => ({ tag: t._id, nb_posts: t.nb_posts })) });
}));

// Signaler un post, une réponse ou un commentaire (une seule fois par utilisateur)
router.post('/:id/signaler', idValide, auth, ecritureLimiter, asyncRoute(async (req, res) => {
  const { motif } = v.signalement.parse(req.body);
  const doc = await trouver(req.params.id, ['post', 'reponse', 'commentaire']);
  if (String(doc.auteur_id) === req.userId) throw new AppError(403, 'Vous ne pouvez pas signaler votre propre contenu');
  const r = await Echange.updateOne(
    { _id: doc._id, 'metadata.signalements.user_id': { $ne: oid(req.userId) } },
    { $push: { 'metadata.signalements': { user_id: oid(req.userId), motif, date: new Date() } }, $inc: { 'metadata.nb_signalements': 1 } }
  );
  if (!r.modifiedCount) throw new AppError(409, 'Vous avez déjà signalé ce contenu');
  res.status(201).json({ ok: true });
}));

router.post('/posts/:id/suivre', idValide, auth, asyncRoute(async (req, res) => {
  const r = await Echange.updateOne({ _id: req.params.id, type: 'post' }, { $addToSet: { 'metadata.suiveurs': oid(req.userId) } });
  if (!r.matchedCount) throw new AppError(404, 'Question introuvable');
  res.json({ suivi: true });
}));

router.delete('/posts/:id/suivre', idValide, auth, asyncRoute(async (req, res) => {
  const r = await Echange.updateOne({ _id: req.params.id, type: 'post' }, { $pull: { 'metadata.suiveurs': oid(req.userId) } });
  if (!r.matchedCount) throw new AppError(404, 'Question introuvable');
  res.json({ suivi: false });
}));

module.exports = router;
