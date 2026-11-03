// Donne (ou retire) le rôle administrateur ou modérateur à un compte existant. À lancer sur le serveur : aucune route publique ne le permet.
//   npm run admin -- ousmane@exemple.com
//   npm run admin -- ousmane@exemple.com --role moderateur
//   npm run admin -- ousmane@exemple.com --role dev        (retire les droits)
//   npm run admin -- --liste
const env = require("../src/config/env");
const mongoose = require("mongoose");
const Utilisateur = require("../src/models/Utilisateur");
const { lireArguments } = require("./admin/options");

async function main() {
  const a = lireArguments(process.argv.slice(2));
  await mongoose.connect(env.mongoUri);
  try {
    if (a.liste) {
      const l = await Utilisateur.find({
        role: { $in: ["admin", "moderateur"] },
      })
        .select("pseudo email role")
        .sort({ role: 1, pseudo: 1 })
        .lean();
      if (!l.length) console.log("Aucun administrateur ni modérateur.");
      l.forEach((u) =>
        console.log(
          `${u.role.padEnd(10)} ${u.pseudo}  <${u.email || "sans e-mail"}>`,
        ),
      );
      return;
    }
    const u = await Utilisateur.findOne({ email: a.email });
    if (!u)
      throw new Error(
        `Aucun compte avec l'e-mail ${a.email}. Crée d'abord le compte depuis l'inscription.`,
      );
    if (u.role === "admin" && a.role !== "admin") {
      const nb = await Utilisateur.countDocuments({ role: "admin" });
      if (nb <= 1)
        throw new Error("Refusé : ce compte est le dernier administrateur.");
    }
    u.role = a.role;
    await u.save();
    console.log(
      `OK : ${u.pseudo} <${a.email}> a maintenant le rôle « ${a.role} ».`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((e) => {
  console.error(`Impossible : ${e.message}`);
  process.exit(1);
});
