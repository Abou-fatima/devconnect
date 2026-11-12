// Options de la commande « npm run admin » (fonctions pures, testables sans MongoDB).
const { ROLES } = require("../../src/utils/constants");

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* npm run admin -- ousmane@exemple.com                -> cet utilisateur devient admin
   npm run admin -- ousmane@exemple.com --role moderateur
   npm run admin -- --liste                            -> affiche les admins et modérateurs */
function lireArguments(argv) {
  const a = { email: null, role: "admin", liste: false };
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i];
    if (k === "--liste") a.liste = true;
    else if (k === "--role") {
      a.role = argv[i + 1];
      i += 1;
      if (!ROLES.includes(a.role))
        throw new Error(`Rôle inconnu. Choisir parmi : ${ROLES.join(", ")}`);
    } else if (k.startsWith("--")) throw new Error(`Option inconnue : ${k}`);
    else if (!a.email) a.email = k.trim().toLowerCase();
    else throw new Error("Une seule adresse e-mail à la fois");
  }
  if (!a.liste) {
    if (!a.email)
      throw new Error(
        "Indique l'e-mail du compte : npm run admin -- email@exemple.com",
      );
    if (!EMAIL.test(a.email)) throw new Error("Adresse e-mail invalide");
  }
  return a;
}

module.exports = { lireArguments };
