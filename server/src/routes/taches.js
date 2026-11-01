const express = require('express');
const mongoose = require('mongoose');

const Projet = require('../models/Projet');
const Utilisateur = require('../models/Utilisateur');
const AppError = require('../utils/AppError');
const v = require('../validators/taches');
const svc = require('../services/taches');
const { auth } = require('../middleware/auth');
const { ecritureLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const refuser = (r) => { if (r) throw new AppError(r.status, r.message); };

async function projetPourEquipe(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(404, 'Projet introuvable');
  const projet = await Projet.findById(req.params.id);
  if (!projet) throw new AppError(404, 'Projet introuvable');
  if (!svc.peutTravailler(projet, req.userId)) throw new AppError(403, 'Espace réservé à l’équipe du projet');
  return projet;
}

const tacheDe = (projet, tid) => {
  const t = mongoose.isValidObjectId(tid) ? projet.taches.id(tid) : null;
  if (!t) throw new AppError(404, 'Tâche introuvable');
  return t;
};

/* GET /api/projets/:id/taches : le tableau de l'équipe */
router.get('/projets/:id/taches', auth, asyncRoute(async (req, res) => {
  const projet = await projetPourEquipe(req);
  res.json({ taches: projet.taches.map(svc.serialiserTache), peut_gerer: true, est_porteur: svc.estPorteur(projet, req.userId) });
}));

/* POST /api/projets/:id/taches  { titre, assigne_a?, statut? } */
router.post('/projets/:id/taches', auth, ecritureLimiter, asyncRoute(async (req, res) => {
  const projet = await projetPourEquipe(req);
  const body = v.creer.parse(req.body);
  refuser(svc.verifierCapacite(projet.taches.length));
  refuser(svc.verifierAssigne(projet, body.assigne_a));
  projet.taches.push({ titre: body.titre, statut: body.statut || 'a_faire', assigne_a: body.assigne_a || undefined });
  await projet.save();
  const tache = projet.taches[projet.taches.length - 1];
  if (body.assigne_a) {
    const acteur = await Utilisateur.findById(req.userId).select('pseudo').lean();
    await svc.notifierTache({ destinataireId: body.assigne_a, acteur: acteur || { _id: req.userId }, projet, tache });
  }
  res.status(201).json({ tache: svc.serialiserTache(tache) });
}));

/* PUT /api/projets/:id/taches/:tid  { titre?, statut?, assigne_a? } */
router.put('/projets/:id/taches/:tid', auth, ecritureLimiter, asyncRoute(async (req, res) => {
  const projet = await projetPourEquipe(req);
  const tache = tacheDe(projet, req.params.tid);
  const body = v.modifier.parse(req.body);
  const avant = tache.assigne_a ? String(tache.assigne_a) : null;
  if (body.assigne_a !== undefined) refuser(svc.verifierAssigne(projet, body.assigne_a));
  if (body.titre !== undefined) tache.titre = body.titre;
  if (body.statut !== undefined) tache.statut = body.statut;
  if (body.assigne_a !== undefined) tache.assigne_a = body.assigne_a || undefined;
  await projet.save();
  if (body.assigne_a && body.assigne_a !== avant) {
    const acteur = await Utilisateur.findById(req.userId).select('pseudo').lean();
    await svc.notifierTache({ destinataireId: body.assigne_a, acteur: acteur || { _id: req.userId }, projet, tache });
  }
  res.json({ tache: svc.serialiserTache(tache) });
}));

/* DELETE /api/projets/:id/taches/:tid */
router.delete('/projets/:id/taches/:tid', auth, ecritureLimiter, asyncRoute(async (req, res) => {
  const projet = await projetPourEquipe(req);
  tacheDe(projet, req.params.tid).deleteOne();
  await projet.save();
  res.json({ message: 'Tâche supprimée' });
}));

module.exports = router;
