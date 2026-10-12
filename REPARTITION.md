# DevConnect — Répartition des tâches (5 développeurs)

Jalon critique **J12** : inscription → question → projet → réponse → chat.

## Dev 1 — Alpha Ousmane Bah — Lead / Backend Core & Auth
- Setup repo GitHub (monorepo `/server` + `/client`), branches, conventions, CI
- Modèles Mongoose des 4 collections + tous les index (section 7.3)
- Auth : JWT, email/téléphone (OTP), GitHub OAuth (F-01, F-41)
- Profils (F-02 à F-07), recherche de développeurs
- Swagger / OpenAPI
- Déploiement DataCloud Systalink

## Dev 2 — Ousmane Diallo — Backend Échanges (Forum / Q&A)
- API posts, réponses, commentaires (F-11, F-13, F-14)
- Votes avec index unique partiel (F-15), réponse acceptée (F-16)
- Tags / catégories (F-17), signalement (F-21), suivi de post (F-22)
- Réputation, badges, classement par pays (F-08, F-09, F-43)
- Modération de base + endpoints admin

## Dev 3 — Mamadou Charif Balde — Temps réel & Vocal
- Socket.IO + Redis : chat privé et canaux par stack/ville (F-18)
- Notifications (F-20)
- Upload audio, notes vocales (F-12, F-19, F-40)
- Transcription Whisper
- Collection `depots` : upload fichiers, compression WebP (F-24, F-39)

## Dev 4 — Mamadou Dian Barry — Frontend A (Core UI)
- Setup React + Tailwind + PWA (manifest, service worker, cache offline F-42, F-45)
- Layout mobile-first, i18n FR/EN (F-44, F-46)
- Pages : inscription/connexion, profil, recherche de devs
- Pages : forum, détail d'une question, formulaire (texte + vocal), votes
- Page classement par pays

## Dev 5 — Ibrahima Sory Diallo — Frontend B + Projets & Collaboration
- API + UI Showcase projets (F-23 à F-30)
- Collaboration : rôles recherchés, candidatures, accepter/refuser, membres (F-31 à F-35)
- Mentorat (F-38), espace projet (F-36)
- UI chat et notifications (branchement sur le travail de Dev 3)
- Script de peuplement : ≥200 utilisateurs, ≥50 posts, ≥30 projets

## Planning
| Jours | Objectif |
|---|---|
| J1–J2 | Repo, rôles, contrats d'API |
| J3–J5 | Auth, profils, modèles + index |
| J6–J8 | Forum, Q&A, votes |
| J9–J11 | Projets, images, recherche |
| J12–J14 | Chat, vocal, notifications |
| J15–J17 | Collaboration, mentorat |
| J18–J19 | Classement, badges, admin |
| J20–J21 | Vidéo 90 s, pitch 10 slides |
| J22–J23 | Soumission, vote public |

## Tous ensemble
Vidéo démo, pitch jury, README, recrutement de 50 devs dès J3, tests 3G simulée.
