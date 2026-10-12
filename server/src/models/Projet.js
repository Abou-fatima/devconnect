const mongoose = require('mongoose');
const { Schema } = mongoose;

const projetSchema = new Schema({
  porteur_id: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  titre: { type: String, required: true },
  description: String,
  membres: [{ user_id: { type: Schema.Types.ObjectId, ref: 'Utilisateur' }, role: String }],
  roles_recherches: [String],
  taches: [{ titre: String, assigne_a: Schema.Types.ObjectId, statut: { type: String, default: 'a_faire' } }],
  stack: [String],
  liens: { github: String, demo: String, video: String },
  statut: { type: String, enum: ['idee', 'en_cours', 'termine'], default: 'idee' },
  categorie: String,
  nb_vues: { type: Number, default: 0 },
  nb_likes: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

projetSchema.index({ stack: 1 });
projetSchema.index({ 'membres.user_id': 1 });

module.exports = mongoose.model('Projet', projetSchema);
