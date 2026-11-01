# Test de bout en bout de la collaboration (candidatures, equipe) pour Windows PowerShell.
# Serveur lance (npm run dev) + MongoDB demarre.
# Usage :  powershell -ExecutionPolicy Bypass -File scripts/smoke-collab.ps1
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

Write-Host "== Trois comptes (A porte le projet, B et C candidatent)"
$ra = Call POST "/api/auth/register" @{ pseudo = "colA$n"; email = "colA$n@test.com"; mot_de_passe = "Azerty123" }
$rb = Call POST "/api/auth/register" @{ pseudo = "colB$n"; email = "colB$n@test.com"; mot_de_passe = "Azerty123" }
$rc = Call POST "/api/auth/register" @{ pseudo = "colC$n"; email = "colC$n@test.com"; mot_de_passe = "Azerty123" }
Check "register A" $ra.status 201
Check "register B" $rb.status 201
Check "register C" $rc.status 201
$ta = $ra.json.token; $tb = $rb.json.token; $tc = $rc.json.token
$idB = $rb.json.utilisateur.id
$r = Call POST "/api/projets" @{ titre = "Projet collab $n"; description = "Test de collaboration"; stack = @("react"); roles_recherches = @("frontend", "design") } $ta
Check "A cree le projet" $r.status 201
$pid = $r.json.projet.id
if (-not $pid) { $pid = $r.json.projet._id }

Write-Host "== Candidater"
Check "sans token" (Call POST "/api/projets/$pid/candidatures" @{ message = "Je veux aider sur ce projet" }).status 401
Check "message trop court" (Call POST "/api/projets/$pid/candidatures" @{ message = "court" } $tb).status 400
Check "projet inconnu" (Call POST "/api/projets/000000000000000000000000/candidatures" @{ message = "Je veux aider sur ce projet" } $tb).status 404
Check "le porteur ne se candidate pas" (Call POST "/api/projets/$pid/candidatures" @{ message = "Je veux aider sur ce projet" } $ta).status 400
$r = Call POST "/api/projets/$pid/candidatures" @{ message = "Je connais React et Node, dispo le soir."; role = "frontend" } $tb
Check "B candidate" $r.status 201
Check "etat en attente" $r.json.candidature.statut "en_attente"
$cidB = $r.json.candidature.id
Check "deuxieme candidature en attente refusee" (Call POST "/api/projets/$pid/candidatures" @{ message = "Je veux aider sur ce projet" } $tb).status 409
$r = Call GET "/api/projets/$pid" $null $tb
Check "B voit sa candidature" $r.json.ma_candidature.statut "en_attente"
Check "B n'est pas encore membre" $r.json.est_membre $false
Check "A voit 1 demande a traiter" (Call GET "/api/projets/$pid" $null $ta).json.nb_candidatures_en_attente 1
Check "anonyme : pas de candidature" ((Call GET "/api/projets/$pid").json.ma_candidature -eq $null) $true

Write-Host "== Notification du porteur"
$nA = @((Call GET "/api/notifications?limit=50" $null $ta).json.notifications)
$cand = $nA | Where-Object { $_.kind -eq "candidature" } | Select-Object -First 1
Check "A a recu une notification candidature" ($cand -ne $null) $true
Check "elle pointe vers le projet" $cand.sujet.id $pid

Write-Host "== Liste reservee au porteur"
Check "B ne voit pas les candidatures" (Call GET "/api/projets/$pid/candidatures" $null $tb).status 403
$r = Call GET "/api/projets/$pid/candidatures?statut=en_attente" $null $ta
Check "A voit la liste" $r.status 200
Check "1 candidature" $r.json.total 1
Check "avec le pseudo du candidat" $r.json.data[0].candidat.pseudo "colB$n"
Check "sans email" ($r.json.data[0].candidat.email -eq $null) $true

Write-Host "== Accepter"
Check "B ne peut pas accepter" (Call PUT "/api/candidatures/$cidB/accepter" @{} $tb).status 403
$r = Call PUT "/api/candidatures/$cidB/accepter" @{ role = "developpeur frontend" } $ta
Check "A accepte" $r.status 200
Check "etat accepte" $r.json.candidature.statut "acceptee"
Check "deuxieme decision refusee" (Call PUT "/api/candidatures/$cidB/refuser" @{} $ta).status 409
$r = Call GET "/api/projets/$pid" $null $tb
Check "B est membre" $r.json.est_membre $true
Check "1 membre dans l'equipe" @($r.json.projet.membres).Count 1
Check "avec son role" $r.json.projet.membres[0].role "developpeur frontend"
Check "plus de demande a traiter" (Call GET "/api/projets/$pid" $null $ta).json.nb_candidatures_en_attente 0
$nB = @((Call GET "/api/notifications?limit=50" $null $tb).json.notifications)
Check "B a recu la notification d'acceptation" (($nB | Where-Object { $_.kind -eq "candidature_acceptee" }) -ne $null) $true
Check "un membre ne se recandidate pas" (Call POST "/api/projets/$pid/candidatures" @{ message = "Je veux aider sur ce projet" } $tb).status 409

Write-Host "== Refuser, puis retirer"
$r = Call POST "/api/projets/$pid/candidatures" @{ message = "Designer UI, je peux faire les maquettes." } $tc
Check "C candidate" $r.status 201
$cidC = $r.json.candidature.id
Check "A refuse" (Call PUT "/api/candidatures/$cidC/refuser" @{} $ta).status 200
$nC = @((Call GET "/api/notifications?limit=50" $null $tc).json.notifications)
Check "C a recu la notification de refus" (($nC | Where-Object { $_.kind -eq "candidature_refusee" }) -ne $null) $true
$r = Call POST "/api/projets/$pid/candidatures" @{ message = "Je reviens avec un portfolio complet." } $tc
Check "C peut recandidater apres un refus" $r.status 201
$cidC2 = $r.json.candidature.id
Check "A ne peut pas retirer la candidature de C" (Call DELETE "/api/candidatures/$cidC2" $null $ta).status 403
Check "C retire sa candidature" (Call DELETE "/api/candidatures/$cidC2" $null $tc).status 200
Check "candidature retiree introuvable" (Call DELETE "/api/candidatures/$cidC2" $null $tc).status 404

Write-Host "== Equipe : role, depart"
Check "C ne change pas les roles" (Call PUT "/api/projets/$pid/membres/$idB" @{ role = "lead" } $tc).status 403
Check "role vide refuse" (Call PUT "/api/projets/$pid/membres/$idB" @{ role = "" } $ta).status 400
Check "A change le role de B" (Call PUT "/api/projets/$pid/membres/$idB" @{ role = "lead frontend" } $ta).status 200
Check "role mis a jour" (Call GET "/api/projets/$pid").json.projet.membres[0].role "lead frontend"
Check "C ne retire pas B" (Call DELETE "/api/projets/$pid/membres/$idB" $null $tc).status 403
Check "B quitte l'equipe" (Call DELETE "/api/projets/$pid/membres/$idB" $null $tb).status 200
Check "equipe vide" @((Call GET "/api/projets/$pid").json.projet.membres).Count 0
Check "B n'est plus membre" (Call DELETE "/api/projets/$pid/membres/$idB" $null $tb).status 404

Write-Host "== Nettoyage"
Check "A supprime le projet" (Call DELETE "/api/projets/$pid" $null $ta).status 200

Write-Host ""
if ($script:fail -eq 0) { Write-Host "TOUT EST BON" -ForegroundColor Green }
else { Write-Host "$($script:fail) verification(s) en echec" -ForegroundColor Red; exit 1 }
