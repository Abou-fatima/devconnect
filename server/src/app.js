const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/error');
const openapi = require('./docs/openapi');

const app = express();
app.set('trust proxy', 1); // derrière nginx / DataCloud : IP réelle pour le rate limit

// Documentation (Swagger UI) : http://localhost:4000/api/docs
// Montée AVANT helmet : sa politique CSP par défaut bloquerait les scripts de Swagger UI.
app.get('/api/docs.json', (_req, res) => res.json(openapi));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'DevConnect API' }));

app.use(helmet());
app.use(cors({ origin: env.frontendUrl.split(',').map((s) => s.trim()), credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api', apiLimiter);

// Dev 1
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/meta', require('./routes/meta'));
// TODO (Dev 2) : app.use('/api/echanges', require('./routes/echanges'));
// TODO (Dev 3) : app.use('/api/chat', ...); app.use('/api/notifications', ...); app.use('/api/upload', ...);
// TODO (Dev 5) : app.use('/api/projets', require('./routes/projets'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
