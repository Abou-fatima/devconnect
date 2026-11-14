const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/error');

const openapi = require('./docs/openapi.dev5');

const communication = require('./communication');
communication.extendOpenapi(openapi); // documentation Swagger du module communication (avant swagger-ui)
require('./docs/openapi.forum')(openapi); // documentation Swagger forum, classement, admin


const app = express();
app.set('trust proxy', 1); // derrière nginx / DataCloud : IP réelle pour le rate limit

// Documentation (Swagger UI) : http://localhost:4000/api/docs
// Montée AVANT helmet : sa politique CSP par défaut bloquerait les scripts de Swagger UI.
app.get('/api/docs.json', (_req, res) => res.json(openapi));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'DevConnect API' }));

// Politique de sécurité du site servi par ce serveur (un seul service : API + site compilé).
// 'unsafe-eval' est nécessaire au défi de la semaine : le code du participant s'exécute dans un Web Worker isolé (voir lib/sandboxDefi.js).
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'script-src': ["'self'", "'unsafe-eval'"],
      'worker-src': ["'self'", 'blob:'],
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'media-src': ["'self'", 'data:', 'blob:'],
      'connect-src': ["'self'", 'https:', 'wss:'],
      'style-src': ["'self'", "'unsafe-inline'", 'https:'],
      'font-src': ["'self'", 'data:', 'https:'],
    },
  },
}));
app.use(cors({ origin: env.frontendUrl.split(',').map((s) => s.trim()), credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Images envoyées (WebP). Noms uniques : cache long. Autorisées depuis le frontend (autre origine en développement).
app.use('/uploads', (_req, res, next) => { res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); next(); },
  express.static(env.uploadsDir, { maxAge: '30d', immutable: true, index: false, dotfiles: 'deny' }));

app.use('/api', apiLimiter);

// Dev 1
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/meta', require('./routes/meta'));

// Dev 5 : projets et images
app.use('/api/upload', require('./routes/upload'));
app.use('/api/push', require('./routes/push')); // notifications push (appareils abonnés)
app.use('/api/projets', require('./routes/projets'));
app.use('/api', require('./routes/candidatures')); // candidatures et membres des projets
app.use('/api', require('./routes/taches')); // espace projet : tâches de l'équipe
app.use('/api/mentorat', require('./routes/mentorat')); // mentorat : trouver un mentor, demandes, accompagnements

// Forum, votes, classement, administration
app.use('/api/echanges', require('./routes/echanges'));
app.use('/api/classement', require('./routes/classement'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/salons', require('./routes/salons'));
app.use('/api/partage', require('./routes/partage')); // aperçus de partage (WhatsApp) : question et projet
app.use('/api/defis', require('./routes/defis')); // défi de la semaine
communication.mountRoutes(app);


// Site compilé (client/dist) : servi par ce même serveur quand il existe (production sur un seul service).
// Toute adresse qui n'est pas l'API, un fichier envoyé ou Socket.IO renvoie la page d'accueil (navigation côté navigateur).
const dossierSite = path.join(__dirname, '../../client/dist');
if (fs.existsSync(path.join(dossierSite, 'index.html'))) {
  app.use(express.static(dossierSite, { index: false, maxAge: '1h' }));
  app.get(/^\/(?!api\/|uploads\/|socket\.io\/).*/, (_req, res) => res.sendFile(path.join(dossierSite, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
