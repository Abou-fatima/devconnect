const rateLimit = require('express-rate-limit');

const make = (windowMin, max, message) =>
  rateLimit({
    windowMs: windowMin * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erreur: message }
  });

// Connexion / inscription : 20 tentatives par 15 min et par IP
const authLimiter = make(15, 20, 'Trop de tentatives, réessayez dans quelques minutes');
// Envoi d'OTP : 5 par 15 min et par IP (évite le spam SMS/email)
const otpLimiter = make(15, 5, 'Trop de demandes de code, réessayez plus tard');
// API générale
const apiLimiter = make(1, 300, 'Trop de requêtes');

// Écriture (posts, réponses, commentaires, votes) : 60 par 10 min et par IP
const ecritureLimiter = make(10, 60, 'Trop d\'actions, ralentissez');

// Envoi d'images (traitement lourd pour le serveur) : 30 par 10 min et par IP
const uploadLimiter = make(10, 30, 'Trop d\'images envoyées, patientez quelques minutes');

module.exports = { authLimiter, otpLimiter, apiLimiter, ecritureLimiter, uploadLimiter };
