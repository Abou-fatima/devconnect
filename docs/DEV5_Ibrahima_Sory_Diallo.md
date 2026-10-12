# Guide Dev 5 — Ibrahima Sory Diallo
**Rôle : Projets, collaboration, mentorat, interface chat/notifications, données de démo**
Prérequis communs : voir le [README](../README.md) (étapes 1 à 5).

## A. Récupérer le projet

```bash
git clone <URL_DU_DEPOT>
cd devconnect
git checkout develop && git pull origin develop
cd server && cp .env.example .env && npm install && npm run dev
```
Le frontend (créé par Dev 4) arrive via `develop` :
```bash
cd ../client && npm install && npm run dev
```

## B. API Showcase projets (F-23 à F-30)

```bash
git checkout -b feature/dev5-projets-api
mkdir -p server/src/routes
```
Créer `server/src/routes/projets.js` :
- `POST /api/projets`, `GET /api/projets?stack=react&statut=en_cours&page=1`, `GET /api/projets/:id`
- `PUT /api/projets/:id`, `DELETE /api/projets/:id` (porteur uniquement)
- `POST /api/projets/:id/like`
- Images : utiliser l'upload de Dev 3 (`POST /api/upload`) puis stocker l'URL.

Brancher : `app.use('/api/projets', require('./routes/projets'));`

```bash
git add . && git commit -m "feat: API projets"
git fetch origin && git rebase origin/develop
git push -u origin feature/dev5-projets-api
```
→ Pull Request vers `develop`.

## C. Collaboration (F-31 à F-35)

```bash
git checkout develop && git pull origin develop
git checkout -b feature/dev5-collaboration
```
- `POST /api/projets/:id/candidatures` (rôle visé + message) : stockée dans `echanges` avec `type: "candidature"`.
- `GET /api/projets/:id/candidatures` (porteur uniquement)
- `PUT /api/candidatures/:id` body `{ "decision": "accepte" | "refuse" }` : si accepté, ajouter dans `Projet.membres`.
- Appeler le service de notification de Dev 3 à chaque événement.

## D. Mentorat et espace projet (F-36, F-38)

```bash
git checkout develop && git pull origin develop
git checkout -b feature/dev5-mentorat
```
- `POST /api/mentorat/demandes`, `PUT /api/mentorat/demandes/:id`
- `PUT /api/projets/:id/taches` (liste de tâches avec responsable et statut)

## E. Interface web : projets

```bash
git checkout develop && git pull origin develop
git checkout -b feature/dev5-projets-ui
cd client
```
Coordonner avec Dev 4 pour réutiliser `Layout`, `api.js` et `AuthContext`. Pages :
- `pages/Projets` (galerie + filtres), `pages/Projet/:id`, `pages/NouveauProjet`
- `pages/Candidatures` (gestion par le porteur), `pages/Mentorat`

```bash
cd .. && git add . && git commit -m "feat: pages projets et collaboration"
git fetch origin && git rebase origin/develop
git push -u origin feature/dev5-projets-ui
```

## F. Interface chat et notifications

```bash
git checkout develop && git pull origin develop
git checkout -b feature/dev5-chat-ui
```
Récupérer de Dev 3 la liste des événements Socket.IO (`docs/SOCKET_EVENTS.md`).
```js
import { io } from 'socket.io-client';
const socket = io('/', { auth: { token: localStorage.getItem('token') } });
socket.emit('join_canal', 'stack:react');
socket.on('message', (m) => { /* afficher */ });
socket.on('notification', (n) => { /* cloche + badge */ });
```
Pages : `pages/Chat` (liste de canaux + conversation), composant `NotificationBell`.

## G. Données de démonstration (obligatoire pour la démo)

```bash
git checkout develop && git pull origin develop
git checkout -b feature/dev5-seed
cd server && npm install @faker-js/faker
mkdir -p scripts
```
Créer `server/scripts/seed.js` : ≥ 200 utilisateurs, ≥ 50 posts avec réponses, ≥ 30 projets, plusieurs pays africains. Ajouter dans `package.json` : `"seed": "node scripts/seed.js"`.

```bash
npm run seed
mongosh devconnect --eval "db.utilisateurs.countDocuments()"
```
Si la collection porte un autre nom, vérifier avec `show collections`.

```bash
cd .. && git add . && git commit -m "feat: script de peuplement"
git push -u origin feature/dev5-seed
```

## H. Fin
Aider à la vidéo de démo (90 s) et au pitch. Tester le parcours J12 de bout en bout : inscription → question → projet → réponse → chat.
