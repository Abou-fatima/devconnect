# Événements Socket.IO — DevConnect (module communication)

Connexion : `io(API_URL, { auth: { token: <JWT> } })`. Sans token valide, la connexion est refusée (`connect_error`).
Tous les événements client → serveur acceptent un callback d'acquittement `ack({ ok, ... })`.

## Canaux (F-18)
| Canal | Exemple | Accès |
|---|---|---|
| `stack:<slug>` | `stack:react` | tout utilisateur connecté |
| `ville:<nom>` | `ville:conakry` | tout utilisateur connecté |
| `prive:<idA>_<idB>` | `prive:64f…_64a…` | uniquement A ou B (l'ordre des ids n'importe pas) |

## Client → serveur
| Événement | Payload | Réponse (ack) |
|---|---|---|
| `join_canal` | `{ canal }` | `{ ok: true, canal }` ou `{ ok: false, erreur }` |
| `leave_canal` | `{ canal }` | idem |
| `message` | `{ canal, contenu?, audio_url?, image_url? }` (contenu ≤ 2000 car. ; `audio_url` = `/uploads/...` ; `image_url` = retour de `POST /api/upload/chat`, image de la personne qui écrit) | `{ ok: true, message }` ou `{ ok: false, erreur }` |
| `typing` | `{ canal, actif? }` | — |

Il faut avoir fait `join_canal` avant d'envoyer `message` ou `typing`. Limite : 20 messages / 10 s par connexion.

## Serveur → client
| Événement | Payload |
|---|---|
| `message` | `{ id, canal, auteur: { id, pseudo }, contenu, audio_url, image_url, transcription, created_at }` (envoyé à tout le canal, expéditeur compris) |
| `typing` | `{ canal, user_id, pseudo, actif }` (aux autres membres) |
| `notification` | `{ id, kind, message, lue, sujet, acteur: { id, pseudo }, created_at }` (envoyé uniquement au destinataire, qui le reçoit dès qu'il est connecté) |

## Historique (REST)
`GET /api/chat/historique/:canal?page=1&limit=30` (Bearer JWT) → `{ canal, page, limit, a_suivre, messages[] }`.
Page 1 = les messages les plus récents ; `a_suivre: true` s'il existe une page plus ancienne.

## Stockage
Chaque message est un document `echanges` : `type: "message"`, `auteur_id`, `contenu`, `audio_url`, `image_url`, `metadata.canal`.
`cible_type` = `canal` (stack/ville) ou `user` + `cible_id` = destinataire (privé).

## Notifications (F-20)
Chaque notification est aussi enregistrée : `GET /api/notifications?page=1&limit=20&non_lues=true` (Bearer JWT) renvoie
`{ page, limit, a_suivre, non_lues, notifications[] }`, plus récentes d'abord ; `non_lues` est le nombre total de non lues
(pastille de la cloche). `PUT /api/notifications/:id/lue` marque la sienne comme lue.
`kind` : `reponse`, `reponse_acceptee`, `mention`, `vote`, `candidature`, `candidature_acceptee`, `candidature_refusee`, `mentorat`.
Une mention `@pseudo` dans un message du chat notifie le développeur mentionné (kind `mention`).

## `prive_message` (serveur → client)
Envoyé à la salle personnelle `user:<id>` du destinataire quand il reçoit un message privé (qu'il ait ou non la conversation ouverte).
`{ canal, message_id, auteur: { id, pseudo }, apercu: { type: 'texte'|'audio'|'image', texte }, created_at, ouverte }`
Si le destinataire n'a pas la conversation ouverte, une notification `message_prive` est aussi créée (une seule par conversation tant qu'elle n'est pas lue).

## Réactions emoji (`reaction`)
- Client → serveur : `reaction` `{ message_id, emoji }` ; `emoji` ∈ 👍 ❤️ 😂 😮 😢 🙏. Ack : `{ ok: true, action: 'ajoutee'|'changee'|'retiree', reactions }` ou `{ ok: false, erreur }`.
- Une seule réaction par personne et par message : le même emoji la retire, un autre la remplace. Accès contrôlé comme la lecture du canal (conversation privée, salon).
- Serveur → client : `reaction` `{ message_id, canal, reactions: [{ emoji, users: [id…] }] }` envoyé à tout le canal.
- L'historique (`GET /api/chat/...`) renvoie `reactions` sur chaque message.
- Notification `reaction` (« X a réagi 👍 à ton message ») à l'auteur : pas pour soi-même, pas pour un retrait, pas s'il a le canal ouvert, une seule non lue par message.

## REST
- `GET /api/chat/conversations` : mes conversations privées + `non_lus` + `total_non_lus`.
- `POST /api/chat/lu { canal }` : marque la conversation lue (compteur à 0, notifications lues).

## Notifications push (REST)
- `GET /api/push/cle` : `{ actif, cle }` (clé publique VAPID).
- `POST /api/push/abonnement` : enregistre l'appareil `{ endpoint, keys: { p256dh, auth } }` (connecté).
- `DELETE /api/push/abonnement` : `{ endpoint }` retire l'appareil.
Le push est envoyé par `notifier.envoyer` uniquement si la personne n'a aucune connexion Socket.IO ouverte.
