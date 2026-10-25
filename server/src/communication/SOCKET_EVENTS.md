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
| `message` | `{ canal, contenu?, audio_url? }` (contenu ≤ 2000 car. ; `audio_url` = `/uploads/...`) | `{ ok: true, message }` ou `{ ok: false, erreur }` |
| `typing` | `{ canal, actif? }` | — |

Il faut avoir fait `join_canal` avant d'envoyer `message` ou `typing`. Limite : 20 messages / 10 s par connexion.

## Serveur → client
| Événement | Payload |
|---|---|
| `message` | `{ id, canal, auteur: { id, pseudo }, contenu, audio_url, transcription, created_at }` (envoyé à tout le canal, expéditeur compris) |
| `typing` | `{ canal, user_id, pseudo, actif }` (aux autres membres) |
| `notification` | `{ id, kind, message, lue, sujet, acteur: { id, pseudo }, created_at }` (envoyé uniquement au destinataire, qui le reçoit dès qu'il est connecté) |

## Historique (REST)
`GET /api/chat/historique/:canal?page=1&limit=30` (Bearer JWT) → `{ canal, page, limit, a_suivre, messages[] }`.
Page 1 = les messages les plus récents ; `a_suivre: true` s'il existe une page plus ancienne.

## Stockage
Chaque message est un document `echanges` : `type: "message"`, `auteur_id`, `contenu`, `audio_url`, `metadata.canal`.
`cible_type` = `canal` (stack/ville) ou `user` + `cible_id` = destinataire (privé).

## Notifications (F-20)
Chaque notification est aussi enregistrée : `GET /api/notifications?page=1&limit=20&non_lues=true` (Bearer JWT) renvoie
`{ page, limit, a_suivre, non_lues, notifications[] }`, plus récentes d'abord ; `non_lues` est le nombre total de non lues
(pastille de la cloche). `PUT /api/notifications/:id/lue` marque la sienne comme lue.
`kind` : `reponse`, `reponse_acceptee`, `mention`, `vote`, `candidature`, `candidature_acceptee`, `candidature_refusee`, `mentorat`.
Une mention `@pseudo` dans un message du chat notifie le développeur mentionné (kind `mention`).
