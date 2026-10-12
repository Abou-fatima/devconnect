# Guide Dev 1 — Alpha Ousmane Bah
**Rôle : Lead, backend core, authentification, profils, déploiement**
Prérequis communs : voir le [README](../README.md) (étapes 1 à 5).

## État du code (déjà écrit)

Le code des sections C, D et E ci-dessous est déjà dans `server/` : tu n'as pas à le réécrire, seulement à l'installer, le tester et le pousser.

| Fichier | Contenu |
|---|---|
| `src/routes/auth.js` | register, login, me, OTP (send/verify), GitHub OAuth |
| `src/routes/users.js` | recherche, profil public, modifier profil, mot de passe |
| `src/middleware/auth.js`, `role.js` | `auth`, `optionalAuth`, `requireRole(...)` pour les autres devs |
| `src/docs/openapi.js` | Swagger sur `/api/docs` |
| `tests/logic.test.js` | `npm run test:logic` |
| `scripts/smoke.sh` | test de bout en bout avec curl |

Vérification après `npm install` :
```bash
cd server
npm run test:logic          # 8 tests de logique, sans base de données
npm run dev                 # dans un terminal (MongoDB démarré)
bash scripts/smoke.sh       # dans un autre terminal
```
Ouvre ensuite http://localhost:4000/api/docs.

GitHub OAuth : créer une OAuth App sur https://github.com/settings/developers avec le callback `http://localhost:4000/api/auth/github/callback`, puis renseigner `GITHUB_CLIENT_ID` et `GITHUB_CLIENT_SECRET` dans `.env`.

## A. Initialiser le dépôt (toi seul, au tout début)

```bash
cd devconnect
git init
git add .
git commit -m "chore: squelette initial (server + modèles)"
git branch -M main
git remote add origin <URL_DU_DEPOT>
git push -u origin main
git checkout -b develop
git push -u origin develop
```

Sur GitHub : Settings → Branches → protéger `main` et `develop` (PR obligatoire, 1 review). Ajouter les 4 autres développeurs en collaborateurs.

## B. Démarrer le backend

```bash
git checkout develop && git pull origin develop
cd server
cp .env.example .env     # mettre un vrai JWT_SECRET : openssl rand -hex 32
npm install
npm run dev
curl http://localhost:4000/api/health
```

## C. Authentification (F-01, F-41)

```bash
git checkout -b feature/dev1-auth
cd server
npm install express-validator express-rate-limit passport passport-github2 nodemailer
mkdir -p src/routes src/middleware src/config src/controllers
```

Fichiers à créer :
1. `src/middleware/auth.js` : vérifie le JWT (`Authorization: Bearer ...`), remplit `req.user`.
2. `src/middleware/role.js` : `requireRole('admin','moderateur')`.
3. `src/routes/auth.js` : `POST /register`, `POST /login`, `POST /otp/send`, `POST /otp/verify`, `GET /github`, `GET /github/callback`, `GET /me`.
4. Brancher dans `src/index.js` : `app.use('/api/auth', require('./routes/auth'));`

Test :
```bash
curl -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" \
  -d '{"pseudo":"test","email":"t@t.com","mot_de_passe":"Azerty123"}'
curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"t@t.com","mot_de_passe":"Azerty123"}'
```

Livrer :
```bash
git add . && git commit -m "feat: authentification JWT, OTP, GitHub OAuth"
git fetch origin && git rebase origin/develop
git push -u origin feature/dev1-auth
```
→ Pull Request vers `develop`. **Prévenir l'équipe dès que `/api/auth/login` marche** (tout le monde en dépend).

## D. Profils et recherche (F-02 à F-07)

```bash
git checkout develop && git pull origin develop
git checkout -b feature/dev1-profils
```
- `src/routes/users.js` : `GET /api/users/:id`, `PUT /api/users/me`, `GET /api/users?stack=react&pays=GN&niveau=avance`
- Pagination (`?page=1&limit=20`) et projection pour ne jamais renvoyer `mot_de_passe_hash`.

```bash
git add . && git commit -m "feat: profils et recherche de développeurs"
git push -u origin feature/dev1-profils
```

## E. Swagger / OpenAPI

```bash
git checkout develop && git pull origin develop
git checkout -b feature/dev1-swagger
cd server && npm install swagger-ui-express yamljs
```
Créer `server/openapi.yaml`, puis dans `index.js` :
`app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(YAML.load('./openapi.yaml')));`
→ Documentation sur http://localhost:4000/api/docs

```bash
git add . && git commit -m "docs: Swagger OpenAPI"
git push -u origin feature/dev1-swagger
```

## F. Revue et intégration (tout au long du projet)

```bash
git fetch origin
git checkout feature/devX-sujet     # branche à relire
npm --prefix server install && npm --prefix server run dev
```
Fusionner les PR validées vers `develop`. Vers J10, J16 et J21 : fusionner `develop` dans `main`.

```bash
git checkout main && git pull origin main
git merge --no-ff develop
git push origin main
git tag v0.1.0 && git push origin v0.1.0
```

## G. Déploiement DataCloud Systalink

```bash
ssh <utilisateur>@<serveur-datacloud>
git clone <URL_DU_DEPOT> && cd devconnect
git checkout main
cd server && cp .env.example .env     # renseigner les vraies valeurs
npm install --omit=dev
npm install -g pm2
pm2 start src/index.js --name devconnect-api
pm2 save && pm2 startup
```

Mise à jour d'une version :
```bash
cd devconnect && git pull origin main
cd server && npm install --omit=dev && pm2 restart devconnect-api
pm2 logs devconnect-api
```

Frontend (une fois prêt) :
```bash
cd client && npm install && npm run build   # génère client/dist
# servir client/dist avec nginx
```

## H. Fin de projet
- README final à jour, Swagger complet, `main` stable, tag `v1.0.0`.
- Participer à la vidéo (90 s) et au pitch (10 slides).
