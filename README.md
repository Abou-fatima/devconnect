# DevConnect — CADEV 2026 (Systalink)

Plateforme communautaire pour développeurs africains : forum Q&A, showcase de projets, chat temps réel, mentorat.
Stack : React + Tailwind (PWA) · Node.js / Express · MongoDB · Redis · Socket.IO · Whisper.

## Équipe

| Dev | Nom | Rôle | Guide à suivre |
|---|---|---|---|
| Dev 1 | Alpha Ousmane Bah | Lead, backend core & auth | [docs/DEV1_Alpha_Ousmane_Bah.md](docs/DEV1_Alpha_Ousmane_Bah.md) |
| Dev 2 | Ousmane Diallo | Backend forum / Q&A | [docs/DEV2_Ousmane_Diallo.md](docs/DEV2_Ousmane_Diallo.md) |
| Dev 3 | Mamadou Charif Balde | Temps réel & vocal | [docs/DEV3_Mamadou_Charif_Balde.md](docs/DEV3_Mamadou_Charif_Balde.md) |
| Dev 4 | Mamadou Dian Barry | Frontend A (core UI) | [docs/DEV4_Mamadou_Dian_Barry.md](docs/DEV4_Mamadou_Dian_Barry.md) |
| Dev 5 | Ibrahima Sory Diallo | Frontend B, projets & collaboration | [docs/DEV5_Ibrahima_Sory_Diallo.md](docs/DEV5_Ibrahima_Sory_Diallo.md) |

**Chacun suit son guide du début à la fin.** Ce README donne la base commune : installation, lancement, règles Git.
Tout le monde doit aussi lire [docs/INTEGRATION_DEV1.md](docs/INTEGRATION_DEV1.md) : il explique comment utiliser l'authentification et les outils déjà codés.

## État d'avancement

| Partie | État |
|---|---|
| Dev 1 : authentification (email, OTP, GitHub), profils, recherche, Swagger | Codé et testé. Livré sur la branche `develop` |
| Dev 2 : forum / Q&A | À faire |
| Dev 3 : chat, notifications, upload, vocal | À faire |
| Dev 4 : client React | À faire (les autres en dépendent pour les pages) |
| Dev 5 : projets, collaboration, mentorat | À faire |

> Mets ce tableau à jour dans tes Pull Requests quand tu termines une partie.

---

## 1. Prérequis (tous)

| Outil | Version | Vérifier |
|---|---|---|
| Node.js | 20 ou plus | `node -v` |
| Git | récent | `git --version` |
| MongoDB 7 | local ou Docker | voir ci-dessous |
| Redis 7 | optionnel pour Dev 1, 2, 4, 5. **Nécessaire pour Dev 3** | voir ci-dessous |

Le plus simple pour MongoDB et Redis est Docker Desktop. Une seule fois :
```powershell
docker run -d --name mongo -p 27017:27017 mongo:7
docker run -d --name redis -p 6379:6379 redis:7
```
Les fois suivantes, après un redémarrage de l'ordinateur :
```powershell
docker start mongo
docker start redis
```
Sans Docker : installer MongoDB Community Server (et Redis si besoin) et les démarrer comme services.

> Toutes les commandes de ce projet sont écrites pour **Windows PowerShell**. Sous Mac / Linux, elles marchent aussi, sauf `Copy-Item` (utiliser `cp`) et `Remove-Item` (utiliser `rm`).
> Ne jamais utiliser `&&` entre deux commandes sous PowerShell 5 : lancer chaque commande sur sa ligne.

## 2. Configuration Git (une seule fois)

```powershell
git config --global user.name "Votre Nom"
git config --global user.email "votre@email.com"
```

## 3. Cloner le projet

```powershell
git clone <URL_DU_DEPOT>
cd devconnect
git checkout develop
git pull origin develop
```
Alpha (Dev 1) donne l'URL du dépôt et ajoute chacun comme collaborateur sur GitHub.

## 4. Installer et lancer le backend

```powershell
cd server
Copy-Item .env.example .env
npm install
```

Ouvre `server/.env` et renseigne au minimum :
```
JWT_SECRET=une_longue_valeur_secrete_d_au_moins_16_caracteres
MONGO_URI=mongodb://localhost:27017/devconnect
```
Pour générer une bonne valeur :
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Les autres variables (GitHub, SMTP, Redis) sont optionnelles pour travailler. GitHub OAuth est expliqué dans [docs/DEV1_Alpha_Ousmane_Bah.md](docs/DEV1_Alpha_Ousmane_Bah.md).

Lancer :
```powershell
npm run dev
```
Tu dois voir `API prête sur http://localhost:4000`. Le serveur redémarre tout seul quand tu enregistres un fichier.

**À chaque `git pull`** : relance `npm install` dans `server/` (de nouvelles dépendances peuvent avoir été ajoutées par d'autres), puis `npm run dev`.

> `.env` contient des secrets : il est dans `.gitignore`, ne le commite jamais et ne l'envoie pas dans un chat.

## 5. Vérifier que tout marche

Dans un deuxième terminal, dossier `server/`, serveur lancé :
```powershell
npm run test:logic
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke.ps1
```
- `test:logic` : 8 tests `✔`, aucun `fail`.
- `smoke.ps1` : doit finir par `TOUT EST BON` en vert.

Ensuite ouvre http://localhost:4000/api/docs : c'est la documentation interactive (Swagger) de toute l'API. Chaque développeur y ajoute ses propres routes (voir `server/src/docs/openapi.js`).

## 6. Règles Git (obligatoires)

- `main` = version stable, jamais de push direct. `develop` = intégration.
- Une branche par fonctionnalité : `feature/devX-sujet` (ex. `feature/dev2-votes`).
- Commits petits, au format `type: message` (`feat:`, `fix:`, `docs:`, `refactor:`).
- Pull Request vers `develop`, relue par au moins 1 autre développeur avant fusion.
- Ne jamais commiter : `.env`, `node_modules`, `uploads/`.

### Cycle quotidien

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/devX-sujet
# ... coder ...
git status
git add .
git commit -m "feat: description"
git fetch origin
git rebase origin/develop
git push -u origin feature/devX-sujet
```
Puis ouvrir la Pull Request sur GitHub vers `develop`.

### Après la fusion de ta PR

```powershell
git checkout develop
git pull origin develop
git branch -d feature/devX-sujet
```

### Conflit au rebase

```powershell
# corriger les fichiers en conflit, puis
git add <fichier>
git rebase --continue
# en cas de blocage : git rebase --abort
```

## 7. Qui est responsable de quoi

| Préfixe API | Responsable |
|---|---|
| `/api/auth`, `/api/users`, `/api/meta` | Dev 1 (**déjà disponible**) |
| `/api/echanges` (posts, réponses, votes), `/api/classement`, `/api/admin` | Dev 2 |
| `/api/chat`, `/api/notifications`, `/api/upload`, `/api/audio` + Socket.IO | Dev 3 |
| Pages React : auth, profil, forum, classement | Dev 4 |
| `/api/projets`, `/api/candidatures`, `/api/mentorat` + pages projets et chat | Dev 5 |

Toute modification d'un modèle Mongoose (`server/src/models`) passe par une PR relue par Dev 1.

## 8. Problèmes fréquents

| Message ou symptôme | Cause et solution |
|---|---|
| `JWT_SECRET manquant ou trop court` | Renseigne `JWT_SECRET` (16 caractères minimum) dans `server/.env` |
| `Connexion MongoDB impossible` | MongoDB n'est pas démarré : `docker start mongo` |
| `Cannot find module 'xxx'` après un `git pull` | `npm install` dans `server/` (ou `client/`) |
| `EADDRINUSE ... 4000` | Un autre serveur utilise déjà le port : ferme l'ancien terminal, ou change `PORT` dans `.env` |
| Erreur 429 `Trop de tentatives` | Limite de tentatives atteinte : redémarre le serveur (`Ctrl+C`, puis `npm run dev`) |
| `Token invalide ou expiré` | Token mal copié, ou `JWT_SECRET` différent de celui qui l'a créé. Reconnecte-toi pour en obtenir un nouveau |
| `curl` ne comprend pas `-H` | Dans PowerShell, écris `curl.exe` (pas `curl`) |
| `&&` : « jeton inattendu » | PowerShell 5 ne supporte pas `&&` : une commande par ligne |
| Message `oh-my-posh` au lancement | Sans rapport avec le projet (profil PowerShell). Ajoute `-NoProfile` ou ignore-le |
| Erreur CORS depuis le frontend | `FRONTEND_URL` dans `server/.env` doit être exactement l'adresse du client (par défaut `http://localhost:5173`) |
| `redirect_uri_mismatch` (GitHub) | Le Redirect URI de l'application GitHub doit être `http://localhost:4000/api/auth/github/callback` |

## 9. Jalon critique J12

Parcours complet : inscription → poser une question → créer un projet → recevoir une réponse → discuter en chat.
