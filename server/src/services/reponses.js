// Répondre à un message précis (fonctions pures, sans base de données).
// Même canal : le message garde l'id du message cité dans `parent_id`.
// « Répondre en privé » : l'extrait cité est copié dans `metadata.citation` (le salon d'origine reste fermé).
const { apercuMessage } = require('./prives');

const TYPES = ['texte', 'image', 'audio'];
const TEXTE_MAX = 80;

// Citation d'un message du même canal. parent : { _id, contenu, image_url, audio_url, auteur_id (peuplé ou non) }
function citationDe(parent) {
  if (!parent) return null;
  const a = parent.auteur_id && parent.auteur_id._id ? { id: String(parent.auteur_id._id), pseudo: parent.auteur_id.pseudo } : null;
  return { id: String(parent._id), externe: false, auteur: a, ...apercuMessage(parent) };
}

// Citation venue d'un autre canal (réponse en privé) : nettoyée, jamais de contenu libre long.
function citationExterne(c) {
  if (!c || typeof c !== 'object') return null;
  const pseudo = typeof c.pseudo === 'string' ? c.pseudo.trim().slice(0, 30) : '';
  if (!pseudo) return null;
  const type = TYPES.includes(c.type) ? c.type : 'texte';
  const texte = type === 'texte' && typeof c.texte === 'string' ? c.texte.trim().slice(0, TEXTE_MAX) : '';
  if (type === 'texte' && !texte) return null;
  return { pseudo, type, texte };
}

// Un message cité est valable seulement s'il est un message du même canal.
const parentValide = (parent, canal) => Boolean(parent && parent.type === 'message' && parent.metadata && parent.metadata.canal === canal);

// Ce que reçoit le client : { id, externe, auteur, type, texte } ou null. parents : { <id>: document }
function reponseA(doc, parents, canal) {
  const p = doc && doc.parent_id && parents ? parents[String(doc.parent_id)] : null;
  if (p && parentValide(p, canal)) return citationDe(p);
  const ext = doc && doc.metadata && doc.metadata.citation;
  if (ext) return { id: null, externe: true, auteur: { id: null, pseudo: ext.pseudo }, type: ext.type, texte: ext.texte };
  return null;
}

module.exports = { citationDe, citationExterne, parentValide, reponseA };
