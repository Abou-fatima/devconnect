const AppError = require('../utils/AppError');

// À placer APRÈS auth. Exemple : router.delete('/x', auth, requireRole('admin', 'moderateur'), ...)
const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new AppError(401, 'Authentification requise'));
  if (!roles.includes(req.user.role)) return next(new AppError(403, 'Accès refusé'));
  next();
};

module.exports = { requireRole };
