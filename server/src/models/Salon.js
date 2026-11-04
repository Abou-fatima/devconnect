const mongoose = require("mongoose");

const { Schema } = mongoose;

// Salon de discussion créé par un utilisateur. Les messages sont des documents `echanges` (type « message ») dont
// metadata.canal vaut « salon:<id> » : le chat existant (historique, temps réel, vocal) fonctionne sans changement.
const salonSchema = new Schema({
  nom: { type: String, required: true, trim: true, maxlength: 50 },
  description: { type: String, trim: true, maxlength: 200, default: "" },
  // public : visible dans « Découvrir », chacun peut entrer. invitation : on n'entre qu'avec le lien secret.
  visibilite: {
    type: String,
    enum: ["public", "invitation"],
    default: "public",
  },
  code: { type: String, required: true, unique: true }, // partie secrète du lien d'invitation
  proprietaire_id: {
    type: Schema.Types.ObjectId,
    ref: "Utilisateur",
    required: true,
  },
  membres: [
    {
      _id: false,
      user_id: {
        type: Schema.Types.ObjectId,
        ref: "Utilisateur",
        required: true,
      },
      role: {
        type: String,
        enum: ["proprietaire", "membre"],
        default: "membre",
      },
      depuis: { type: Date, default: Date.now },
    },
  ],
  nb_membres: { type: Number, default: 1 },
  derniere_activite: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
});

salonSchema.index({ "membres.user_id": 1, derniere_activite: -1 });
salonSchema.index({ visibilite: 1, nb_membres: -1, derniere_activite: -1 });
salonSchema.index({ proprietaire_id: 1 });

module.exports = mongoose.model("Salon", salonSchema, "salons");
