const mongoose = require("mongoose");
const { Schema } = mongoose;

// Défi de code de la semaine. Les tests sont conservés ici ; le client ne reçoit les tests cachés qu'au démarrage d'un essai.
const defiSchema = new Schema({
  titre: { type: String, required: true, trim: true, maxlength: 100 },
  enonce: { type: String, required: true, trim: true, maxlength: 3000 },
  nom_fonction: { type: String, required: true, trim: true, maxlength: 40 },
  code_depart: { type: String, default: "", maxlength: 2000 },
  tags: { type: [String], default: [] },
  tests: [
    {
      _id: false,
      entree: { type: Schema.Types.Mixed, required: true },
      attendu: { type: Schema.Types.Mixed, required: true },
      visible: { type: Boolean, default: false },
    },
  ],
  debut: { type: Date, required: true, index: true },
  fin: { type: Date, required: true },
  auteur_id: { type: Schema.Types.ObjectId, ref: "Utilisateur", required: true },
  demo: { type: Boolean, default: false }, // défis créés par `npm run defis` (supprimables avec --clean)
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Defi", defiSchema);
