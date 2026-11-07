// Réactions emoji sur les messages du chat (fonctions pures, sans base de données).
// Stockage : Echange.reactions = [{ user_id, emoji }] — au plus une réaction par personne et par message.
const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const emojiValide = (e) => typeof e === 'string' && EMOJIS.includes(e);

/* Applique le choix de `userId` :
   - même emoji que sa réaction actuelle  → retirée
   - autre emoji                          → remplace la précédente (changée)
   - pas encore de réaction               → ajoutée
   Renvoie { reactions, action } sans modifier le tableau reçu. */
function appliquer(reactions, userId, emoji) {
  const id = String(userId);
  const liste = Array.isArray(reactions) ? reactions : [];
  const actuelle = liste.find((r) => String(r.user_id) === id);
  const autres = liste.filter((r) => String(r.user_id) !== id);
  if (actuelle && actuelle.emoji === emoji) return { reactions: autres, action: 'retiree' };
  return {
    reactions: [...autres, { user_id: id, emoji }],
    action: actuelle ? 'changee' : 'ajoutee'
  };
}

// Regroupe par emoji (ordre des 6 emojis, jamais de groupe vide) : [{ emoji, users: [ids] }].
function grouper(reactions) {
  const liste = Array.isArray(reactions) ? reactions : [];
  return EMOJIS
    .map((emoji) => ({ emoji, users: liste.filter((r) => r.emoji === emoji).map((r) => String(r.user_id)) }))
    .filter((g) => g.users.length > 0);
}

module.exports = { EMOJIS, emojiValide, appliquer, grouper };
