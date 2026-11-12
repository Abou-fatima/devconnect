# Test de bout en bout du forum (Dev 2) pour Windows PowerShell.
# Serveur lance (npm run dev) + MongoDB demarre.
# Usage :  powershell -ExecutionPolicy Bypass -File scripts/smoke-forum.ps1
param([string]$Base = "http://localhost:4000")

$n = Get-Random -Minimum 10000 -Maximum 99999
$script:fail = 0

function Call($method, $path, $body = $null, $token = $null) {
  # HttpWebRequest sans keep-alive : evite l'erreur "connexion fermee" de Invoke-WebRequest (PowerShell 5.1)
  $req = [System.Net.HttpWebRequest]::Create("$Base$path")
  $req.Method = $method
  $req.KeepAlive = $false
  $req.Timeout = 20000
  if ($token) { $req.Headers.Add("Authorization", "Bearer $token") }
  if ($body) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 6))
    $req.ContentType = "application/json; charset=utf-8"
    $req.ContentLength = $bytes.Length
    $stream = $req.GetRequestStream()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()
  }
  try { $resp = $req.GetResponse() }
  catch [System.Net.WebException] {
    $resp = $_.Exception.Response
    if ($resp -eq $null) { throw }
  }
  $status = [int]$resp.StatusCode
  $reader = New-Object System.IO.StreamReader($resp.GetResponseStream(), [System.Text.Encoding]::UTF8)
  $text = $reader.ReadToEnd()
  $reader.Close()
  $resp.Close()
  $json = $null
  try { $json = $text | ConvertFrom-Json } catch {}
  return @{ status = $status; json = $json }
}

function Check($label, $actual, $expected) {
  if ($actual -eq $expected) { Write-Host "[OK]   $label ($actual)" -ForegroundColor Green }
  else { Write-Host "[FAIL] $label : attendu $expected, obtenu $actual" -ForegroundColor Red; $script:fail++ }
}

Write-Host "== Deux comptes de test (A pose la question, B repond)"
$ra = Call POST "/api/auth/register" @{ pseudo = "forumA$n"; email = "forumA$n@test.com"; mot_de_passe = "Azerty123"; pays = "ZZ" }
$rb = Call POST "/api/auth/register" @{ pseudo = "forumB$n"; email = "forumB$n@test.com"; mot_de_passe = "Azerty123"; pays = "ZZ" }
Check "register A" $ra.status 201
Check "register B" $rb.status 201
$ta = $ra.json.token; $tb = $rb.json.token
$idA = $ra.json.utilisateur.id
$idB = $rb.json.utilisateur.id

Write-Host "== Poser une question"
Check "question sans token" (Call POST "/api/echanges/posts" @{ titre = "Un titre correct"; contenu = "Un contenu assez long" }).status 401
Check "titre trop court refuse" (Call POST "/api/echanges/posts" @{ titre = "abc"; contenu = "Un contenu assez long" } $ta).status 400
$r = Call POST "/api/echanges/posts" @{ titre = "Comment utiliser useEffect $n ?"; contenu = "Je ne comprends pas les dependances."; tags = @("React", "hooks$n", "react") } $ta
Check "creer question" $r.status 201
Check "tags dedupliques" $r.json.post.tags.Count 2
Check "statut ouvert" $r.json.post.statut "ouvert"
$postId = $r.json.post.id

Write-Host "== Liste et detail"
$r = Call GET "/api/echanges/posts?tag=hooks$n"
Check "liste par tag" $r.status 200
Check "liste : 1 resultat" $r.json.total 1
Check "liste : extrait present" ($r.json.data[0].PSObject.Properties.Name -contains "extrait") $true
Check "tri invalide refuse" (Call GET "/api/echanges/posts?tri=hasard").status 400
Check "sans reponse" (Call GET "/api/echanges/posts?tag=hooks$n&tri=sans_reponse").json.total 1
$r1 = Call GET "/api/echanges/posts/$postId"
$r2 = Call GET "/api/echanges/posts/$postId"
Check "detail" $r1.status 200
Check "vues incrementees" ($r2.json.post.nb_vues - $r1.json.post.nb_vues) 1
Check "id invalide" (Call GET "/api/echanges/posts/abc").status 400
Check "id inconnu" (Call GET "/api/echanges/posts/000000000000000000000000").status 404

Write-Host "== Reponse et commentaire"
$r = Call POST "/api/echanges/posts/$postId/reponses" @{ contenu = "Ajoute le tableau de dependances." } $tb
Check "repondre" $r.status 201
$rid = $r.json.reponse.id
Check "reponse sans token" (Call POST "/api/echanges/posts/$postId/reponses" @{ contenu = "Anonyme" }).status 401
Check "commenter la question" (Call POST "/api/echanges/$postId/commentaires" @{ contenu = "Merci de preciser" } $ta).status 201
Check "commenter la reponse" (Call POST "/api/echanges/$rid/commentaires" @{ contenu = "Bonne piste" } $ta).status 201
$r = Call GET "/api/echanges/posts/$postId"
Check "compteur de reponses" $r.json.post.nb_reponses 1
Check "reponse listee" $r.json.reponses.Count 1
Check "commentaire sur la reponse" $r.json.reponses[0].commentaires.Count 1

Write-Host "== Votes et reputation"
Check "vote sur son propre post refuse" (Call POST "/api/echanges/$postId/vote" @{ valeur = 1 } $ta).status 403
Check "valeur de vote invalide" (Call POST "/api/echanges/$postId/vote" @{ valeur = 5 } $tb).status 400
$r = Call POST "/api/echanges/$postId/vote" @{ valeur = 1 } $tb
Check "vote positif" $r.json.nb_votes 1
$r = Call POST "/api/echanges/$postId/vote" @{ valeur = 1 } $tb
Check "meme vote = retrait" $r.json.mon_vote 0
$r = Call POST "/api/echanges/$postId/vote" @{ valeur = 1 } $tb
Check "revote positif" $r.json.nb_votes 1
$r = Call POST "/api/echanges/$postId/vote" @{ valeur = -1 } $tb
Check "inversion du vote" $r.json.nb_votes -1
$r = Call POST "/api/echanges/$postId/vote" @{ valeur = 1 } $tb
$r = Call POST "/api/echanges/$rid/vote" @{ valeur = 1 } $ta
Check "vote sur la reponse" $r.json.nb_votes 1
Check "reputation de B : +10" (Call GET "/api/users/$idB").json.utilisateur.reputation 10

Write-Host "== Reponse acceptee"
Check "B ne peut pas accepter" (Call POST "/api/echanges/reponses/$rid/accepter" $null $tb).status 403
Check "A accepte" (Call POST "/api/echanges/reponses/$rid/accepter" $null $ta).status 200
$r = Call GET "/api/echanges/posts/$postId" $null $ta
Check "statut resolu" $r.json.post.statut "resolu"
Check "reponse marquee acceptee" $r.json.reponses[0].acceptee $true
Check "mon vote visible avec token" $r.json.reponses[0].mon_vote 1
Check "reputation de B : +15" (Call GET "/api/users/$idB").json.utilisateur.reputation 25
Check "filtre statut resolu" (Call GET "/api/echanges/posts?tag=hooks$n&statut=resolu").json.total 1

Write-Host ""
Write-Host "--- Notifications du forum (F-20) ---"
# A = auteur de la question, B = auteur de la reponse
$nA = @((Call GET "/api/notifications?limit=50" $null $ta).json.notifications)
$nB = @((Call GET "/api/notifications?limit=50" $null $tb).json.notifications)
Check "A prevenu : reponse recue" (@($nA | Where-Object { $_.kind -eq "reponse" }).Count) 1
Check "A prevenu : vote recu (une seule fois malgre les revotes)" (@($nA | Where-Object { $_.kind -eq "vote" }).Count) 1
Check "la notification pointe vers la question" ((@($nA | Where-Object { $_.kind -eq "reponse" })[0]).sujet.id) $postId
Check "la notification nomme l auteur de l action" ((@($nA | Where-Object { $_.kind -eq "reponse" })[0]).acteur.id) $idB
Check "B prevenu : reponse acceptee" (@($nB | Where-Object { $_.kind -eq "reponse_acceptee" }).Count) 1
Check "B prevenu : vote sur sa reponse" (@($nB | Where-Object { $_.kind -eq "vote" }).Count) 1
Check "personne n est prevenu de ses propres actions" (@($nA | Where-Object { $_.acteur.id -eq $idA }).Count) 0
$avant = (Call GET "/api/notifications?limit=1" $null $ta).json.non_lues
$premiere = @($nA | Where-Object { -not $_.lue })[0]
Check "marquer comme lue" (Call PUT "/api/notifications/$($premiere.id)/lue" $null $ta).status 200
Check "compteur de non lues diminue" ($avant - (Call GET "/api/notifications?limit=1" $null $ta).json.non_lues) 1
Check "B ne peut pas lire les notifications de A" (Call PUT "/api/notifications/$($premiere.id)/lue" $null $tb).status 404

Write-Host "== Tags, signalement, suivi"
$r = Call GET "/api/echanges/tags?q=hooks$n"
Check "tags" $r.status 200
Check "tag trouve" $r.json.data[0].tag "hooks$n"
Check "signaler" (Call POST "/api/echanges/$postId/signaler" @{ motif = "Spam" } $tb).status 201
Check "double signalement refuse" (Call POST "/api/echanges/$postId/signaler" @{ motif = "Spam" } $tb).status 409
Check "signaler son contenu refuse" (Call POST "/api/echanges/$postId/signaler" @{ motif = "Spam" } $ta).status 403
Check "suivre" (Call POST "/api/echanges/posts/$postId/suivre" $null $tb).json.suivi $true
Check "ne plus suivre" (Call DELETE "/api/echanges/posts/$postId/suivre" $null $tb).json.suivi $false

Write-Host "== Modification et droits"
Check "B ne peut pas modifier le post de A" (Call PUT "/api/echanges/$postId" @{ titre = "Titre pirate" } $tb).status 403
Check "A modifie son titre" (Call PUT "/api/echanges/$postId" @{ titre = "Titre modifie $n" } $ta).status 200
Check "modification vide refusee" (Call PUT "/api/echanges/$postId" @{} $ta).status 400
Check "B ne peut pas supprimer le post de A" (Call DELETE "/api/echanges/$postId" $null $tb).status 403
Check "admin : refuse a un dev" (Call GET "/api/admin/signalements" $null $ta).status 403
Check "admin : sans token" (Call GET "/api/admin/signalements").status 401
Check "changer un role : refuse a un dev" (Call PUT "/api/admin/users/$idB/role" @{ role = "admin" } $ta).status 403

Write-Host "== Classement"
$r = Call GET "/api/classement?pays=ZZ"
Check "classement du pays" $r.status 200
Check "B est premier" $r.json.data[0].pseudo "forumB$n"
Check "rang 1" $r.json.data[0].rang 1
Check "classement des pays" (Call GET "/api/classement/pays").status 200

Write-Host "== Suppression"
Check "B supprime sa reponse" (Call DELETE "/api/echanges/$rid" $null $tb).status 200
$r = Call GET "/api/echanges/posts/$postId"
Check "compteur remis a 0" $r.json.post.nb_reponses 0
Check "statut redevenu ouvert" $r.json.post.statut "ouvert"
Check "reputation de B reprise (-15)" (Call GET "/api/users/$idB").json.utilisateur.reputation 10
Check "A supprime sa question" (Call DELETE "/api/echanges/$postId" $null $ta).status 200
Check "question disparue" (Call GET "/api/echanges/posts/$postId").status 404

Write-Host ""
if ($script:fail -eq 0) { Write-Host "TOUT EST BON" -ForegroundColor Green }
else { Write-Host "$($script:fail) verification(s) en echec" -ForegroundColor Red; exit 1 }