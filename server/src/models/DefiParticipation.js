const mongoose = require("mongoose");
const { Schema } = mongoose;

// Une participation par personne et par défi.
const schema = new Schema({
  defi_id: { type: Schema.Types.ObjectId, ref: "Defi", required: true },
  user_id: { type: Schema.Types.ObjectId, ref: "Utilisateur", required: true },
  debut_at: { type: Date, required: true }, // début du chronomètre (donné par le serveur)
  essais: { type: Number, default: 0 },
  tests_reussis: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  reussi: { type: Boolean, default: false },
  valide_at: Date,
  duree_s: Number,
  code: { type: String, maxlength: 10000, default: "" },
  paste_bloques: { type: Number, default: 0 }, // tentatives de collage bloquées (information pour les modérateurs)
});
schema.index({ defi_id: 1, user_id: 1 }, { unique: true });
schema.index({ defi_id: 1, reussi: 1, duree_s: 1 });

module.exports = mongoose.model("DefiParticipation", schema);
