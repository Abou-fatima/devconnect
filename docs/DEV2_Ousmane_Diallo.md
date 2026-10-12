# Guide Dev 2 — Ousmane Diallo
**Rôle : Backend forum / Q&A, votes, réputation, modération**
Prérequis communs : voir le [README](../README.md) (étapes 1 à 5).

## A. Récupérer le projet

```bash
git clone <URL_DU_DEPOT>
cd devconnect
git checkout develop && git pull origin develop
cd server
cp .env.example .env
npm install
npm run dev
```
(MongoDB doit tourner : `mongod` ou `docker start mongo`.)

Attendre que Dev 1 livre `/api/auth` pour protéger les routes. En attendant, mocker `req.user`.

## B. Posts, réponses, commentaires (F-11, F-13, F-14)

```bash
git checkout -b feature/dev2-posts
mkdir -p src/routes src/controllers
```
Créer `src/routes/echanges.js` (collection `echanges`, champ `type`) :
- `POST /api/echanges/posts` (titre, contenu, `metadata.tags`)
- `GET /api/echanges/posts?tag=react&page=1` + `GET /api/echanges/posts/:id` (incrémente `nb_vues`)
- `POST /api/echanges/posts/:id/reponses`
- `POST /api/echanges/:id/commentaires`
- `PUT` / `DELETE` réservés à l'auteur

Brancher : `app.use('/api/echanges', require('./routes/echanges'));`

```bash
git add . && git commit -m "feat: posts, réponses, commentaires"
git fetch origin && git rebase origin/develop
git push -u origin feature/dev2-posts
```
→ Pull Request vers `develop`.

## C. Votes et réponse acceptée (F-15, F-16)

```bash
git checkout develop && git pull origin develop
git checkout -b feature/dev2-votes
```
- `POST /api/echanges/:id/vote` body `{ "valeur": 1 }` ou `-1`.
- L'index unique partiel du modèle `Echange` empêche le double vote : gérer l'erreur Mongo `11000` (renvoyer 409 ou inverser le vote).
- Mettre à jour `nb_votes` avec `$inc`.
- `POST /api/echanges/reponses/:id/accepter` : seul l'auteur du post peut accepter.

Test :
```bash
curl -X POST http://localhost:4000/api/echanges/<ID>/vote \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"valeur":1}'
```

```bash
git add . && git commit -m "feat: votes et réponse acceptée"
git push -u origin feature/dev2-votes
```

## D. Tags, signalement, suivi (F-17, F-21, F-22)

```bash
git checkout develop && git pull origin develop
git checkout -b feature/dev2-tags-signalement
```
- `GET /api/echanges/tags` (agrégation des tags les plus utilisés)
- `POST /api/echanges/:id/signaler`
- `POST /api/echanges/posts/:id/suivre`

## E. Réputation, badges, classement (F-08, F-09, F-43)

```bash
git checkout develop && git pull origin develop
git checkout -b feature/dev2-reputation
```
- Barème : +10 vote positif reçu sur réponse, +15 réponse acceptée, −2 vote négatif.
- `src/services/reputation.js` : met à jour `Utilisateur.reputation` et attribue les badges.
- `GET /api/classement?pays=GN` utilise l'index `{ pays: 1, reputation: -1 }`.

## F. Modération et admin

```bash
git checkout develop && git pull origin develop
git checkout -b feature/dev2-moderation
```
- `GET /api/admin/signalements`, `DELETE /api/admin/echanges/:id`, `PUT /api/admin/users/:id/role` (utiliser `requireRole` de Dev 1).

## G. Vérifier la performance (objectif cahier des charges)

```bash
# Dans mongosh
mongosh devconnect
db.echanges.find({ "metadata.tags": "react" }).explain("executionStats")
```
Vérifier `IXSCAN` (et non `COLLSCAN`).

## H. Fin
Avant chaque merge : `git fetch origin && git rebase origin/develop`, tester, puis PR. Documenter tes routes dans `server/openapi.yaml` (Dev 1).
