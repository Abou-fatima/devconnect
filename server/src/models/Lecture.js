const mongoose = require('mongoose');
const { Schema } = mongoose;

// « Lu jusqu'à » : pour chaque personne et chaque conversation, la date du dernier passage dans la conversation.
// Les messages reçus après cette date sont « non lus » (compteur des conversations privées). Collection : lectures_chat.
const lectureSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  canal: { type: String, required: true, maxlength: 80 },
  lu_jusqua: { type: Date, default: Date.now }
}, { collection: 'lectures_chat' });

lectureSchema.index({ user_id: 1, canal: 1 }, { unique: true });

module.exports = mongoose.model('Lecture', lectureSchema);
