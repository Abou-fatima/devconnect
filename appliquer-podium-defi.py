# Ajoute la notification « podium du défi » aux fichiers partagés (notifier, push, notifications, fr.json, en.json).
# À lancer UNE FOIS depuis la racine du projet (le dossier qui contient client et server) : python appliquer-podium-defi.py
import sys
def sub(chemin, ancre, nouveau, deja):
    try:
        s = open(chemin, encoding='utf8', newline='').read()
    except FileNotFoundError:
        print('ABSENT  ', chemin); sys.exit(1)
    if deja in s:
        print('déjà fait', chemin); return
    eol = '\r\n' if '\r\n' in s else '\n'
    if s.count(ancre.replace('\n', eol)) != 1:
        print('ANCRE INTROUVABLE (ou en double) dans', chemin, ':', ancre); sys.exit(1)
    eol = '\r\n' if '\r\n' in s else '\n'  # garde les fins de ligne du fichier
    ancre = ancre.replace('\n', eol)
    nouveau = nouveau.replace('\n', eol)
    open(chemin, 'w', encoding='utf8', newline='').write(s.replace(ancre, nouveau))
    print('ok       ', chemin)

sub('server/src/communication/notifications/notifier.js', "'reponse_chat']", "'reponse_chat', 'defi_podium']", "'defi_podium'")
sub('server/src/services/push.js', "reponse_chat: 'a répondu à votre message'", "reponse_chat: 'a répondu à votre message',\n  defi_podium: 'vous félicite : vous êtes sur le podium du défi'", 'defi_podium')
sub('client/src/lib/notifications.js', "  reponse_chat: 'messages'\n", "  reponse_chat: 'messages',\n  defi_podium: 'trophee'\n", 'defi_podium')
sub('client/src/lib/notifications.js', "  if (n.kind === 'reaction') options.emoji", "  if (n.kind === 'defi_podium') { options.rang = n.sujet?.rang; options.titre = n.sujet?.titre; }\n  if (n.kind === 'reaction') options.emoji", "options.rang")
sub('client/src/lib/notifications.js', "  if (s?.type === 'projet' && s.id)", "  if (s?.type === 'defi' && s.id) return `/defi/${s.id}`;\n  if (s?.type === 'projet' && s.id)", "type === 'defi'")
sub('client/src/i18n/fr.json', '"reponse_chat": "{{pseudo}} a répondu à votre message"', '"reponse_chat": "{{pseudo}} a répondu à votre message",\n      "defi_podium": "{{pseudo}} vous félicite : place n°{{rang}} au défi « {{titre}} »"', 'defi_podium')
sub('client/src/i18n/en.json', '"reponse_chat": "{{pseudo}} replied to your message"', '"reponse_chat": "{{pseudo}} replied to your message",\n      "defi_podium": "{{pseudo}} congratulates you: #{{rang}} in the challenge “{{titre}}”"', 'defi_podium')
