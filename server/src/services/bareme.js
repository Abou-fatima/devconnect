// Barème de réputation (F-08) et badges (F-09). Fonctions pures : testables sans base de données.
const BAREME = Object.freeze({
  vote_positif_reponse: 10,
  vote_positif_post: 5,
  vote_negatif: -2,
  reponse_acceptee: 15
});

const pointsVote = (valeur, cibleType) => {
  if (valeur > 0) return cibleType === 'reponse' ? BAREME.vote_positif_reponse : BAREME.vote_positif_post;
  return BAREME.vote_negatif;
};

// Effet d'un changement de vote. ancien / nouveau : 1, -1 ou 0 (aucun vote).
//   aucun -> +1 : nouveau vote   |  +1 -> 0 : vote retiré   |  +1 -> -1 : vote inversé
function effetVote(ancien, nouveau, cibleType) {
  const pts = (v) => (v === 0 ? 0 : pointsVote(v, cibleType));
  return { delta_votes: nouveau - ancien, delta_reputation: pts(nouveau) - pts(ancien) };
}

// Badges liés à la réputation (une fois gagnés, ils sont conservés)
const PALIERS = [
  { code: 'contributeur', min: 50 },
  { code: 'expert', min: 200 },
  { code: 'maitre', min: 500 }
];
const badgesPour = (reputation) => PALIERS.filter((p) => reputation >= p.min).map((p) => p.code);

module.exports = { BAREME, PALIERS, pointsVote, effetVote, badgesPour };
