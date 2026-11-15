const mongoose = require("mongoose");

// Copie d'un duel pour survivre à un redémarrage du serveur (le duel actif reste en mémoire). Effacée au bout de 24 h.
const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  joueurs_ids: { type: [String], index: true },
  donnees: { type: mongoose.Schema.Types.Mixed, required: true },
  cree_at: { type: Date, default: Date.now, expires: 24 * 60 * 60 },
});

module.exports = mongoose.model("DuelSauvegarde", schema);
