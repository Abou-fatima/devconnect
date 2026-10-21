# Guide Dev 4 — Mamadou Dian Barry
**Rôle : Frontend A (React + Tailwind + PWA, auth, profil, forum, classement)**
Prérequis communs : voir le [README](../README.md) (sections 1 à 6).

## A. Récupérer le projet

```powershell
git clone <URL_DU_DEPOT>
cd devconnect
git checkout develop
git pull origin develop
git checkout -b feature/dev4-setup
```

## B. Créer le client (toi seul, au début)

```powershell
Remove-Item -Recurse -Force client     # le dossier est vide dans le squelette (Mac/Linux : rm -rf client)
npm create vite@latest client -- --template react
cd client
npm install
npm install react-router-dom axios socket.io-client i18next react-i18next
npm install -D tailwindcss @tailwindcss/vite vite-plugin-pwa
```

Configurer `vite.config.js` :
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({ registerType: 'autoUpdate',
    manifest: { name: 'DevConnect', short_name: 'DevConnect', theme_color: '#1F3864', display: 'standalone' } })],
  server: { proxy: { '/api': 'http://localhost:4000', '/socket.io': { target: 'http://localhost:4000', ws: true } } }
});
```
Dans `src/index.css` : `@import "tailwindcss";`

```powershell
npm run dev       # http://localhost:5173
```

Structure à créer :
```powershell
mkdir src\pages, src\components, src\services, src\hooks, src\i18n, src\context
```

```powershell
cd ..
git add .
git commit -m "feat: setup React + Tailwind + PWA"
git push -u origin feature/dev4-setup
```
→ Pull Request vers `develop` **dès que possible** : Dev 5 en a besoin.

## C. Layout mobile-first, i18n (F-44, F-46)

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/dev4-layout
```
- `components/Navbar`, `components/BottomNav` (mobile), `components/Layout`.
- `src/i18n/fr.json`, `src/i18n/en.json`, `src/i18n/index.js` + sélecteur de langue.
- `src/services/api.js` : instance axios qui ajoute `Authorization: Bearer <token>` (token lu dans `localStorage`) et qui redirige vers la connexion sur une réponse `401`.
- Formulaires : charger les listes depuis `GET /api/meta/options` (niveaux, objectifs, stacks).
- `src/context/AuthContext.jsx`.
- Routes dans `App.jsx` avec `react-router-dom` (routes protégées).

## D. Pages auth et profil

```powershell
git checkout -b feature/dev4-auth-pages
```
- `pages/Inscription`, `pages/Connexion` (appellent `/api/auth/register`, `/api/auth/login`). Bouton « Continuer avec GitHub » : lien vers `http://localhost:4000/api/auth/github`.
- `pages/AuthCallback` : lit le token dans `#token=` après la connexion GitHub. **Le code complet est dans [INTEGRATION_DEV1.md](INTEGRATION_DEV1.md), section 7.**
- `pages/Profil` (`GET /api/users/:id`), édition du profil, `pages/Recherche` (filtres stack/pays/niveau).

L'API de Dev 1 est **déjà disponible** : lis [INTEGRATION_DEV1.md](INTEGRATION_DEV1.md) (liste des routes, format des réponses et des erreurs `{ erreur, details }`). Pour les routes des autres développeurs qui ne sont pas encore prêtes, utilise des données factices dans `src/services/mock.js`.

## E. Pages forum

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/dev4-forum
```
- `pages/Forum` (liste + filtre par tag + pagination)
- `pages/Question/:id` (réponses, commentaires, boutons de vote, réponse acceptée)
- `pages/PoserQuestion` : texte + bouton **enregistrement vocal** (`MediaRecorder`) → `POST /api/audio` (Dev 3)
- `pages/Classement` (par pays)

## F. PWA et hors-ligne (F-42, F-45)

```powershell
cd client
npm run build
npm run preview
```
Dans Chrome DevTools → Application : vérifier le manifest et le service worker, tester « Offline ». Mettre en cache la liste des questions déjà consultées.

Audit :
```powershell
npx lighthouse http://localhost:4173 --view
```
Cible : PWA installable, performance correcte en « Slow 3G ».

## G. Livraison de chaque fonctionnalité

```powershell
git add .
git commit -m "feat: <description>"
git fetch origin
git rebase origin/develop
git push -u origin feature/dev4-<sujet>
```
→ Pull Request vers `develop`.

## H. Fin
Tests sur mobile réel (`npm run dev -- --host`, puis ouvrir l'IP locale du PC depuis le téléphone), captures d'écran pour la vidéo et le pitch.
