# Architecture de DevConnect

> Document technique pour le jury CADEV 2026 (critère « qualité technique » : architecture, robustesse, sécurité, qualité du code).

## 1. Vue d'ensemble

```
Navigateur (React 18 + Tailwind 4, PWA)
   │  HTTPS (REST /api/*)         │  WebSocket (Socket.IO)
   ▼                              ▼
┌──────────────────────────────────────────────┐
│ Serveur Node 20 / Express                    │
│  helmet · CORS · limiteurs de débit · zod    │
│  routes ─► services (règles métier) ─► models│
│  communication : Socket.IO, notifications    │
└───────────────┬───────────────┬──────────────┘
                │               │ (optionnel)
           MongoDB Atlas      Redis (adaptateur Socket.IO)
                │
      Fichiers : uploads/ (ou Cloudinary, optionnel)
      Transcription : API compatible OpenAI Whisper (optionnelle)
```

Principe : **un seul serveur, une seule base**, des modules séparés par responsabilité. Redis, Cloudinary et Whisper sont optionnels : sans eux, l'application fonctionne (mode dégradé documenté).

## 2. Frontend (`client/`)

| Élément | Choix |
|---|---|
| Framework | React 18, Vite 6, React Router 6 |
| Style | Tailwind CSS 4 |
| Langues | react-i18next, français et anglais ; textes des gros modules dans des fichiers séparés (`projets.*`, `mentorat.*`, `vocal.*`, `onboarding.*`) |
| Hors-ligne | PWA (vite-plugin-pwa) ; cache réseau-d'abord des GET `/api`, vidé à la déconnexion pour ne jamais montrer les données d'un autre compte |
| Performance | Pages chargées à la demande (`React.lazy` + `Suspense`), découpage en chunks, barrière d'erreur |
| Temps réel | `socket.io-client`, authentifié par JWT |
| Organisation | `pages/` (écrans), `components/`, `services/` (appels API), `hooks/`, `context/` (auth), `lib/` (utilitaires), `i18n/` |

Parcours du nouvel utilisateur : inscription → page de bienvenue en 3 étapes → bandeau « complète ton profil » tant que le profil est incomplet.

## 3. Backend (`server/src/`)

| Dossier | Rôle |
|---|---|
| `routes/` | Découpage HTTP : `auth`, `users`, `echanges` (forum), `classement`, `projets`, `candidatures`, `taches`, `mentorat`, `upload`, `audio`, `admin`, `meta` |
| `validators/` | Schémas **zod** : toute entrée est validée avant d'atteindre la logique |
| `services/` | Règles métier pures et testables (réputation, barème, collaboration, mentorat, tâches, format d'image, audio) |
| `models/` | Mongoose : `Utilisateur`, `Echange`, `Projet`, `Depot` |
| `middleware/` | `auth` (JWT), `role`, `rateLimit`, `error` (réponses d'erreur uniformes) |
| `communication/` | Socket.IO (canaux, messages, typing), notifications, historique de chat |
| `config/` | Variables d'environnement validées au démarrage |
| `docs/` | Définitions OpenAPI ; Swagger UI sur `/api/docs` |

### Modèle de données

- **`utilisateurs`** : profil, stack, pays, objectifs (dont `offrir_mentorat`), réputation, rôle.
- **`echanges`** : collection unique polymorphe avec un champ `type` : `post`, `reponse`, `commentaire`, `vote`, `message`, `notification`, `candidature`, `mentorat`. Choix volontaire : un seul flux d'activité, des index ciblés (ex. une seule candidature ou demande de mentorat *en attente* par couple, garantie par index unique partiel).
- **`projets`** : vitrine, équipe, tâches (`a_faire` / `en_cours` / `termine`, 100 max).
- **`depots`** : fichiers téléversés (images, audio) et leurs transcriptions.

### Temps réel

Canaux `stack:<slug>`, `ville:<nom>`, `prive:<idA>_<idB>`. Connexion refusée sans JWT valide ; il faut `join_canal` avant d'envoyer ; limite de 20 messages / 10 s par connexion ; l'accès à un canal privé est réservé à ses deux participants. Événements : `join_canal`, `leave_canal`, `message`, `typing`, et côté serveur `notification`. Détail : `server/src/communication/SOCKET_EVENTS.md`. Avec Redis, plusieurs instances du serveur partagent les salles (adaptateur Socket.IO).

### Fonctions clés

- **Authentification** : e-mail + mot de passe (bcrypt), code OTP par e-mail, GitHub OAuth ; JWT.
- **Forum Q&A** : questions, réponses, commentaires, votes, réputation, classement, modération admin.
- **Projets et collaboration** : vitrine, candidatures (accepter/refuser), équipe, espace de projet avec tableau de tâches.
- **Mentorat** : un mentor accepte au plus 5 accompagnés ; au plus 3 demandes en attente par personne.
- **Messages vocaux** : enregistrement navigateur, upload, transcription Whisper optionnelle, lecteur intégré.
- **Notifications** : en base + poussées en temps réel.

## 4. Sécurité

| Risque | Parade |
|---|---|
| Mots de passe | bcrypt, jamais renvoyés par l'API |
| Accès | JWT, contrôle de rôle, vérification de propriété (seuls le porteur et les membres modifient un projet) |
| Injection / entrées invalides | validation zod partout, Mongoose, JSON limité à 1 Mo |
| Abus | limiteurs : auth 20/15 min, OTP 5/15 min, API 300/min, écriture 60/10 min, upload 30/10 min ; spam de chat limité |
| En-têtes / origines | helmet, CORS limité aux origines configurées |
| Fichiers | vérification du **vrai format** par signature binaire (pas du seul type MIME), dimensions et taille plafonnées, métadonnées JPEG retirées, audio contrôlé par octets magiques |
| Secrets | uniquement dans `.env` (jamais dans Git) ; `.env.example` documenté |
| Données de démonstration | le script de seed refuse une base non locale sans `--force` |

## 5. Qualité et tests

- Tests de logique du serveur (`npm test`, 95 tests : forum, collaboration, mentorat, tâches, seed, audio, upload) ; scripts de test de bout en bout PowerShell (`scripts/smoke-*.ps1`).
- Intégration continue GitHub Actions : installation, tests, build du client à chaque PR.
- API documentée (Swagger).
- Branches `feature` → PR → `develop` ; revue avant fusion.

## 6. Déploiement visé

Datacloud « Serveur cloud » (Dakar) : Node + build du client servi en HTTPS (indispensable pour le micro et la PWA), MongoDB Atlas, variables d'environnement sur le serveur, rappel de callback GitHub OAuth, base de démonstration séparée alimentée par `npm run seed -- --force`.
