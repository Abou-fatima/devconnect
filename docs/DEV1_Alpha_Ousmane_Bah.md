# Guide Dev 1 — Alpha Ousmane Bah
**Rôle : Lead, backend core, authentification, profils, déploiement**
Prérequis communs : voir le [README](../README.md) (sections 1 à 6).

## État du code (déjà écrit)

Le code de l'authentification, des profils, de la recherche et de Swagger est déjà dans `server/` : tu n'as pas à le réécrire, seulement à l'installer, le tester et le pousser.

| Fichier | Contenu |
|---|---|
| `src/routes/auth.js` | register, login, me, OTP (send/verify), GitHub OAuth |
| `src/routes/users.js` | recherche, profil public, modifier profil, mot de passe |
| `src/middleware/auth.js`, `role.js` | `auth`, `optionalAuth`, `requireRole(...)` pour les autres devs |
| `src/docs/openapi.js` | Swagger sur `/api/docs` |
| `tests/logic.test.js` | `npm run test:logic` |
| `scripts/smoke.sh` | test de bout en bout avec curl (Mac/Linux/Git Bash) |
| `scripts/smoke.ps1` | même test pour Windows PowerShell |

Vérification après `npm install` (serveur lancé avec `npm run dev` dans un autre terminal) :
```powershell
npm run test:logic
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke.ps1
```
Ouvre ensuite http://localhost:4000/api/docs.

GitHub OAuth : voir la section C ci-dessous.

## A. Initialiser le dépôt (toi seul, au tout début)

```powershell
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

```powershell
git checkout develop
git pull origin develop
cd server
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copie le résultat dans `JWT_SECRET` de `server/.env`, puis :
```powershell
npm install
npm run dev
```
Dans un autre terminal : `curl.exe http://localhost:4000/api/health` doit répondre `{"ok":true}`.

## C. Authentification, profils, Swagger : déjà codés et testés

Les fonctionnalités F-01 à F-07 et F-41 sont dans `server/` (voir le tableau « État du code » plus haut). Elles ont été testées : `test:logic` (8 réussis), `smoke.ps1` (`TOUT EST BON`) et la connexion GitHub réelle.

### Obtenir les identifiants GitHub OAuth

1. Va sur https://github.com/settings/developers, puis **OAuth Apps**, puis **New OAuth App**.
2. Remplis le formulaire :
   - Application name : `DevConnect (dev)`
   - Homepage URL : `http://localhost:5173`
   - Redirect URI : `http://localhost:4000/api/auth/github/callback` (exactement, sans espace ni `/` final)
   - Laisse décochés : Allow wildcard matching, Enable Device Flow, Expire user access tokens.
3. **Register application**, puis copie le **Client ID**.
4. **Generate a new client secret** et copie-le tout de suite (il ne s'affiche qu'une fois).
5. Mets-les dans `server/.env` :
   ```
   GITHUB_CLIENT_ID=ton_client_id
   GITHUB_CLIENT_SECRET=ton_client_secret
   ```
6. Redémarre le serveur et ouvre http://localhost:4000/api/auth/github dans le navigateur. Après l'autorisation, tu es redirigé vers `http://localhost:5173/auth/callback#token=...`. Tant que le client React n'existe pas, la page affiche une erreur de connexion : c'est normal. Le token dans l'adresse prouve que ça marche.

Ne mets jamais le secret dans le dépôt. En production, ajoute l'adresse publique dans les Redirect URIs (jusqu'à 10 possibles).

## D. Livrer ta partie (première Pull Request)

Vérifie d'abord, dans `server/`, serveur lancé :
```powershell
npm run test:logic
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke.ps1
```
Puis, à la racine du projet :
```powershell
git status
git checkout -b feature/dev1-auth
git add .
git commit -m "feat: authentification JWT, OTP, GitHub OAuth, profils, recherche, Swagger"
git push -u origin feature/dev1-auth
```
Contrôle `git status` : `server/.env` ne doit **pas** apparaître. Ouvre la Pull Request vers `develop`.

Quand elle est fusionnée, **préviens l'équipe** : ils doivent lire [INTEGRATION_DEV1.md](INTEGRATION_DEV1.md), faire `git pull origin develop` et `npm install` dans `server/`.

## E. Aider les autres (tout au long du projet)

Les autres développeurs t'appellent quand l'authentification ou le modèle Utilisateur leur pose un problème. Demande-leur la commande lancée et le message d'erreur complet. Tu relis aussi leurs Pull Requests : tu es obligatoire sur toute modification de `server/src/models/`.

## F. Revue et intégration

```powershell
git fetch origin
git checkout feature/devX-sujet
cd server
npm install
npm run dev
```
Teste la branche à relire (Swagger, `smoke.ps1`), puis fusionne les PR validées vers `develop`. Vers J10, J16 et J21, fusionne `develop` dans `main` :
```powershell
git checkout main
git pull origin main
git merge --no-ff develop
git push origin main
git tag v0.1.0
git push origin v0.1.0
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
