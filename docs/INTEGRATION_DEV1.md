# Utiliser le code de Dev 1 (Alpha Ousmane Bah)

Ce guide s'adresse à Dev 2, 3, 4 et 5. L'authentification, les profils et les outils communs sont **déjà codés et testés**. Tu n'as rien à réécrire : tu les utilises.

## 1. Récupérer le code

```powershell
git checkout develop
git pull origin develop
cd server
npm install
```
`npm install` est obligatoire : de nouvelles dépendances ont été ajoutées (zod, express-rate-limit, swagger-ui-express, nodemailer).
Vérifie ensuite ton `.env` (voir le README, section 4) puis lance `npm run dev`.

## 2. Obtenir un token pour tester tes routes

Tout ce qui est protégé demande un en-tête `Authorization: Bearer <token>`.

**Avec Swagger (le plus simple)** : ouvre http://localhost:4000/api/docs, fais `POST /api/auth/register` (ou `login`), copie le `token` de la réponse, clique sur **Authorize** et colle-le. Toutes les routes essayées ensuite sont authentifiées.

**Avec PowerShell** :
```powershell
curl.exe -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" -d '{\"pseudo\":\"mon_pseudo\",\"email\":\"moi@mail.com\",\"mot_de_passe\":\"Azerty123\"}'
$token = "colle_le_token_ici"
curl.exe http://localhost:4000/api/auth/me -H "Authorization: Bearer $token"
```
Le mot de passe doit avoir au moins 8 caractères, avec une lettre et un chiffre. Le token dure 7 jours.

Les tokens ne sont valables que sur la machine qui a le même `JWT_SECRET` : chacun crée ses comptes de test sur sa propre base locale.

## 3. Protéger une route

Les trois middlewares sont dans `server/src/middleware/`.

```js
const express = require('express');
const { auth, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const AppError = require('../utils/AppError');

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Connecté obligatoire
router.post('/', auth, asyncRoute(async (req, res) => {
  req.userId;      // identifiant de l'utilisateur (texte)
  req.user;        // document Mongoose complet (pseudo, role, reputation...)
  res.status(201).json({ ok: true });
}));

// Public, mais on reconnaît l'utilisateur s'il envoie un token
router.get('/', optionalAuth, asyncRoute(async (req, res) => {
  const connecte = Boolean(req.user);
  res.json({ connecte });
}));

// Réservé aux modérateurs et administrateurs
router.delete('/:id', auth, requireRole('moderateur', 'admin'), asyncRoute(async (req, res) => {
  res.json({ supprime: true });
}));

module.exports = router;
```

Codes renvoyés automatiquement : `401` sans token ou token invalide, `403` si le rôle ne convient pas.

## 4. Brancher ta route dans l'application

Dans `server/src/app.js`, il y a des lignes `TODO` à ton nom. Décommente-les et adapte :
```js
app.use('/api/echanges', require('./routes/echanges'));   // Dev 2
app.use('/api/projets', require('./routes/projets'));     // Dev 5
```
Le dossier `server/src/routes/` existe déjà. Dev 3 branche aussi ses routes et son Socket.IO dans `app.js` et `index.js` (lignes `TODO`).

## 5. Gérer les erreurs et valider les données

Lance une `AppError` pour répondre proprement, elle est transformée en JSON par le serveur :
```js
throw new AppError(404, 'Post introuvable');     // -> { "erreur": "Post introuvable" }
throw new AppError(403, 'Seul l\'auteur peut modifier');
```
Valide les données reçues avec **zod** : une donnée invalide renvoie automatiquement une erreur `400` avec le détail des champs.
```js
const { z } = require('zod');
const creerPost = z.object({
  titre: z.string().trim().min(5).max(150),
  contenu: z.string().trim().min(10).max(5000),
  tags: z.array(z.string().trim().toLowerCase()).max(5).default([])
});
// dans la route :
const data = creerPost.parse(req.body);
```
Les exemples complets sont dans `server/src/validators/` et `server/src/routes/users.js`.

Les identifiants invalides (`CastError`) et les doublons Mongo (code 11000, renvoyé en `409`) sont déjà gérés par `src/middleware/error.js`.

**Format des erreurs, à respecter côté frontend** : `{ "erreur": "message", "details": [...] }`.

## 6. Ce qui existe déjà

### Routes de Dev 1

| Méthode et route | Rôle | Accès |
|---|---|---|
| `POST /api/auth/register` | Inscription (pseudo, email, mot de passe) | public |
| `POST /api/auth/login` | Connexion (email ou téléphone + mot de passe) | public |
| `GET /api/auth/me` | Mon compte | connecté |
| `POST /api/auth/otp/send` | Envoyer un code par email ou téléphone | public |
| `POST /api/auth/otp/verify` | Vérifier le code, connecte ou crée le compte | public |
| `GET /api/auth/github` | Démarre la connexion GitHub (redirection) | public |
| `GET /api/users` | Recherche de développeurs (`stack`, `pays`, `niveau`, `objectif`, `q`, `page`, `limit`, `tri`) | public |
| `GET /api/users/:id` | Profil public | public |
| `PUT /api/users/me` | Modifier mon profil | connecté |
| `PUT /api/users/me/password` | Changer ou définir mon mot de passe | connecté |
| `GET /api/meta/options` | Niveaux, objectifs et stacks pour les formulaires | public |

Les détails de chaque route (champs, réponses) sont dans Swagger : http://localhost:4000/api/docs.

### Réponse de connexion

```json
{ "token": "eyJ...", "utilisateur": { "id": "...", "pseudo": "...", "role": "dev", "reputation": 0, "stacks": [], "email": "..." } }
```

### Outils réutilisables

| Fichier | À utiliser pour |
|---|---|
| `src/utils/serialize.js` | `publicUser(doc)` : ce qu'on peut montrer aux autres, **sans email, téléphone ni mot de passe**. Utilise-le quand tu renvoies un auteur dans un post, un message, un projet |
| `src/utils/constants.js` | `NIVEAUX`, `OBJECTIFS`, `ROLES`, `STACKS_SUGGEREES` |
| `src/utils/jwt.js` | `verifyToken(token)` : **Dev 3**, pour authentifier les connexions Socket.IO (`socket.handshake.auth.token`) |
| `src/middleware/rateLimit.js` | Limiter le nombre de requêtes sur une route sensible |
| `src/utils/AppError.js` | Erreurs HTTP propres |

Authentification d'un socket (Dev 3) :
```js
const { verifyToken } = require('../utils/jwt');
const Utilisateur = require('../models/Utilisateur');

io.use(async (socket, next) => {
  try {
    const payload = verifyToken(socket.handshake.auth.token);
    const user = await Utilisateur.findById(payload.sub);
    if (!user) return next(new Error('Compte introuvable'));
    socket.user = user;
    next();
  } catch { next(new Error('Token invalide')); }
});
```

### Spécificités du modèle Utilisateur

- Le `pseudo` est unique sans tenir compte des majuscules (`Alpha` et `alpha` sont le même).
- `email`, `telephone` et `github_id` sont uniques, mais optionnels. N'enregistre jamais la valeur `null` : laisse le champ absent.
- Pour modifier la réputation (Dev 2) : `Utilisateur.updateOne({ _id }, { $inc: { reputation: 10 } })`. Ne réécris pas tout le document.
- `mot_de_passe_hash` n'est jamais renvoyé : ne le sélectionne jamais dans tes requêtes.
- Toute modification du modèle (`src/models/Utilisateur.js`) passe par une PR relue par Dev 1.

## 7. Connexion GitHub côté frontend (Dev 4)

Le frontend envoie l'utilisateur vers `http://localhost:4000/api/auth/github`. Après l'autorisation, le serveur redirige vers `http://localhost:5173/auth/callback#token=...` (ou `#erreur=...` en cas d'échec). Le token est dans le **fragment** de l'adresse (après `#`).

Page à créer, `src/pages/AuthCallback.jsx` :
```jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('token');
    window.history.replaceState(null, '', window.location.pathname); // efface le token de l'adresse
    if (token) {
      localStorage.setItem('token', token);
      navigate('/profil', { replace: true });
    } else {
      navigate('/connexion?erreur=github', { replace: true });
    }
  }, [navigate]);
  return <p>Connexion en cours...</p>;
}
```
Ajoute la route `/auth/callback` dans `App.jsx`. Ensuite, chaque appel à l'API envoie `Authorization: Bearer <token>` (voir `src/services/api.js`).

## 8. Tester ton travail

Le script `server/scripts/smoke.ps1` est un exemple complet de test de bout en bout. Copie-le en `smoke-devX.ps1` et adapte-le pour tes routes (les fonctions `Call` et `Check` sont réutilisables).

```powershell
npm run test:logic
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke.ps1
```
Avant d'ouvrir une Pull Request : ces deux commandes doivent passer, et ton propre test aussi.

## 9. Documenter tes routes dans Swagger

Ajoute tes routes dans l'objet `paths` de `server/src/docs/openapi.js` (copie un exemple existant). Les schémas partagés sont dans `components.schemas`. Le test `test:logic` vérifie que chaque `$ref` pointe vers un schéma existant.

## 10. Questions et blocages

Problème avec l'authentification, les middlewares ou le modèle Utilisateur : demande à Dev 1 (Alpha), en précisant la commande lancée et le message d'erreur complet.
