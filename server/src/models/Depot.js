const mongoose = require('mongoose');
const { Schema } = mongoose;

const depotSchema = new Schema({
  proprietaire_id: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  cible_type: { type: String, enum: ['projet', 'echange', 'user'] },
  cible_id: Schema.Types.ObjectId,
  type_fichier: { type: String, enum: ['image', 'audio', 'video', 'doc'], required: true },
  url: { type: String, required: true },
  nom_original: String,
  taille_octets: Number,
  mime_type: String,
  metadata: { type: Schema.Types.Mixed, default: {} },
  created_at: { type: Date, default: Date.now }
});

depotSchema.index({ cible_type: 1, cible_id: 1 });
depotSchema.index({ proprietaire_id: 1 });

module.exports = mongoose.model('Depot', depotSchema);
