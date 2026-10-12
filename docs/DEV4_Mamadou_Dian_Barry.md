# Guide Dev 4 — Mamadou Dian Barry
**Rôle : Frontend A (React + Tailwind + PWA, auth, profil, forum, classement)**
Prérequis communs : voir le [README](../README.md) (étapes 1 à 5).

## A. Récupérer le projet

```bash
git clone <URL_DU_DEPOT>
cd devconnect
git checkout develop && git pull origin develop
git checkout -b feature/dev4-setup
```

## B. Créer le client (toi seul, au début)

```bash
rm -rf client            # le dossier est vide dans le squelette
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

```bash
npm run dev       # http://localhost:5173
```

Structure à créer :
```bash
mkdir -p src/{pages,components,services,hooks,i18n,context}
```

```bash
cd ..
git add . && git commit -m "feat: setup React + Tailwind + PWA"
git push -u origin feature/dev4-setup
```
→ Pull Request vers `develop` **dès que possible** : Dev 5 en a besoin.

## C. Layout mobile-first, i18n (F-44, F-46)

```bash
git checkout develop && git pull origin develop
git checkout -b feature/dev4-layout
```
- `components/Navbar`, `components/BottomNav` (mobile), `components/Layout`.
- `src/i18n/fr.json`, `src/i18n/en.json`, `src/i18n/index.js` + sélecteur de langue.
- `src/services/api.js` : instance axios avec token JWT en en-tête.
- `src/context/AuthContext.jsx`.
- Routes dans `App.jsx` avec `react-router-dom` (routes protégées).

## D. Pages auth et profil

```bash
git checkout -b feature/dev4-auth-pages
```
- `pages/Inscription`, `pages/Connexion` (appellent `/api/auth/register`, `/api/auth/login`).
- `pages/Profil` (`GET /api/users/:id`), édition du profil, `pages/Recherche` (filtres stack/pays/niveau).

Si l'API de Dev 1 n'est pas prête, utiliser des données factices dans `src/services/mock.js`.

## E. Pages forum

```bash
git checkout develop && git pull origin develop
git checkout -b feature/dev4-forum
```
- `pages/Forum` (liste + filtre par tag + pagination)
- `pages/Question/:id` (réponses, commentaires, boutons de vote, réponse acceptée)
- `pages/PoserQuestion` : texte + bouton **enregistrement vocal** (`MediaRecorder`) → `POST /api/audio` (Dev 3)
- `pages/Classement` (par pays)

## F. PWA et hors-ligne (F-42, F-45)

```bash
cd client && npm run build && npm run preview
```
Dans Chrome DevTools → Application : vérifier le manifest et le service worker, tester « Offline ». Mettre en cache la liste des questions déjà consultées.

Audit :
```bash
npx lighthouse http://localhost:4173 --view
```
Cible : PWA installable, performance correcte en « Slow 3G ».

## G. Livraison de chaque fonctionnalité

```bash
git add . && git commit -m "feat: <description>"
git fetch origin && git rebase origin/develop
git push -u origin feature/dev4-<sujet>
```
→ Pull Request vers `develop`.

## H. Fin
Tests sur mobile réel (`npm run dev -- --host`, puis ouvrir l'IP locale du PC depuis le téléphone), captures d'écran pour la vidéo et le pitch.
