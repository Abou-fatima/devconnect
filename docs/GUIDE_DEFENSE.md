# Guide de défense — DevConnect (CADEV 2026)

Objectif : que **chaque membre** puisse expliquer le projet. Le critère « maîtrise de l'équipe, y compris des parties assistées par IA » vaut dans les 30 % de qualité technique.

## 1. Le pitch en 30 secondes

« DevConnect est la plateforme d'échange des développeurs africains, par les devs, pour les devs. On y pose des questions, on montre ses projets, on trouve des coéquipiers, un mentor, et on discute en temps réel, même par message vocal, en français et en anglais, depuis un téléphone, même avec une connexion instable (PWA). »

## 2. Lien avec le thème et la grille

| Critère (poids) | Notre réponse |
|---|---|
| Utilité (25 %) | Forum Q&A + réputation, vitrine de projets, recrutement d'équipe, mentorat, chat : tout le parcours d'un dev |
| Technique (30 %) | Voir `ARCHITECTURE.md` : validation, sécurité, tests, CI, licences conformes |
| UX (20 %) | Bienvenue en 3 étapes, FR/EN, PWA mobile, animations, pages chargées à la demande |
| Innovation (15 %) | Mentorat intégré, vocal transcrit, espace de projet avec tâches, réputation |
| Vote public (10 %) | Démo claire, données de démonstration réalistes |

## 3. Qui explique quoi

| Sujet | Responsable principal | Suppléant |
|---|---|---|
| Authentification, sécurité, architecture globale | Alpha | Ibrahima |
| Forum, réputation, classement | Alpha | Ibrahima |
| Projets, candidatures, tâches, mentorat | Ibrahima | Alpha |
| Chat temps réel, notifications, vocal, upload | Charif | Alpha |
| Interface, i18n, PWA, onboarding | Alpha | Charif |
| Déploiement, CI | Charif | Alpha |

À ajuster selon qui a réellement fait quoi. **Règle : chacun doit pouvoir lire et expliquer le code de sa partie, y compris ce qu'une IA a aidé à écrire.**

## 4. Questions probables et réponses

**Pourquoi MongoDB ?** Données de type document (posts, réponses, projets avec équipe et tâches imbriquées), schéma qui évolue vite pendant un concours, Atlas disponible en ligne.

**Pourquoi une seule collection `echanges` ?** Posts, réponses, votes, messages et notifications sont des « événements » d'un même flux ; une collection avec un champ `type` et des index ciblés simplifie les requêtes transverses. Contrepartie : il faut filtrer par `type` et valider chaque type.

**Comment sécurisez-vous l'application ?** Voir le tableau de sécurité de `ARCHITECTURE.md` : bcrypt, JWT, zod, helmet, CORS, limiteurs de débit, contrôle de propriété, vérification des fichiers par signature binaire.

**Que se passe-t-il si un utilisateur envoie un faux fichier image ?** Le serveur lit les octets d'en-tête, détermine le vrai format et les dimensions, refuse si ça ne correspond pas ou si c'est trop grand, et retire les métadonnées JPEG.

**Pourquoi pas `sharp` pour les images ?** Sa dépendance libvips peut être sous licence LGPL, interdite par le règlement. On vérifie côté serveur et on réduit les images dans le navigateur.

**Comment gérez-vous le temps réel à grande échelle ?** Socket.IO avec l'adaptateur Redis (optionnel) pour partager les salles entre plusieurs instances.

**Que faire si Redis, Cloudinary ou Whisper sont absents ?** Le chat tourne en mémoire sur une instance, les fichiers restent sur disque, les vocaux sont lisibles mais sans transcription.

**Comment évitez-vous les abus ?** Limiteurs par route, limite de messages du chat, plafonds (5 accompagnés par mentor, 3 demandes en attente, 100 tâches par projet).

**Comment avez-vous testé ?** Tests de logique (95), scripts de bout en bout, CI sur chaque PR.

**Fonctionne-t-il sur mauvaise connexion ?** PWA, pages chargées à la demande, cache des lectures ; le cache est vidé à la déconnexion.

**Quelle est la part de l'IA ?** Voir `DECLARATIONS.md` : assistant de code Claude pour une grande partie du code, avec relecture, tests et appropriation par l'équipe.

**Comment gérez-vous la propriété du code ?** Projet créé pendant le concours, dépôt Git avec historique des commits et des PR, déclaration des composants et licences.

**Limites connues (à dire franchement) :** pas de modération automatique de contenu, transcription dépendante d'un service externe, tests d'interface automatisés limités, charge non testée à grande échelle.

**Et la suite ?** Recherche de questions similaires, assistant d'aide, notifications push, modération, application mobile.

## 5. Démo conseillée (4 à 5 minutes)

1. Inscription, bienvenue en 3 étapes (30 s).
2. Poser une question, répondre avec un 2ᵉ compte, voter, voir la réputation monter (60 s).
3. Publier un projet, candidater avec un 2ᵉ compte, accepter, ouvrir l'espace projet et déplacer une tâche (75 s).
4. Demander un mentorat, voir la notification arriver (30 s).
5. Chat de ville avec un message vocal et sa transcription (45 s).
6. Passer en anglais, montrer le mobile et le mode hors-ligne (30 s).

Préparer **deux comptes** déjà ouverts dans deux fenêtres, une base `devconnect_demo` remplie par le seed, une capture vidéo de secours si le réseau lâche.

## 6. Check-list avant la défense

- [ ] Chaque membre a lu `ARCHITECTURE.md` et sa section ci-dessus
- [ ] Chacun a fait tourner l'appli en local et lancé `npm test`
- [ ] Démo répétée au moins deux fois, chronométrée
- [ ] Application en ligne testée sur téléphone
- [ ] Déclarations (`DECLARATIONS.md`) relues et soumises
- [ ] **Chaque membre a voté** (15 nov 18:00 → 16 nov 23:59 : un membre qui ne vote pas exclut l'équipe)
