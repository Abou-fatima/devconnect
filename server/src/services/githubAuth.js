// Règles de la connexion GitHub : « se connecter » n'ouvre jamais de compte, « s'inscrire » peut en créer un.
const MODES = ['connexion', 'inscription'];

const modeValide = (m) => (MODES.includes(m) ? m : 'inscription'); // sans précision : comportement historique (création possible)
const peutCreerCompte = (mode) => modeValide(mode) !== 'connexion';

module.exports = { MODES, modeValide, peutCreerCompte };
