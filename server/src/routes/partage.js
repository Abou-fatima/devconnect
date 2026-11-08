// Aperçus de partage : GET /api/partage/question/:id et /api/partage/projet/:id (publics, sans connexion).
// L'adresse partagée sur WhatsApp pointe ici ; la personne est aussitôt redirigée vers la vraie page du site.
const express = require('express');
const mongoose = require('mongoose');
const env = require('../config/env');
const Echange = require('../models/Echange');
const Projet = require('../models/Projet');
const { extrait, pagePartage } = require('../services/partage');

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const front = () => env.frontendUrl.split(',')[0].trim().replace(/\/$/, '');
const api = () => env.apiUrl.replace(/\/$/, '');

const envoyer = (res, corps) => res.status(200).type('html').set('Cache-Control', 'public, max-age=300').send(corps);

async function apercu(res, id, charger, cheminPage, cheminPartage) {
  if (!mongoose.isValidObjectId(id)) return res.redirect(302, front());
  const doc = await charger(id);
  if (!doc) return res.redirect(302, front());
  return envoyer(res, pagePartage({
    titre: doc.titre,
    description: doc.description,
    urlPage: `${front()}${cheminPage}/${id}`,
    urlCanonique: `${api()}/api/partage/${cheminPartage}/${id}`,
    image: `${front()}/icon-192.png`
  }));
}

router.get('/question/:id', asyncRoute((req, res) => apercu(
  res, req.params.id,
  async (id) => {
    const d = await Echange.findOne({ _id: id, type: 'post' }).select('titre contenu').lean();
    return d ? { titre: d.titre || 'Question', description: extrait(d.contenu) } : null;
  },
  '/forum/questions', 'question'
)));

router.get('/projet/:id', asyncRoute((req, res) => apercu(
  res, req.params.id,
  async (id) => {
    const d = await Projet.findById(id).select('titre description').lean();
    return d ? { titre: d.titre, description: extrait(d.description) } : null;
  },
  '/projets', 'projet'
)));

module.exports = router;
