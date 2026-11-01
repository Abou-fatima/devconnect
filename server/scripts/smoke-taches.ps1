# Test de bout en bout de l'espace projet (taches) pour Windows PowerShell.
# Serveur lance (npm run dev) + MongoDB demarre.
# Usage :  powershell -ExecutionPolicy Bypass -File scripts/smoke-taches.ps1
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

Write-Host "== Trois comptes (A porteur, B membre, C etranger)"
$ra = Call POST "/api/auth/register" @{ pseudo = "tacA$n"; email = "tacA$n@test.com"; mot_de_passe = "Azerty123" }
$rb = Call POST "/api/auth/register" @{ pseudo = "tacB$n"; email = "tacB$n@test.com"; mot_de_passe = "Azerty123" }
$rc = Call POST "/api/auth/register" @{ pseudo = "tacC$n"; email = "tacC$n@test.com"; mot_de_passe = "Azerty123" }
Check "register A" $ra.status 201
Check "register B" $rb.status 201
Check "register C" $rc.status 201
$ta = $ra.json.token; $tb = $rb.json.token; $tc = $rc.json.token
$idA = $ra.json.utilisateur.id; $idB = $rb.json.utilisateur.id; $idC = $rc.json.utilisateur.id

Write-Host "== Projet et equipe"
$r = Call POST "/api/projets" @{ titre = "Projet taches $n"; description = "Test de l'espace projet"; stack = @("react") } $ta
Check "A cree le projet" $r.status 201
$pid = $r.json.projet.id
$r = Call POST "/api/projets/$pid/candidatures" @{ message = "Je veux aider sur ce projet" } $tb
Check "B candidate" $r.status 201
Check "A accepte B" (Call PUT "/api/candidatures/$($r.json.candidature.id)/accepter" @{} $ta).status 200

Write-Host "== Acces reserve a l'equipe"
Check "sans token" (Call GET "/api/projets/$pid/taches").status 401
Check "C n'a pas acces" (Call GET "/api/projets/$pid/taches" $null $tc).status 403
Check "C ne peut pas creer" (Call POST "/api/projets/$pid/taches" @{ titre = "Intrus" } $tc).status 403
Check "projet inconnu" (Call GET "/api/projets/000000000000000000000000/taches" $null $ta).status 404
Check "B a acces" (Call GET "/api/projets/$pid/taches" $null $tb).status 200

Write-Host "== Creer, assigner, deplacer"
Check "titre trop court" (Call POST "/api/projets/$pid/taches" @{ titre = "a" } $ta).status 400
Check "statut invalide" (Call POST "/api/projets/$pid/taches" @{ titre = "Maquette"; statut = "fini" } $ta).status 400
Check "assigner a un etranger refuse" (Call POST "/api/projets/$pid/taches" @{ titre = "Maquette"; assigne_a = $idC } $ta).status 400
$r = Call POST "/api/projets/$pid/taches" @{ titre = "Maquette ecran accueil"; assigne_a = $idB } $ta
Check "A cree et assigne a B" $r.status 201
Check "statut par defaut" $r.json.tache.statut "a_faire"
$tid = $r.json.tache.id
$nb = @((Call GET "/api/notifications?limit=50" $null $tb).json.notifications | Where-Object { $_.kind -eq "tache" }).Count
Check "B est notifie" $nb 1
Check "B deplace en cours" (Call PUT "/api/projets/$pid/taches/$tid" @{ statut = "en_cours" } $tb).json.tache.statut "en_cours"
Check "rien a modifier" (Call PUT "/api/projets/$pid/taches/$tid" @{} $tb).status 400
Check "tache inconnue" (Call PUT "/api/projets/$pid/taches/000000000000000000000000" @{ statut = "termine" } $tb).status 404
Check "C ne modifie pas" (Call PUT "/api/projets/$pid/taches/$tid" @{ statut = "termine" } $tc).status 403
Check "A retire l'assignation" ((Call PUT "/api/projets/$pid/taches/$tid" @{ assigne_a = $null } $ta).json.tache.assigne_a -eq $null) $true
Check "liste a 1 tache" @((Call GET "/api/projets/$pid/taches" $null $ta).json.taches).Count 1

Write-Host "== Supprimer"
Check "C ne supprime pas" (Call DELETE "/api/projets/$pid/taches/$tid" $null $tc).status 403
Check "B supprime" (Call DELETE "/api/projets/$pid/taches/$tid" $null $tb).status 200
Check "liste vide" @((Call GET "/api/projets/$pid/taches" $null $ta).json.taches).Count 0

Write-Host "== Nettoyage"
Check "A supprime le projet" (Call DELETE "/api/projets/$pid" $null $ta).status 200

Write-Host ""
if ($script:fail -eq 0) { Write-Host "TOUT EST BON" -ForegroundColor Green }
else { Write-Host "$($script:fail) verification(s) en echec" -ForegroundColor Red; exit 1 }
