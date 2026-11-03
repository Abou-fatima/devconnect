// Contrôles des formulaires côté navigateur : le message s'affiche sous le champ concerné, avant tout envoi au serveur.
// Mêmes règles que le serveur (server/src/validators/common.js), qui reste l'autorité.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PSEUDO = /^[\p{L}0-9_.-]+$/u;

/* t : fonction de traduction ; retourne { champ: message } (vide si tout est correct). */
export function validerInscription(f, t) {
  const e = {};
  const e_ = (cle) => t(`erreurs.champ.${cle}`);
  const pseudo = f.pseudo.trim();
  if (!pseudo) e.pseudo = e_("requis");
  else if (pseudo.length < 3) e.pseudo = e_("pseudo_min");
  else if (pseudo.length > 30) e.pseudo = e_("pseudo_max");
  else if (!PSEUDO.test(pseudo)) e.pseudo = e_("pseudo_format");

  if (!f.email.trim()) e.email = e_("requis");
  else if (!EMAIL.test(f.email.trim())) e.email = e_("email");

  const mdp = f.mot_de_passe;
  if (!mdp) e.mot_de_passe = e_("requis");
  else if (mdp.length < 8) e.mot_de_passe = e_("mdp_min");
  else if (mdp.length > 72) e.mot_de_passe = e_("mdp_max");
  else if (!/[A-Za-z]/.test(mdp)) e.mot_de_passe = e_("mdp_lettre");
  else if (!/\d/.test(mdp)) e.mot_de_passe = e_("mdp_chiffre");

  if (f.telephone.trim() && !/^\+\d{8,15}$/.test(f.telephone.trim()))
    e.telephone = e_("telephone");
  if (f.pays.trim() && !/^[A-Za-z]{2}$/.test(f.pays.trim()))
    e.pays = e_("pays");
  return e;
}

export function validerConnexion(f, t) {
  const e = {};
  if (!f.identifiant.trim()) e.identifiant = t("erreurs.champ.requis");
  else if (f.identifiant.trim().length < 3)
    e.identifiant = t("erreurs.champ.identifiant");
  if (!f.mot_de_passe) e.mot_de_passe = t("erreurs.champ.requis");
  return e;
}
