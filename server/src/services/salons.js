// Règles des salons créés par les utilisateurs. Fonctions pures (testables sans base de données),
// sauf verifierAcces qui lit la base.
const crypto = require("crypto");

const LIMITES = Object.freeze({
  salons_crees: 10,
  salons_rejoints: 50,
  membres: 200,
});

const sid = (x) =>
  x && x._id && !x.user_id
    ? String(x._id)
    : x && x.user_id
      ? String(x.user_id)
      : String(x);
const plain = (d) => (d && typeof d.toObject === "function" ? d.toObject() : d);

/* Code secret du lien d'invitation : 12 caractères, imprévisible. */
const genererCode = () => crypto.randomBytes(9).toString("base64url");

const estMembre = (salon, userId) =>
  ((plain(salon) || {}).membres || []).some(
    (m) => sid(m.user_id) === String(userId),
  );
const estProprietaire = (salon, userId) =>
  sid((plain(salon) || {}).proprietaire_id) === String(userId);

/* Peut-on entrer ? Un salon sur invitation exige le code (lien). Retourne { ok, deja? } ou { ok:false, status, erreur }. */
function peutRejoindre(salon, userId, { codeValide = false } = {}) {
  const s = plain(salon);
  if (estMembre(s, userId)) return { ok: true, deja: true };
  if (s.visibilite === "invitation" && !codeValide)
    return {
      ok: false,
      status: 403,
      erreur: "Ce salon est sur invitation : utilise le lien reçu d'un membre",
    };
  if ((s.nb_membres || (s.membres || []).length) >= LIMITES.membres)
    return { ok: false, status: 409, erreur: "Ce salon est complet" };
  return { ok: true, deja: false };
}

/* Un membre part (ou est retiré). Si c'était le créateur, le plus ancien membre restant le devient.
   Retourne { supprimer: true } s'il ne reste personne, sinon { membres, proprietaire_id }. */
function apresDepart(salon, partantId) {
  const s = plain(salon);
  const restants = (s.membres || []).filter(
    (m) => sid(m.user_id) !== String(partantId),
  );
  if (!restants.length) return { supprimer: true };
  let proprietaire = sid(s.proprietaire_id);
  if (proprietaire === String(partantId)) {
    const plusAncien = [...restants].sort(
      (a, b) => new Date(a.depuis || 0) - new Date(b.depuis || 0),
    )[0];
    proprietaire = sid(plusAncien.user_id);
  }
  return {
    proprietaire_id: proprietaire,
    membres: restants.map((m) => ({
      ...m,
      role: sid(m.user_id) === proprietaire ? "proprietaire" : "membre",
    })),
  };
}

const canalDe = (salon) => `salon:${sid(plain(salon)._id)}`;

/* Format renvoyé au client. Le code d'invitation n'est montré qu'aux membres. */
function formater(salon, moiId) {
  const s = plain(salon);
  const membre = estMembre(s, moiId);
  const out = {
    id: String(s._id),
    canal: canalDe(s),
    nom: s.nom,
    description: s.description || "",
    visibilite: s.visibilite,
    nb_membres: s.nb_membres || (s.membres || []).length,
    membre,
    role: membre
      ? estProprietaire(s, moiId)
        ? "proprietaire"
        : "membre"
      : null,
    derniere_activite: s.derniere_activite || s.created_at,
    created_at: s.created_at,
  };
  if (membre) out.code = s.code;
  return out;
}

/* Aperçu d'un salon via un lien d'invitation (avant d'entrer) : jamais le code ni la liste des membres. */
function apercu(salon, moiId) {
  const f = formater(salon, moiId);
  delete f.code;
  return f;
}

/* Contrôle d'accès d'un canal « salon:<id> » (chat, historique) : réservé aux membres. Les autres canaux passent. */
async function verifierAcces(c, userId) {
  if (!c || !c.salon_id) return {};
  const Salon = require("../models/Salon");
  const ok = await Salon.exists({ _id: c.salon_id, "membres.user_id": userId });
  return ok ? {} : { erreur: "Accès refusé à ce salon" };
}

module.exports = {
  LIMITES,
  genererCode,
  estMembre,
  estProprietaire,
  peutRejoindre,
  apresDepart,
  canalDe,
  formater,
  apercu,
  verifierAcces,
};
