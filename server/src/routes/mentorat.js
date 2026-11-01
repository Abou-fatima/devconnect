const express = require('express');
const mongoose = require('mongoose');

const Utilisateur = require('../models/Utilisateur');
const Echange = require('../models/Echange');
const AppError = require('../utils/AppError');
const v = require('../validators/mentorat');
const svc = require('../services/mentorat');
const { auth, optionalAuth } = require('../middleware/auth');
const { ecritureLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Une seule demande EN ATTENTE par personne et par mentor (créé ici pour ne pas modifier le modèle Echange ; Mongoose attend la connexion).
// L'ordre des clés est différent de celui de l'index des candidatures : MongoDB refuse deux index de même clé avec des filtres différents (avant la version 7.3).
Echange.collection.createIndex(
  { cible_id: 1, auteur_id: 1 },
  { unique: true, partialFilterExpression: { type: 'mentorat', 'metadata.statut': 'en_attente' }, name: 'mentorat_unique_en_attente' }
).catch((e) => console.error('[mentorat] index :', e.message));

const PERSONNE = 'pseudo profil.photo reputation pays ville stacks';
const demandes = (extra = {}) => ({ type: 'mentorat', cible_type: 'user', ...extra });
const oid = (x) => new mongoose.Types.ObjectId(String(x));
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function trouverDemande(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, 'Demande introuvable');
  const d = await Echange.findOne(demandes({ _id: id }));
  if (!d) throw new AppError(404, 'Demande introuvable');
  return d;
}

const compterAccompagnes = (mentorId) => Echange.countDocuments(demandes({ cible_id: mentorId, 'metadata.statut': 'acceptee' }));

/* GET /api/mentorat/mentors?q=&stack=&pays=&page=   (public)
   Développeurs qui offrent du mentorat, les mieux notés d'abord. Connecté : on ajoute l'état de ta relation avec chacun. */
router.get('/mentors', optionalAuth, asyncRoute(async (req, res) => {
  const q = v.mentors.parse(req.query);
  const filtre = { objectifs: 'offrir_mentorat' };
  if (req.userId) filtre._id = { $ne: oid(req.userId) };
  if (q.q) filtre.pseudo = { $regex: escapeRegex(q.q), $options: 'i' };
  if (q.pays) filtre.pays = q.pays;
  const stacks = (q.stack || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (stacks.length) filtre.stacks = { $in: stacks };

  const [docs, total] = await Promise.all([
    Utilisateur.find(filtre).select('pseudo profil stacks reputation pays ville').sort({ reputation: -1, _id: 1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Utilisateur.countDocuments(filtre)
  ]);
  const ids = docs.map((d) => d._id);

  // Nombre de personnes accompagnées par chacun (pour afficher « places restantes »)
  const actifs = ids.length ? await Echange.aggregate([
    { $match: demandes({ cible_id: { $in: ids }, 'metadata.statut': 'acceptee' }) },
    { $group: { _id: '$cible_id', n: { $sum: 1 } } }
  ]) : [];
  const nb = Object.fromEntries(actifs.map((a) => [String(a._id), a.n]));

  // Ma relation avec chacun : la plus récente de mes demandes
  const relations = {};
  if (req.userId && ids.length) {
    const miennes = await Echange.find(demandes({ auteur_id: req.userId, cible_id: { $in: ids } })).sort({ created_at: 1 }).select('cible_id metadata.statut').lean();
    miennes.forEach((d) => { relations[String(d.cible_id)] = { id: String(d._id), statut: d.metadata?.statut }; });
  }

  res.json({
    data: docs.map((d) => ({
      id: String(d._id), pseudo: d.pseudo, photo: d.profil?.photo || null, bio: d.profil?.bio || '', niveau: d.profil?.niveau || null,
      reputation: d.reputation ?? 0, pays: d.pays || null, ville: d.ville || null, stacks: d.stacks || [],
      nb_accompagnes: nb[String(d._id)] || 0, places_restantes: Math.max(0, svc.MAX_ACCOMPAGNES - (nb[String(d._id)] || 0)),
      ma_relation: relations[String(d._id)] || null
    })),
    page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit)
  });
}));

/* POST /api/mentorat/demandes  { mentor_id, sujet, message } : demander à être accompagné. Le mentor est prévenu. */
router.post('/demandes', auth, ecritureLimiter, asyncRoute(async (req, res) => {
  const body = v.demander.parse(req.body);
  const mentor = await Utilisateur.findById(body.mentor_id).select('pseudo objectifs');
  if (!mentor) throw new AppError(404, 'Mentor introuvable');

  const base = demandes({ auteur_id: req.userId });
  const [actif, enAttenteAvecLui, enAttenteTotal] = await Promise.all([
    Echange.exists({ ...base, cible_id: mentor._id, 'metadata.statut': 'acceptee' }),
    Echange.exists({ ...base, cible_id: mentor._id, 'metadata.statut': 'en_attente' }),
    Echange.countDocuments({ ...base, 'metadata.statut': 'en_attente' })
  ]);
  const refus = svc.verifierDemande({ mentor, userId: req.userId, relationActive: Boolean(actif), enAttenteAvecLui: Boolean(enAttenteAvecLui), enAttenteTotal });
  if (refus) throw new AppError(refus.status, refus.message);

  let doc;
  try {
    doc = await Echange.create({ type: 'mentorat', auteur_id: req.userId, cible_type: 'user', cible_id: mentor._id, contenu: body.message, metadata: { statut: 'en_attente', sujet: body.sujet } });
  } catch (e) {
    if (e.code === 11000) throw new AppError(409, 'Tu as déjà une demande en attente auprès de cette personne'); // deux clics simultanés
    throw e;
  }
  await svc.notifierMentorat({ etape: 'demande', destinataireId: mentor._id, acteur: req.user, demandeId: doc._id, sujet: body.sujet });
  res.status(201).json({ demande: svc.serialiserDemande(doc) });
}));

/* GET /api/mentorat/mes : mes demandes reçues (en tant que mentor) et envoyées (en tant qu'accompagné), avec le nombre à traiter. */
router.get('/mes', auth, asyncRoute(async (req, res) => {
  const [recues, envoyees] = await Promise.all([
    Echange.find(demandes({ cible_id: req.userId })).sort({ created_at: -1 }).limit(100).populate('auteur_id', PERSONNE).lean(),
    Echange.find(demandes({ auteur_id: req.userId })).sort({ created_at: -1 }).limit(100).populate('cible_id', PERSONNE).lean()
  ]);
  const r = recues.map((d) => svc.serialiserDemande(d, { mentee: d.auteur_id }));
  const e = envoyees.map((d) => svc.serialiserDemande(d, { mentor: d.cible_id }));
  res.json({ recues: r, envoyees: e, a_traiter: r.filter((d) => d.statut === 'en_attente').length });
}));

// Décision du mentor : accepter ou refuser. L'état n'est modifié que s'il est encore « en_attente » (pas de double décision).
async function decider(req, res, accepte) {
  const d = await trouverDemande(req.params.id);
  if (String(d.cible_id) !== String(req.userId)) throw new AppError(403, 'Seul le mentor peut répondre à cette demande');
  if (accepte) {
    const refus = svc.verifierCapacite(await compterAccompagnes(req.userId));
    if (refus) throw new AppError(refus.status, refus.message);
  }
  const maj = await Echange.findOneAndUpdate(
    { _id: d._id, 'metadata.statut': 'en_attente' },
    { $set: { 'metadata.statut': accepte ? 'acceptee' : 'refusee', 'metadata.decide_le': new Date() } },
    { new: true }
  );
  if (!maj) throw new AppError(409, 'Cette demande a déjà été traitée');
  await svc.notifierMentorat({ etape: accepte ? 'acceptee' : 'refusee', destinataireId: d.auteur_id, acteur: req.user, demandeId: d._id });
  res.json({ demande: svc.serialiserDemande(maj) });
}
router.put('/demandes/:id/accepter', auth, ecritureLimiter, asyncRoute((req, res) => decider(req, res, true)));
router.put('/demandes/:id/refuser', auth, ecritureLimiter, asyncRoute((req, res) => decider(req, res, false)));

/* PUT /api/mentorat/demandes/:id/terminer : le mentor ou l'accompagné met fin à l'accompagnement (libère une place). */
router.put('/demandes/:id/terminer', auth, ecritureLimiter, asyncRoute(async (req, res) => {
  const d = await trouverDemande(req.params.id);
  if (![String(d.auteur_id), String(d.cible_id)].includes(String(req.userId))) throw new AppError(403, 'Tu ne fais pas partie de cet accompagnement');
  const maj = await Echange.findOneAndUpdate({ _id: d._id, 'metadata.statut': 'acceptee' }, { $set: { 'metadata.statut': 'terminee', 'metadata.termine_le': new Date() } }, { new: true });
  if (!maj) throw new AppError(409, 'Cet accompagnement n’est pas en cours');
  res.json({ demande: svc.serialiserDemande(maj) });
}));

/* DELETE /api/mentorat/demandes/:id : l'accompagné retire sa demande tant qu'elle est en attente. */
router.delete('/demandes/:id', auth, ecritureLimiter, asyncRoute(async (req, res) => {
  const d = await trouverDemande(req.params.id);
  if (String(d.auteur_id) !== String(req.userId)) throw new AppError(403, 'Tu ne peux retirer que ta propre demande');
  const r = await Echange.deleteOne({ _id: d._id, 'metadata.statut': 'en_attente' });
  if (!r.deletedCount) throw new AppError(409, 'Cette demande a déjà été traitée');
  res.json({ message: 'Demande retirée' });
}));

module.exports = router;
