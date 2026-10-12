const mongoose = require('mongoose');
const { NIVEAUX, ROLES } = require('../utils/constants');

const utilisateurSchema = new mongoose.Schema({
  pseudo: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  telephone: { type: String, trim: true }, // format international : +224XXXXXXXXX
  mot_de_passe_hash: { type: String, default: null }, // null si compte créé via OAuth / OTP
  github_id: String,
  role: { type: String, enum: ROLES, default: 'dev' },
  profil: {
    bio: String,
    photo: String,
    niveau: { type: String, enum: NIVEAUX },
    liens: { github: String, linkedin: String, site: String, whatsapp: String }
  },
  stacks: { type: [String], default: [] },
  objectifs: { type: [String], default: [] },
  badges: { type: [String], default: [] },
  reputation: { type: Number, default: 0 },
  pays: String, // code ISO 3166-1 alpha-2
  ville: String,
  created_at: { type: Date, default: Date.now }
});

utilisateurSchema.index({ stacks: 1 });
utilisateurSchema.index({ pays: 1, reputation: -1 });
utilisateurSchema.index({ objectifs: 1 });
utilisateurSchema.index({ 'profil.niveau': 1 });
utilisateurSchema.index({ reputation: -1 });
utilisateurSchema.index({ email: 1 }, { unique: true, sparse: true });
utilisateurSchema.index({ telephone: 1 }, { unique: true, sparse: true });
utilisateurSchema.index({ github_id: 1 }, { unique: true, sparse: true });
// Pseudo unique sans tenir compte de la casse
utilisateurSchema.index({ pseudo: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

module.exports = mongoose.model('Utilisateur', utilisateurSchema);
