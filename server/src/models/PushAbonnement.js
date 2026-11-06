const mongoose = require('mongoose');
const { Schema } = mongoose;

// Un appareil (navigateur) qui a accepté les notifications push. Collection : push_abonnements.
// Un même utilisateur peut avoir plusieurs appareils ; un appareil n'appartient qu'à un utilisateur à la fois.
const pushSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true, index: true },
  endpoint: { type: String, required: true, unique: true, maxlength: 600 },
  keys: { p256dh: { type: String, required: true, maxlength: 200 }, auth: { type: String, required: true, maxlength: 100 } },
  user_agent: { type: String, maxlength: 200, default: '' },
  created_at: { type: Date, default: Date.now }
}, { collection: 'push_abonnements' });

module.exports = mongoose.model('PushAbonnement', pushSchema);
