# Envoyer une notification (F-20)

Pour prévenir un développeur (réponse reçue, vote, candidature…), appelle `notifier.envoyer` depuis ta route, **après** avoir enregistré l'action :

```js
const { notifier } = require('../communication');

await notifier.envoyer({
  destinataireId: post.auteur_id,      // qui reçoit
  acteurId: req.userId,                // qui a agi
  kind: 'reponse',                     // voir la liste ci-dessous
  message: `${req.user.pseudo} a répondu à ta question`,
  sujet: { type: 'post', id: String(post._id) }   // pour retrouver l'élément (facultatif)
});
```

- La notification est enregistrée (collection `echanges`, `type: "notification"`) et poussée en temps réel au destinataire s'il est connecté.
- Rien n'est envoyé si `destinataireId` et `acteurId` sont identiques (pas d'auto-notification).
- Un `kind` inconnu ou un identifiant invalide lève une erreur (erreur de programmation). Une panne de base ou de socket est journalisée sans faire échouer ta route.

| kind | Quand | Qui appelle |
|---|---|---|
| `reponse` | Nouvelle réponse à une question | forum (`/api/echanges`) |
| `reponse_acceptee` | Sa réponse est marquée « acceptée » | forum |
| `vote` | Vote sur son post ou sa réponse | forum |
| `mention` | `@pseudo` dans un message du chat | chat (automatique) |
| `candidature` | Candidature reçue sur son projet | projets (`/api/candidatures`) |
| `candidature_acceptee`, `candidature_refusee` | Décision du porteur du projet | projets |
| `mentorat` | Demande ou offre de mentorat | projets (`/api/mentorat`) |

Stockage : `auteur_id` = acteur, `cible_type: "user"` + `cible_id` = destinataire, `contenu` = message, `metadata` = `{ kind, lue, sujet }`.
