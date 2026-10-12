const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const env = require('../config/env');
const Utilisateur = require('../models/Utilisateur');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/jwt');
const { privateUser } = require('../utils/serialize');
const { auth } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimit');
const otpStore = require('../config/otpStore');
const { sendOtp } = require('../utils/mailer');
const v = require('../validators/auth');

const router = express.Router();
const BCRYPT_ROUNDS = 12;
// Hash factice : comparé quand le compte n'existe pas, pour ne pas révéler son existence par le temps de réponse
const DUMMY_HASH = bcrypt.hashSync('dummy-password-1', BCRYPT_ROUNDS);

const reponse = (res, status, user) => res.status(status).json({ token: signToken(user), utilisateur: privateUser(user) });

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Génère un pseudo libre à partir d'une base (ex : login GitHub)
async function uniquePseudo(base) {
  let clean = String(base || 'dev').replace(/[^\p{L}0-9_.-]/gu, '').slice(0, 24);
  if (clean.length < 3) clean = `dev${clean}`;
  const taken = (p) => Utilisateur.exists({ pseudo: p }).collation({ locale: 'en', strength: 2 });
  if (!(await taken(clean))) return clean;
  for (let i = 0; i < 8; i += 1) {
    const candidate = `${clean.slice(0, 24)}${crypto.randomInt(100, 9999)}`;
    if (!(await taken(candidate))) return candidate;
  }
  return `${clean.slice(0, 16)}${Date.now().toString(36)}`;
}

/* ------------------------------ Email + mot de passe ------------------------------ */

router.post('/register', authLimiter, asyncRoute(async (req, res) => {
  const data = v.register.parse(req.body);

  if (await Utilisateur.exists({ email: data.email })) throw new AppError(409, 'Cet email est déjà utilisé');
  if (data.telephone && (await Utilisateur.exists({ telephone: data.telephone }))) throw new AppError(409, 'Ce téléphone est déjà utilisé');
  if (await Utilisateur.exists({ pseudo: data.pseudo }).collation({ locale: 'en', strength: 2 })) throw new AppError(409, 'Ce pseudo est déjà pris');

  const user = await Utilisateur.create({
    pseudo: data.pseudo,
    email: data.email,
    telephone: data.telephone,
    pays: data.pays,
    ville: data.ville,
    mot_de_passe_hash: await bcrypt.hash(data.mot_de_passe, BCRYPT_ROUNDS)
  });
  reponse(res, 201, user);
}));

router.post('/login', authLimiter, asyncRoute(async (req, res) => {
  const { identifiant, mot_de_passe } = v.login.parse(req.body);
  const query = identifiant.startsWith('+') ? { telephone: identifiant } : { email: identifiant.toLowerCase() };
  const user = await Utilisateur.findOne(query);

  const ok = await bcrypt.compare(mot_de_passe, user && user.mot_de_passe_hash ? user.mot_de_passe_hash : DUMMY_HASH);
  if (!user || !user.mot_de_passe_hash || !ok) throw new AppError(401, 'Identifiants incorrects');
  reponse(res, 200, user);
}));

router.get('/me', auth, (req, res) => res.json({ utilisateur: privateUser(req.user) }));

/* ------------------------------ OTP (email ou téléphone) ------------------------------ */

router.post('/otp/send', otpLimiter, asyncRoute(async (req, res) => {
  const body = v.otpSend.parse(req.body);
  const canal = body.email ? 'email' : 'telephone';
  const destinataire = body.email || body.telephone;

  const code = otpStore.generateCode();
  await otpStore.save(destinataire, code);
  const envoye = await sendOtp({ canal, destinataire, code });

  // Réponse volontairement identique que le compte existe ou non.
  const payload = { message: 'Si ce contact est valide, un code a été envoyé', expire_dans_secondes: env.otpTtl };
  if (!env.isProd && !envoye) payload.code_dev = code; // facilite les tests sans SMS ni SMTP
  res.json(payload);
}));

router.post('/otp/verify', authLimiter, asyncRoute(async (req, res) => {
  const body = v.otpVerify.parse(req.body);
  const canal = body.email ? 'email' : 'telephone';
  const destinataire = body.email || body.telephone;

  if (!(await otpStore.verify(destinataire, body.code))) throw new AppError(400, 'Code incorrect ou expiré');

  let user = await Utilisateur.findOne({ [canal]: destinataire });
  if (user) return reponse(res, 200, user);

  if (!body.pseudo) throw new AppError(422, 'Nouveau compte : le champ pseudo est requis', { besoin: ['pseudo'] });
  if (await Utilisateur.exists({ pseudo: body.pseudo }).collation({ locale: 'en', strength: 2 })) throw new AppError(409, 'Ce pseudo est déjà pris');

  user = await Utilisateur.create({ pseudo: body.pseudo, [canal]: destinataire });
  reponse(res, 201, user);
}));

/* ------------------------------ GitHub OAuth (F-41) ------------------------------ */

const STATE_AUDIENCE = 'github-oauth-state';
const callbackUrl = () => `${env.apiUrl}/api/auth/github/callback`;
const front = (hash) => `${env.frontendUrl}/auth/callback#${hash}`;

router.get('/github', (_req, res, next) => {
  try {
    if (!env.github.clientId) throw new AppError(503, 'GitHub OAuth non configuré (GITHUB_CLIENT_ID manquant)');
    const state = jwt.sign({ n: crypto.randomBytes(8).toString('hex') }, env.jwtSecret, { expiresIn: '10m', audience: STATE_AUDIENCE });
    const params = new URLSearchParams({
      client_id: env.github.clientId,
      redirect_uri: callbackUrl(),
      scope: 'read:user user:email',
      state
    });
    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
  } catch (e) { next(e); }
});

router.get('/github/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) throw new Error('Paramètres manquants');
    try { jwt.verify(String(state), env.jwtSecret, { audience: STATE_AUDIENCE }); } catch { throw new Error('State invalide ou expiré'); }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: env.github.clientId, client_secret: env.github.clientSecret, code, redirect_uri: callbackUrl() })
    });
    const tokenJson = await tokenRes.json();
    if (!tokenJson.access_token) throw new Error('Échange du code GitHub refusé');

    const gh = { Authorization: `Bearer ${tokenJson.access_token}`, 'User-Agent': 'DevConnect', Accept: 'application/vnd.github+json' };
    const profile = await (await fetch('https://api.github.com/user', { headers: gh })).json();
    if (!profile.id) throw new Error('Profil GitHub illisible');

    let email = null;
    const emailsRes = await fetch('https://api.github.com/user/emails', { headers: gh });
    if (emailsRes.ok) {
      const emails = await emailsRes.json();
      const primary = Array.isArray(emails) && emails.find((e) => e.primary && e.verified);
      if (primary) email = primary.email.toLowerCase();
    }

    const githubId = String(profile.id);
    let user = await Utilisateur.findOne({ github_id: githubId });

    if (!user && email) {
      // Un compte avec le même email vérifié par GitHub : on le relie
      user = await Utilisateur.findOne({ email });
      if (user) { user.github_id = githubId; await user.save(); }
    }

    if (!user) {
      user = await Utilisateur.create({
        pseudo: await uniquePseudo(profile.login),
        email: email || undefined,
        github_id: githubId,
        profil: {
          bio: profile.bio ? String(profile.bio).slice(0, 500) : undefined,
          photo: profile.avatar_url,
          liens: { github: profile.html_url }
        },
        ville: profile.location ? String(profile.location).slice(0, 60) : undefined
      });
    }

    // Le token est passé dans le fragment (#) : il n'est jamais envoyé aux serveurs ni aux logs.
    res.redirect(front(`token=${encodeURIComponent(signToken(user))}`));
  } catch (e) {
    console.error('[github oauth]', e.message);
    res.redirect(front(`erreur=${encodeURIComponent('Connexion GitHub impossible')}`));
  }
});

module.exports = router;
