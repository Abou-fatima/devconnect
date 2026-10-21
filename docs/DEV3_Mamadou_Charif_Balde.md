# Guide Dev 3 — Mamadou Charif Balde
**Rôle : Temps réel (Socket.IO + Redis), notifications, vocal, upload de fichiers**
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
```
Renseigne `JWT_SECRET` dans `.env` (README section 4) et vérifie `REDIS_URL=redis://localhost:6379`. L'authentification de Dev 1 est disponible : lis [INTEGRATION_DEV1.md](INTEGRATION_DEV1.md), en particulier la section « Authentification d'un socket ».
Lancer les services :
```powershell
docker start mongo redis      # ou mongod / redis-server
redis-cli ping                # doit répondre PONG
npm run dev
```

## B. Chat Socket.IO + Redis (F-18)

```powershell
git checkout -b feature/dev3-chat
npm install @socket.io/redis-adapter
mkdir src\sockets
```
Créer :
1. `src/config/redis.js` (modèle : `src/config/otpStore.js`, qui utilise déjà ioredis) : clients `pub` et `sub` (ioredis, `REDIS_URL`).
2. `src/sockets/index.js` : authentification du socket par JWT (`socket.handshake.auth.token`), adapter Redis, événements `join_canal`, `message`, `typing`, `disconnect`.
3. Canaux : `stack:react`, `ville:conakry`, et privés `prive:<idA>_<idB>`.
4. Messages enregistrés dans `echanges` avec `type: "message"`.
5. `src/routes/chat.js` : `GET /api/chat/historique/:canal?page=1`.
6. Dans `index.js`, remplacer le TODO par `require('./sockets')(io);`

Test rapide (deux terminaux) :
```powershell
npx wscat -c "ws://localhost:4000/socket.io/?EIO=4&transport=websocket"
```

```powershell
git add .
git commit -m "feat: chat temps réel Socket.IO + Redis"
git fetch origin
git rebase origin/develop
git push -u origin feature/dev3-chat
```
→ Pull Request vers `develop`. **Donner à Dev 5 la liste des événements Socket.IO** (nom + payload).

## C. Notifications (F-20)

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/dev3-notifications
```
- `src/services/notifier.js` : crée un `echanges` de `type: "notification"` et émet `io.to("user:<id>").emit("notification", ...)`.
- `GET /api/notifications`, `PUT /api/notifications/:id/lue`.
- Dev 2 et Dev 5 appellent `notifier.envoyer(...)` (réponse reçue, candidature, etc.).

## D. Upload et compression des fichiers (F-24, F-39)

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/dev3-upload
cd server
npm install multer sharp
mkdir uploads
```
Ajoute la ligne `uploads/` dans le fichier `.gitignore` à la racine du projet (avec ton éditeur).

- `POST /api/upload` : multer (limite 5 Mo images, 10 Mo audio), conversion en WebP avec `sharp`, enregistrement dans `depots`.
- `app.use('/uploads', express.static('uploads'));`

```powershell
git add .
git commit -m "feat: upload fichiers + compression WebP"
git push -u origin feature/dev3-upload
```

## E. Notes vocales et transcription Whisper (F-12, F-19, F-40)

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/dev3-vocal
winget install Gyan.FFmpeg      # Mac : brew install ffmpeg   |   Linux : sudo apt-get install -y ffmpeg
pip install faster-whisper      # ou installation de whisper.cpp
```
- `POST /api/audio` : reçoit un fichier audio (webm/ogg), le convertit :
  ```powershell
  ffmpeg -i entree.webm -ac 1 -ar 16000 sortie.wav
  ```
- Lancer la transcription en tâche asynchrone, puis enregistrer le texte dans `echanges.transcription`.
- Prévoir un mode dégradé : si Whisper échoue, garder l'audio sans texte.

## F. Test de charge et réseau faible

```powershell
npm install -g artillery
artillery quick --count 50 --num 20 http://localhost:4000/api/health
```
Dans Chrome DevTools → Network → throttling « Slow 3G » pour tester le chat.

## G. Fin
Documenter les événements Socket.IO dans `docs/SOCKET_EVENTS.md` et les routes dans `server/src/docs/openapi.js`.
