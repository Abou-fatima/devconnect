// Ce que l'on peut montrer aux autres. Jamais mot_de_passe_hash.
const PUBLIC_FIELDS = 'pseudo profil stacks objectifs badges reputation pays ville role created_at';
// Ce que l'utilisateur voit sur son propre compte.
const PRIVATE_FIELDS = `${PUBLIC_FIELDS} email telephone github_id`;

const toObject = (doc) => (doc && typeof doc.toObject === 'function' ? doc.toObject() : doc);

const pick = (doc, fields) => {
  const o = toObject(doc);
  const out = { id: String(o._id) };
  fields.split(' ').forEach((f) => {
    if (o[f] !== undefined) out[f] = o[f];
  });
  return out;
};

const publicUser = (doc) => pick(doc, PUBLIC_FIELDS);
const privateUser = (doc) => {
  const out = pick(doc, PRIVATE_FIELDS);
  out.a_un_mot_de_passe = Boolean(toObject(doc).mot_de_passe_hash);
  return out;
};

module.exports = { PUBLIC_FIELDS, PRIVATE_FIELDS, publicUser, privateUser };
