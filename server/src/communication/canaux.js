const mongoose = require("mongoose");

// Noms de canaux (F-18) :
//   stack:<slug>        ex. stack:react
//   ville:<nom>         ex. ville:conakry
//   prive:<idA>_<idB>   conversation privée entre deux utilisateurs
//   salon:<id>          salon créé par un utilisateur (accès réservé aux membres : voir services/salons.js verifierAcces)
const STACK_RE = /^[a-z0-9][a-z0-9.+#-]{0,29}$/;
const VILLE_RE = /^[\p{L}0-9][\p{L}0-9 '-]{0,59}$/u;

// Retourne { canal, cible_type, cible_id? } ou { erreur }.
// `userId` sert à vérifier qu'on appartient bien à une conversation privée.
function parseCanal(brut, userId) {
  if (typeof brut !== "string") return { erreur: "Canal invalide" };
  const [prefixe, ...reste] = brut.trim().split(":");
  const valeur = reste.join(":");

  if (prefixe === "stack") {
    const s = valeur.toLowerCase();
    return STACK_RE.test(s)
      ? { canal: `stack:${s}`, cible_type: "canal" }
      : { erreur: "Canal stack invalide" };
  }
  if (prefixe === "ville") {
    const v = valeur.trim().toLowerCase();
    return VILLE_RE.test(v)
      ? { canal: `ville:${v}`, cible_type: "canal" }
      : { erreur: "Canal ville invalide" };
  }
  if (prefixe === "prive") {
    const ids = valeur.split("_");
    if (
      ids.length !== 2 ||
      !ids.every(
        (i) => mongoose.isValidObjectId(i) && String(i).length === 24,
      ) ||
      ids[0] === ids[1]
    ) {
      return { erreur: "Canal privé invalide" };
    }
    if (!ids.includes(String(userId)))
      return { erreur: "Accès refusé à cette conversation" };
    const tries = [...ids].sort(); // même nom des deux côtés, quel que soit l'ordre reçu
    const autre = tries.find((i) => i !== String(userId));
    return {
      canal: `prive:${tries[0]}_${tries[1]}`,
      cible_type: "user",
      cible_id: autre,
    };
  }
  if (prefixe === "salon") {
    const id = valeur.trim().toLowerCase();
    if (!mongoose.isValidObjectId(id) || id.length !== 24)
      return { erreur: "Salon invalide" };
    return { canal: `salon:${id}`, cible_type: "canal", salon_id: id }; // l'appartenance au salon est vérifiée à part (base de données)
  }
  return { erreur: "Type de canal inconnu (stack, ville, prive ou salon)" };
}

module.exports = { parseCanal };
