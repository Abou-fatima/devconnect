# DevConnect — CADEV 2026 (Systalink)

Plateforme communautaire pour développeurs africains : forum Q&A, showcase de projets, chat temps réel, mentorat.
Stack : React + Tailwind (PWA) · Node.js/Express · MongoDB · Redis · Socket.IO · Whisper.

## Équipe

| Dev | Nom | Rôle | Guide |
|---|---|---|---|
| Dev 1 | Alpha Ousmane Bah | Lead, backend core & auth | [docs/DEV1_Alpha_Ousmane_Bah.md](docs/DEV1_Alpha_Ousmane_Bah.md) |
| Dev 2 | Ousmane Diallo | Backend forum / Q&A | [docs/DEV2_Ousmane_Diallo.md](docs/DEV2_Ousmane_Diallo.md) |
| Dev 3 | Mamadou Charif Balde | Temps réel & vocal | [docs/DEV3_Mamadou_Charif_Balde.md](docs/DEV3_Mamadou_Charif_Balde.md) |
| Dev 4 | Mamadou Dian Barry | Frontend A (core UI) | [docs/DEV4_Mamadou_Dian_Barry.md](docs/DEV4_Mamadou_Dian_Barry.md) |
| Dev 5 | Ibrahima Sory Diallo | Frontend B, projets & collaboration | [docs/DEV5_Ibrahima_Sory_Diallo.md](docs/DEV5_Ibrahima_Sory_Diallo.md) |

Chacun suit **son** guide du début à la fin. Les étapes 1 à 4 ci-dessous sont communes.

---

## 1. Prérequis (tous)

```bash
node -v      # >= 20
npm -v
git --version
mongod --version    # MongoDB 7 (ou Docker, voir plus bas)
redis-server --version   # Redis 7 (Dev 1 et Dev 3 surtout)
```

Sans MongoDB/Redis installés, lancer avec Docker :

```bash
docker run -d --name mongo -p 27017:27017 mongo:7
docker run -d --name redis -p 6379:6379 redis:7
```

## 2. Configuration Git (une seule fois)

```bash
git config --global user.name "Votre Nom"
git config --global user.email "votre@email.com"
```

## 3. Cloner le projet

```bash
git clone <URL_DU_DEPOT>
cd devconnect
git checkout develop
git pull origin develop
```

## 4. Installer et lancer

```bash
# Backend
cd server
cp .env.example .env     # puis éditer .env (MONGO_URI, JWT_SECRET...)
npm install
npm run dev              # http://localhost:4000/api/health doit répondre {"ok":true}

# Frontend (dans un autre terminal, une fois le client créé par Dev 4)
cd client
npm install
npm run dev              # http://localhost:5173
```

## 5. Règles Git (obligatoires)

- `main` = version stable (jamais de push direct). `develop` = intégration.
- Une branche par fonctionnalité, nom : `feature/<dev>-<sujet>` (ex. `feature/dev2-votes`).
- Commits petits, en français ou anglais, au format `type: message` (`feat:`, `fix:`, `docs:`, `refactor:`).
- Pull Request vers `develop`, relue par au moins 1 autre dev avant fusion.
- Chaque matin : `git pull origin develop` puis rebase de sa branche.

### Cycle quotidien

```bash
git checkout develop && git pull origin develop
git checkout -b feature/devX-sujet
# ... coder ...
git add .
git commit -m "feat: description"
git fetch origin && git rebase origin/develop
git push -u origin feature/devX-sujet
# Ouvrir la Pull Request sur GitHub vers develop
```

### Après fusion de la PR

```bash
git checkout develop && git pull origin develop
git branch -d feature/devX-sujet
```

### Conflit au rebase

```bash
# éditer les fichiers en conflit, puis
git add <fichier>
git rebase --continue
# en cas de blocage : git rebase --abort
```

## 6. Contrats entre développeurs

| Préfixe API | Responsable |
|---|---|
| `/api/auth`, `/api/users` | Dev 1 |
| `/api/echanges` (posts, réponses, votes), `/api/classement`, `/api/admin` | Dev 2 |
| `/api/chat`, `/api/notifications`, `/api/upload`, `/api/audio` + Socket.IO | Dev 3 |
| Pages auth/profil/forum/classement (React) | Dev 4 |
| `/api/projets`, `/api/candidatures`, `/api/mentorat` + pages projets/chat | Dev 5 |

Toute modification d'un modèle Mongoose (`server/src/models`) passe par une PR relue par Dev 1.

## 7. Jalon critique J12

Parcours complet : inscription → poser une question → créer un projet → recevoir une réponse → discuter en chat.
