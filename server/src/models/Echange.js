const mongoose = require('mongoose');
const { Schema } = mongoose;

const echangeSchema = new Schema({
  type: { type: String, enum: ['post', 'reponse', 'commentaire', 'message', 'vote', 'notification', 'candidature', 'mentorat'], required: true },
  auteur_id: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  cible_type: { type: String, enum: ['post', 'reponse', 'projet', 'user', 'canal'] },
  cible_id: Schema.Types.ObjectId,
  parent_id: { type: Schema.Types.ObjectId, ref: 'Echange' },
  titre: String,
  contenu: String,
  audio_url: String,
  transcription: String,
  metadata: { type: Schema.Types.Mixed, default: {} }, // tags, categorie, statut, valeur du vote...
  nb_vues: { type: Number, default: 0 },
  nb_votes: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

echangeSchema.index({ 'metadata.tags': 1 });
echangeSchema.index({ type: 1 });
echangeSchema.index({ cible_type: 1, cible_id: 1 });
echangeSchema.index({ parent_id: 1 });
// Liste des questions (récentes, par tag) sans parcourir toute la collection
echangeSchema.index({ type: 1, created_at: -1 });
echangeSchema.index({ type: 1, 'metadata.tags': 1, created_at: -1 });
// Modération : contenus signalés
echangeSchema.index({ 'metadata.nb_signalements': -1 }, { sparse: true });
// 1 vote par utilisateur et par cible
echangeSchema.index(
  { auteur_id: 1, cible_type: 1, cible_id: 1 },
  { unique: true, partialFilterExpression: { type: 'vote' } }
);

module.exports = mongoose.model('Echange', echangeSchema);
