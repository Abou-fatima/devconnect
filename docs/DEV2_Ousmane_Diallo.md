# Guide Dev 2 — Ousmane Diallo
**Rôle : Backend forum / Q&A, votes, réputation, modération**
Prérequis communs : voir le [README](../README.md) (sections 1 à 6).

## A. Récupérer le projet

```powershell
git clone <URL_DU_DEPOT>
cd devconnect
git checkout develop
git pull origin develop
cd server
Copy-Item .env.example .env
npm install
npm run dev
```
(MongoDB doit tourner : `docker start mongo`. Renseigne `JWT_SECRET` dans `.env`, voir le README section 4.)

**L'authentification de Dev 1 est déjà disponible.** Lis [INTEGRATION_DEV1.md](INTEGRATION_DEV1.md) : il explique comment obtenir un token de test, protéger tes routes avec `auth`, valider avec zod et utiliser `publicUser` pour renvoyer les auteurs sans leurs données privées.

## B. Posts, réponses, commentaires (F-11, F-13, F-14)

```powershell
git checkout -b feature/dev2-posts
mkdir src\controllers
```
Le dossier `src/routes/` existe déjà. Créer `src/routes/echanges.js` (collection `echanges`, champ `type`) :
- `POST /api/echanges/posts` (titre, contenu, `metadata.tags`)
- `GET /api/echanges/posts?tag=react&page=1` + `GET /api/echanges/posts/:id` (incrémente `nb_vues`)
- `POST /api/echanges/posts/:id/reponses`
- `POST /api/echanges/:id/commentaires`
- `PUT` / `DELETE` réservés à l'auteur

Brancher : `app.use('/api/echanges', require('./routes/echanges'));`

```powershell
git add .
git commit -m "feat: posts, réponses, commentaires"
git fetch origin
git rebase origin/develop
git push -u origin feature/dev2-posts
```
→ Pull Request vers `develop`.

## C. Votes et réponse acceptée (F-15, F-16)

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/dev2-votes
```
- `POST /api/echanges/:id/vote` body `{ "valeur": 1 }` ou `-1`.
- L'index unique partiel du modèle `Echange` empêche le double vote : gérer l'erreur Mongo `11000` (renvoyer 409 ou inverser le vote).
- Mettre à jour `nb_votes` avec `$inc`.
- `POST /api/echanges/reponses/:id/accepter` : seul l'auteur du post peut accepter.

Test :
```powershell
curl -X POST http://localhost:4000/api/echanges/<ID>/vote \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"valeur":1}'
```

```powershell
git add .
git commit -m "feat: votes et réponse acceptée"
git push -u origin feature/dev2-votes
```

## D. Tags, signalement, suivi (F-17, F-21, F-22)

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/dev2-tags-signalement
```
- `GET /api/echanges/tags` (agrégation des tags les plus utilisés)
- `POST /api/echanges/:id/signaler`
- `POST /api/echanges/posts/:id/suivre`

## E. Réputation, badges, classement (F-08, F-09, F-43)

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/dev2-reputation
```
- Barème : +10 vote positif reçu sur réponse, +15 réponse acceptée, −2 vote négatif.
- `src/services/reputation.js` : met à jour `Utilisateur.reputation` et attribue les badges.
- `GET /api/classement?pays=GN` utilise l'index `{ pays: 1, reputation: -1 }`.

## F. Modération et admin

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/dev2-moderation
```
- `GET /api/admin/signalements`, `DELETE /api/admin/echanges/:id`, `PUT /api/admin/users/:id/role` (utiliser `requireRole` de `src/middleware/role.js`).

## G. Vérifier la performance (objectif cahier des charges)

```powershell
# Dans mongosh
mongosh devconnect
db.echanges.find({ "metadata.tags": "react" }).explain("executionStats")
```
Vérifier `IXSCAN` (et non `COLLSCAN`).

## H. Fin
Avant chaque merge : `git fetch origin` puis `git rebase origin/develop`, tester, puis PR. Documenter tes routes dans `server/src/docs/openapi.js` (voir INTEGRATION_DEV1.md, section 9).
