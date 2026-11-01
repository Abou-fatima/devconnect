// Règles du mentorat : un mentor (objectif « offrir_mentorat ») accompagne des développeurs qui le lui demandent.
// Fonctions pures (testables sans base) ; les routes ne font que les appeler.

const MAX_ACCOMPAGNES = 5;           // un mentor ne peut pas accompagner plus de 5 personnes à la fois
const MAX_DEMANDES_EN_ATTENTE = 3;   // une personne ne peut pas inonder les mentors de demandes

const id = (x) => String(x && (x._id || x.id || x));

/* Peut-on envoyer cette demande ?  null si oui, sinon { status, message }. */
function verifierDemande({ mentor, userId, relationActive = false, enAttenteAvecLui = false, enAttenteTotal = 0 }) {
  if (id(mentor) === id(userId)) return { status: 400, message: 'Tu ne peux pas te demander du mentorat à toi-même' };
  if (!(mentor.objectifs || []).includes('offrir_mentorat')) return { status: 409, message: 'Cette personne ne propose pas de mentorat' };
  if (relationActive) return { status: 409, message: 'Tu es déjà accompagné par cette personne' };
  if (enAttenteAvecLui) return { status: 409, message: 'Tu as déjà une demande en attente auprès de cette personne' };
  if (enAttenteTotal >= MAX_DEMANDES_EN_ATTENTE) return { status: 409, message: `Tu as déjà ${MAX_DEMANDES_EN_ATTENTE} demandes en attente : attends une réponse avant d’en envoyer d’autres` };
  return null;
}

/* Le mentor peut-il accepter un accompagné de plus ? */
const verifierCapacite = (nbAccompagnes) => (nbAccompagnes >= MAX_ACCOMPAGNES
  ? { status: 409, message: `Tu accompagnes déjà ${MAX_ACCOMPAGNES} personnes : termine un accompagnement avant d’en accepter un autre` }
  : null);

const TEXTES = {
  demande: (pseudo, sujet) => `${pseudo} te demande du mentorat : « ${sujet} »`,
  acceptee: (pseudo) => `${pseudo} a accepté de t’accompagner`,
  refusee: (pseudo) => `${pseudo} ne peut pas t’accompagner pour le moment`
};

const parDefaut = { envoyer: (opts) => require('../communication').notifier.envoyer(opts) };

/* Prévient l'autre personne (kind « mentorat »). sujet = { type: 'mentorat', id, etape } : le client choisit son texte selon l'étape.
   N'échoue jamais : un incident de notification ne bloque pas l'action. */
async function notifierMentorat({ etape, destinataireId, acteur, demandeId, sujet = '' }, deps = parDefaut) {
  try {
    if (!TEXTES[etape]) throw new Error(`étape mentorat inconnue « ${etape} »`);
    const acteurId = id(acteur);
    if (!destinataireId || id(destinataireId) === acteurId) return null;
    return await deps.envoyer({
      destinataireId: id(destinataireId), acteurId, kind: 'mentorat',
      message: TEXTES[etape](acteur.pseudo || 'Quelqu’un', sujet),
      sujet: { type: 'mentorat', id: id(demandeId), etape }
    });
  } catch (e) {
    console.error('[mentorat] notification :', e.message);
    return null;
  }
}

const personne = (u) => (u && typeof u === 'object'
  ? { id: String(u._id), pseudo: u.pseudo, photo: u.profil?.photo || null, reputation: u.reputation ?? 0, pays: u.pays || null, ville: u.ville || null, stacks: u.stacks || [] }
  : null);

// Format envoyé au client (jamais d'email ni de téléphone)
function serialiserDemande(doc, { mentor = null, mentee = null } = {}) {
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const m = o.metadata || {};
  return {
    id: String(o._id),
    statut: m.statut,
    sujet: m.sujet || '',
    message: o.contenu || '',
    created_at: o.created_at,
    decide_le: m.decide_le || null,
    termine_le: m.termine_le || null,
    mentor: personne(mentor),
    mentee: personne(mentee)
  };
}

module.exports = { MAX_ACCOMPAGNES, MAX_DEMANDES_EN_ATTENTE, verifierDemande, verifierCapacite, TEXTES, notifierMentorat, serialiserDemande };
