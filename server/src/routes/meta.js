const express = require('express');
const { NIVEAUX, OBJECTIFS, STACKS_SUGGEREES } = require('../utils/constants');

const router = express.Router();

// Listes pour alimenter les formulaires et filtres du frontend
router.get('/options', (_req, res) => res.json({ niveaux: NIVEAUX, objectifs: OBJECTIFS, stacks: STACKS_SUGGEREES }));

module.exports = router;
