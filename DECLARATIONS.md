# Déclarations – DevConnect (équipe NexaDev, CADEV 2026)

- **Produit en ligne** : https://devconnect.sn
- **Dépôt public** : https://github.com/Abou-fatima/devconnect
- **Vidéo de démonstration** : https://youtu.be/-RFF_uuwJ9U
- **Équipe NexaDev** : Alpha Ousmane Bah, Ousmane Diallo, Mamadou Charif Balde, Mamadou Dian Barry, Ibrahima Sory Diallo

## 1. Hébergement

| Élément | Service |
|---|---|
| Nom de domaine `devconnect.sn` | Systalink |
| Site (client React) | Vercel, branche `develop` |
| API Node.js / Express / Socket.IO | Render |
| Base de données | MongoDB Atlas |

Le déploiement sur l'infrastructure Systalink a été tenté (image Docker) mais a échoué ; l'équipe Systalink nous a conseillé de déployer l'API sur Render et le site sur Vercel, derrière le domaine acheté chez Systalink.

## 2. Composants tiers et licences

Aucune dépendance sous licence GPL, AGPL ou LGPL. Les licences sont celles publiées par chaque paquet (vérifiables avec `npx license-checker --summary` dans `server/` et `client/`).

### Serveur (`server/`)
| Composant | Usage | Licence |
|---|---|---|
| express, cors, helmet, express-rate-limit | API, sécurité, limitation de débit | MIT |
| mongoose | accès MongoDB | MIT |
| socket.io, @socket.io/redis-adapter | temps réel | MIT |
| ioredis | connexion Redis (optionnelle) | MIT |
| jsonwebtoken, bcryptjs | authentification, mots de passe | MIT |
| zod | validation des données | MIT |
| multer | réception de fichiers | MIT |
| cloudinary | stockage d'images (optionnel) | MIT |
| nodemailer | envoi de codes par e-mail | MIT-0 |
| web-push | notifications push | MPL-2.0 (licence à copyleft faible, par fichier, non modifiée par nous) |
| dotenv | variables d'environnement | BSD-2-Clause |
| swagger-ui-express | documentation OpenAPI | MIT |

### Client (`client/`)
| Composant | Usage | Licence |
|---|---|---|
| react, react-dom, react-router-dom | interface | MIT |
| i18next, react-i18next | français / anglais | MIT |
| axios, socket.io-client | échanges avec l'API | MIT |
| tailwindcss, @tailwindcss/vite | styles | MIT |
| vite, @vitejs/plugin-react, vite-plugin-pwa | construction, application installable (PWA) | MIT |
| Font Awesome Free (icônes) | icônes | Icônes CC BY 4.0, polices SIL OFL 1.1, code MIT |

### Données et ressources
- **Carte de l'Afrique** : contours dérivés de Natural Earth (domaine public) et du jeu `geo-countries` (ODC-PDDL).
- **Illustrations** de l'application : illustrations de la banque libre **unDraw** (undraw.co), utilisables gratuitement, y compris dans un projet commercial, sans attribution obligatoire (licence unDraw).
- **Polices** : DM Sans et JetBrains Mono (SIL OFL 1.1), uniquement dans la présentation.

## 3. Services externes (tous optionnels sauf MongoDB)

- **MongoDB Atlas** : base de données (obligatoire).
- **GitHub OAuth** : connexion avec un compte GitHub.
- **Cloudinary** : stockage d'images, désactivé par défaut (stockage sur le serveur).
- **Whisper (API compatible OpenAI)** : transcription des notes vocales, **non activée** dans la version déposée.
- **Reconnaissance vocale du navigateur (Web Speech API)** : transcription locale des notes vocales quand le navigateur la propose.
- **Web Push (clés VAPID)** : notifications sur téléphone.
- **Redis** : adaptateur Socket.IO pour plusieurs serveurs, optionnel (absent en production).

## 4. Utilisation de l'intelligence artificielle

- Nous avons utilisé **Claude (Anthropic)** comme assistant de développement : relecture, écriture et correction de code, scripts de correctifs, rédaction de la documentation et des supports de présentation (diaporama, texte oral), et aide au déploiement.
- Toutes les modifications ont été relues, lancées et testées par l'équipe avant d'être publiées sur le dépôt.
- L'application elle-même n'utilise **aucun modèle d'IA** pour produire ses contenus, sauf la transcription vocale optionnelle (Whisper) décrite plus haut, non activée.
- Aucun autre outil d'IA n'a été utilisé : seulement Claude.

## 5. Fonctionnalités notables

Forum de questions et réponses, messagerie en temps réel (salons par lien, images, notes vocales), projets et équipes, mentorat, défi de code de la semaine exécuté dans le navigateur, **duel de code en direct**, classement par pays et pour l'Afrique, carte de l'Afrique, notifications push, espace d'administration (statistiques, signalements, gestion des comptes, du forum et des projets), application installable (PWA), français et anglais.

## 6. Limites connues

- Hébergement gratuit : le serveur peut mettre jusqu'à une minute à répondre après une période d'inactivité.
- Les fichiers envoyés (images, notes vocales) sont gardés sur le disque du serveur et peuvent disparaître au redémarrage, faute de service de stockage externe.
- Les duels en cours sont tenus en mémoire (une sauvegarde de 24 h dans la base permet de les retrouver).