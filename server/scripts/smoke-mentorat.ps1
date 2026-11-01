# Test de bout en bout du mentorat (demandes, accompagnements) pour Windows PowerShell.
# Serveur lance (npm run dev) + MongoDB demarre.
# Usage :  powershell -ExecutionPolicy Bypass -File scripts/smoke-mentorat.ps1
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

Write-Host "== Trois comptes (M est mentor, E demande, X n'est pas mentor)"
$rm = Call POST "/api/auth/register" @{ pseudo = "mentM$n"; email = "mentM$n@test.com"; mot_de_passe = "Azerty123" }
$re = Call POST "/api/auth/register" @{ pseudo = "mentE$n"; email = "mentE$n@test.com"; mot_de_passe = "Azerty123" }
$rx = Call POST "/api/auth/register" @{ pseudo = "mentX$n"; email = "mentX$n@test.com"; mot_de_passe = "Azerty123" }
Check "register M" $rm.status 201
Check "register E" $re.status 201
Check "register X" $rx.status 201
$tm = $rm.json.token; $te = $re.json.token; $tx = $rx.json.token
$idM = $rm.json.utilisateur.id; $idX = $rx.json.utilisateur.id
Check "M propose du mentorat" (Call PUT "/api/users/me" @{ objectifs = @("offrir_mentorat"); stacks = @("react") } $tm).status 200

Write-Host "== Trouver un mentor"
$r = Call GET "/api/mentorat/mentors?q=mentM$n"
Check "liste publique" $r.status 200
Check "1 mentor trouve" $r.json.total 1
Check "places restantes" $r.json.data[0].places_restantes 5
Check "sans email" ($r.json.data[0].email -eq $null) $true
Check "X n'est pas dans la liste" (Call GET "/api/mentorat/mentors?q=mentX$n").json.total 0
Check "M ne se voit pas dans sa propre liste" (Call GET "/api/mentorat/mentors?q=mentM$n" $null $tm).json.total 0

Write-Host "== Demander"
$demande = @{ mentor_id = $idM; sujet = "Apprendre React"; message = "Je debute et je cherche quelqu'un pour me guider." }
Check "sans token" (Call POST "/api/mentorat/demandes" $demande).status 401
Check "message trop court" (Call POST "/api/mentorat/demandes" @{ mentor_id = $idM; sujet = "React"; message = "court" } $te).status 400
Check "identifiant invalide" (Call POST "/api/mentorat/demandes" @{ mentor_id = "abc"; sujet = "React"; message = "Je debute et je cherche un guide." } $te).status 400
Check "mentor inconnu" (Call POST "/api/mentorat/demandes" @{ mentor_id = "000000000000000000000000"; sujet = "React"; message = "Je debute et je cherche un guide." } $te).status 404
Check "X n'est pas mentor" (Call POST "/api/mentorat/demandes" @{ mentor_id = $idX; sujet = "React"; message = "Je debute et je cherche un guide." } $te).status 409
Check "pas a soi-meme" (Call POST "/api/mentorat/demandes" $demande $tm).status 400
$r = Call POST "/api/mentorat/demandes" $demande $te
Check "E demande" $r.status 201
Check "etat en attente" $r.json.demande.statut "en_attente"
$did = $r.json.demande.id
Check "deuxieme demande en attente refusee" (Call POST "/api/mentorat/demandes" $demande $te).status 409
Check "E voit sa demande dans la liste" (Call GET "/api/mentorat/mentors?q=mentM$n" $null $te).json.data[0].ma_relation.statut "en_attente"

Write-Host "== Notification et listes"
$nM = @((Call GET "/api/notifications?limit=50" $null $tm).json.notifications)
$notif = $nM | Where-Object { $_.kind -eq "mentorat" } | Select-Object -First 1
Check "M a recu une notification" ($notif -ne $null) $true
Check "etape demande" $notif.sujet.etape "demande"
$r = Call GET "/api/mentorat/mes" $null $tm
Check "M : 1 demande recue" @($r.json.recues).Count 1
Check "M : 1 a traiter" $r.json.a_traiter 1
Check "avec le pseudo de E" $r.json.recues[0].mentee.pseudo "mentE$n"
Check "E : 1 demande envoyee" @((Call GET "/api/mentorat/mes" $null $te).json.envoyees).Count 1
Check "mes sans token" (Call GET "/api/mentorat/mes").status 401

Write-Host "== Accepter"
Check "E ne peut pas accepter" (Call PUT "/api/mentorat/demandes/$did/accepter" $null $te).status 403
Check "M accepte" (Call PUT "/api/mentorat/demandes/$did/accepter" $null $tm).status 200
Check "deuxieme decision refusee" (Call PUT "/api/mentorat/demandes/$did/refuser" $null $tm).status 409
$nE = @((Call GET "/api/notifications?limit=50" $null $te).json.notifications)
$acc = $nE | Where-Object { $_.kind -eq "mentorat" -and $_.sujet.etape -eq "acceptee" } | Select-Object -First 1
Check "E a recu la notification d'acceptation" ($acc -ne $null) $true
Check "deja accompagne : nouvelle demande refusee" (Call POST "/api/mentorat/demandes" $demande $te).status 409
$r = Call GET "/api/mentorat/mentors?q=mentM$n"
Check "1 personne accompagnee" $r.json.data[0].nb_accompagnes 1
Check "4 places restantes" $r.json.data[0].places_restantes 4

Write-Host "== Terminer"
Check "X ne fait pas partie de l'accompagnement" (Call PUT "/api/mentorat/demandes/$did/terminer" $null $tx).status 403
Check "E met fin" (Call PUT "/api/mentorat/demandes/$did/terminer" $null $te).status 200
Check "deja termine" (Call PUT "/api/mentorat/demandes/$did/terminer" $null $te).status 409
Check "place liberee" (Call GET "/api/mentorat/mentors?q=mentM$n").json.data[0].places_restantes 5

Write-Host "== Refuser, puis retirer"
$r = Call POST "/api/mentorat/demandes" @{ mentor_id = $idM; sujet = "Node.js"; message = "Je voudrais aussi progresser en Node." } $te
Check "E redemande apres la fin" $r.status 201
$did2 = $r.json.demande.id
Check "M refuse" (Call PUT "/api/mentorat/demandes/$did2/refuser" $null $tm).status 200
$nE = @((Call GET "/api/notifications?limit=50" $null $te).json.notifications)
Check "E a recu la notification de refus" (($nE | Where-Object { $_.kind -eq "mentorat" -and $_.sujet.etape -eq "refusee" }) -ne $null) $true
$r = Call POST "/api/mentorat/demandes" @{ mentor_id = $idM; sujet = "Docker"; message = "Une derniere question sur Docker." } $te
Check "nouvelle demande apres un refus" $r.status 201
$did3 = $r.json.demande.id
Check "M ne retire pas la demande de E" (Call DELETE "/api/mentorat/demandes/$did3" $null $tm).status 403
Check "E retire sa demande" (Call DELETE "/api/mentorat/demandes/$did3" $null $te).status 200
Check "demande retiree introuvable" (Call DELETE "/api/mentorat/demandes/$did3" $null $te).status 404

Write-Host ""
if ($script:fail -eq 0) { Write-Host "TOUT EST BON" -ForegroundColor Green }
else { Write-Host "$($script:fail) verification(s) en echec" -ForegroundColor Red; exit 1 }
