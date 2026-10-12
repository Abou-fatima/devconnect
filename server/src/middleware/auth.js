const AppError = require('../utils/AppError');
const { verifyToken } = require('../utils/jwt');
const Utilisateur = require('../models/Utilisateur');

const extractToken = (req) => {
  const h = req.headers.authorization || '';
  const [type, token] = h.split(' ');
  return type === 'Bearer' && token ? token : null;
};

// Exige un utilisateur connecté. Remplit req.user (document Mongoose) et req.userId.
const auth = async (req, _res, next) => {
  try {
    const token = extractToken(req);
    if (!token) throw new AppError(401, 'Authentification requise');
    let payload;
    try { payload = verifyToken(token); } catch { throw new AppError(401, 'Token invalide ou expiré'); }
    const user = await Utilisateur.findById(payload.sub);
    if (!user) throw new AppError(401, 'Compte introuvable');
    req.user = user;
    req.userId = String(user._id);
    next();
  } catch (e) { next(e); }
};

// Comme auth, mais sans erreur si pas de token (req.user reste undefined).
const optionalAuth = async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    const user = await Utilisateur.findById(payload.sub);
    if (user) { req.user = user; req.userId = String(user._id); }
  } catch { /* token invalide : on continue en anonyme */ }
  next();
};

module.exports = { auth, optionalAuth };
