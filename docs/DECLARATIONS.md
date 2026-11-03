# Déclarations obligatoires — CADEV 2026

> Version de travail à vérifier avant soumission. Les versions exactes sont dans `server/package-lock.json` et `client/package-lock.json`. Régénérer les licences avec `npx license-checker --production --summary` dans `server/` et `client/` avant de soumettre.

## 1. Composants et licences

Aucun composant sous licence GPL, AGPL ou LGPL n'est utilisé en production.

### Serveur (production)

| Composant | Rôle | Licence |
|---|---|---|
| express | serveur HTTP | MIT |
| mongoose | accès MongoDB | MIT |
| socket.io | temps réel | MIT |
| @socket.io/redis-adapter | multi-instances (optionnel) | MIT |
| ioredis | client Redis (optionnel) | MIT |
| jsonwebtoken | jetons JWT | MIT |
| bcryptjs | hachage de mots de passe | MIT |
| zod | validation | MIT |
| helmet | en-têtes de sécurité | MIT |
| cors | CORS | MIT |
| express-rate-limit | limitation de débit | MIT |
| multer | réception de fichiers | MIT |
| nodemailer | envoi d'e-mails | MIT-0 / MIT (à vérifier dans le lockfile) |
| dotenv | variables d'environnement | BSD-2-Clause |
| swagger-ui-express | documentation API | MIT |
| cloudinary | stockage images (optionnel) | MIT |

### Client (production)

| Composant | Licence |
|---|---|
| react, react-dom | MIT |
| react-router-dom | MIT |
| react-i18next, i18next | MIT |
| axios | MIT |
| socket.io-client | MIT |

### Outils de build (non livrés en production)

Vite (MIT), @vitejs/plugin-react (MIT), Tailwind CSS 4 et @tailwindcss/vite (MIT), vite-plugin-pwa (MIT). `lightningcss` (MPL-2.0, licence à copyleft faible limité aux fichiers) n'est utilisé que pendant la compilation et n'est pas redistribué avec l'application.

### Contrôle réalisé le 2 novembre 2026

Commande : `npx license-checker-rseidelsohn --production --summary` dans `server/` puis `client/`, avec `--failOn "GPL-2.0;GPL-3.0;AGPL-3.0;LGPL-2.1;LGPL-3.0"`.

| Dossier | Résultat |
|---|---|
| Serveur | Aucune licence interdite. MIT, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause, MIT-0. La mention « UNKNOWN » désigne notre propre paquet `devconnect-server` (sans champ licence), pas une dépendance. |
| Client | Aucune licence interdite. 47 paquets MIT. La mention « UNLICENSED » désigne notre propre paquet `devconnect-client`. |

Licences précisées par ce contrôle : `busboy` MIT, `streamsearch` MIT, `nodemailer` MIT-0, `dotenv` BSD-2-Clause, `qs` BSD-3-Clause, `bson`, `mongodb`, `kareem`, `denque`, `cluster-key-slot`, `swagger-ui-dist` et `@scarf/scarf` Apache-2.0. `xmlhttprequest-ssl` n'est pas livré en production (dépendance du client de test `socket.io-client`, en développement).

### Sécurité des dépendances (`npm audit --omit=dev`)

Les failles corrigeables sans changement majeur sont traitées par `npm audit fix` (`body-parser`, `multer`, `qs`, `follow-redirects`). Restent deux paquets dont la correction impose une nouvelle version majeure :

| Paquet | Faille | Décision |
|---|---|---|
| `zod` 3 (serveur) | Consommation mémoire sur de très grandes collections | Risque limité : corps JSON plafonné à 1 Mo et longueurs maximales dans les schémas. Passage à zod 4 reporté après le concours pour ne pas risquer une régression. |
| `react-router-dom` 6 (client) | Redirection ouverte avec une barre oblique inverse dans un lien, et un défaut qui ne concerne que le rendu côté serveur | Gravité modérée ; l'application n'utilise pas le rendu côté serveur. Mise à jour majeure reportée. |

`nodemailer` : mise à jour vers la version corrigée à tester avec les tests existants et l'envoi du code OTP.

### Services externes (optionnels, activés par variables d'environnement)

MongoDB Atlas (base), Redis, Cloudinary (images), API de transcription compatible OpenAI Whisper (par exemple Groq), GitHub OAuth. Ce sont des services, pas du code embarqué.

## 2. Déclaration d'usage de l'IA

**Outil utilisé :** assistant de programmation Claude (Anthropic, modèle Claude Sonnet 5.5, via Claude Code), utilisé par le lead de l'équipe.

| Partie | Usage de l'IA | Maîtrise par l'équipe |
|---|---|---|
| Backend (forum, projets, collaboration, mentorat, tâches, upload, audio) | Génération et refactorisation de code, écriture de tests | Revue et exécution des tests par l'équipe ; explications dans `GUIDE_DEFENSE.md` |
| Frontend (pages, composants, i18n, onboarding, PWA) | Génération de composants et traductions | Relecture et tests manuels sur navigateur et mobile |
| Scripts (seed, smoke tests, CI) | Génération | Exécutés et corrigés par l'équipe |
| Documentation | Rédaction assistée | Relue par l'équipe |
| Fonction d'IA dans le produit | Transcription vocale via une API Whisper (optionnelle) | Documentée dans le README et `.env.example` |

**Principes appliqués :**
- Le code produit avec l'IA a été relu, testé et intégré par les membres via des Pull Requests.
- L'IA n'a reçu aucun secret : les clés restent dans les fichiers `.env`, exclus de Git.
- Aucun contenu protégé n'a été volontairement copié ; les dépendances et leurs licences sont listées ci-dessus.
- Les membres sont en mesure d'expliquer chaque partie du code lors de la défense.

## 3. Titularité et période de création

Le projet a été créé pendant la période du concours dans le dépôt Git de l'équipe NexaDev ; l'historique des commits et des Pull Requests en atteste. Les membres : Alpha Ousmane Bah, Ousmane Diallo, Mamadou Charif Balde, Mamadou Dian Barry, Ibrahima Sory Diallo.

> À compléter avant soumission : nom exact du dépôt, adresse de la démo en ligne, produit Datacloud acheté (code CADEV26).
