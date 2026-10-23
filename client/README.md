# Client DevConnect (React + Tailwind + PWA)

Partie Frontend A, reprise par Dev 1 (Alpha Ousmane Bah) en l'absence de Dev 4.

## Lancer (PowerShell, depuis la racine du projet)

```powershell
git checkout develop
git pull origin develop
cd client
npm install
Copy-Item .env.example .env
npm run dev
```
Ouvrir http://localhost:5173. L'API doit tourner sur http://localhost:4000 (`cd server` puis `npm run dev`). Le proxy Vite redirige `/api` et `/socket.io` vers le serveur.

## Ce qui est fait
- Layout mobile-first (barre du haut + navigation basse sur mobile), FR/EN (`src/i18n`), bandeau hors-ligne
- Connexion, inscription, connexion GitHub (`/auth/callback`), routes protégées
- Profil public (`/developpeurs/:id`), mon profil (`/profil`), édition (`/profil/modifier`)
- Recherche de développeurs (`/developpeurs`) : pseudo, stack, pays, niveau, tri, pagination
- PWA : manifest + service worker (cache réseau-d'abord des GET `/api`, hors `/api/auth`)

## À faire (après l'API de Dev 2 / Dev 3)
- `Forum`, `Question/:id`, `PoserQuestion` (texte + vocal `MediaRecorder`), `Classement`
- Branchement chat et notifications (`socket.io-client`) avec Dev 3 / Dev 5
- Icônes PNG 192/512 pour une installation PWA optimale, audit Lighthouse

## Pour les autres développeurs
- Appels API : `src/services/api.js` (token ajouté automatiquement, `messageErreur(err)` pour afficher les erreurs)
- Utilisateur connecté : `const { user } = useAuth()` (`src/context/AuthContext.jsx`)
- Textes : toujours via `t('cle')`, ajouter la clé dans `fr.json` ET `en.json`
- Nouvelle page : créer `src/pages/X.jsx`, ajouter la `<Route>` dans `src/App.jsx`
