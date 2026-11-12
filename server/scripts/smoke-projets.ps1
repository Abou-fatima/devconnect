# Test de bout en bout des projets (Dev 5) pour Windows PowerShell.
# Serveur lance (npm run dev) + MongoDB demarre.
# Usage :  powershell -ExecutionPolicy Bypass -File scripts/smoke-projets.ps1
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

Write-Host "== Deux comptes de test (A porte le projet, B reagit)"
$ra = Call POST "/api/auth/register" @{ pseudo = "projA$n"; email = "projA$n@test.com"; mot_de_passe = "Azerty123" }
$rb = Call POST "/api/auth/register" @{ pseudo = "projB$n"; email = "projB$n@test.com"; mot_de_passe = "Azerty123" }
Check "register A" $ra.status 201
Check "register B" $rb.status 201
$ta = $ra.json.token; $tb = $rb.json.token
$idA = $ra.json.utilisateur.id

Write-Host "== Creer un projet"
Check "creation sans token" (Call POST "/api/projets" @{ titre = "Mon projet" }).status 401
Check "titre trop court refuse" (Call POST "/api/projets" @{ titre = "ab" } $ta).status 400
Check "lien javascript refuse" (Call POST "/api/projets" @{ titre = "Projet pirate"; liens = @{ github = "javascript:alert(1)" } } $ta).status 400
$r = Call POST "/api/projets" @{ titre = "DevConnect mobile $n"; description = "Application pour les devs"; stack = @("React", "Node", "react"); roles_recherches = @("Frontend"); statut = "en_cours"; liens = @{ github = "https://github.com/test/projet" } } $ta
Check "creer projet" $r.status 201
Check "stack en minuscules et dedupliquee" $r.json.projet.stack.Count 2
Check "stack en minuscules" $r.json.projet.stack[0] "react"
$projetId = $r.json.projet.id
if (-not $projetId) { $projetId = $r.json.projet._id }

Write-Host "== Liste, filtres, tendances"
$r = Call GET "/api/projets?stack=React&porteur=$idA"
Check "liste filtree" $r.status 200
Check "liste : 1 projet" $r.json.total 1
Check "porteur avec pseudo" $r.json.data[0].porteur_id.pseudo "projA$n"
Check "filtre role" (Call GET "/api/projets?porteur=$idA&role=front").json.total 1
Check "filtre statut" (Call GET "/api/projets?porteur=$idA&statut=termine").json.total 0
Check "statut invalide refuse" (Call GET "/api/projets?statut=nimporte").status 400
Check "pagination invalide refusee" (Call GET "/api/projets?limit=500").status 400
Check "tendances (route avant /:id)" (Call GET "/api/projets/tendances").status 200

Write-Host "== Detail et modification"
$r1 = Call GET "/api/projets/$projetId"
$r2 = Call GET "/api/projets/$projetId"
Check "detail" $r1.status 200
Check "vues incrementees" ($r2.json.projet.nb_vues - $r1.json.projet.nb_vues) 1
Check "id invalide" (Call GET "/api/projets/abc").status 404
Check "B ne peut pas modifier" (Call PUT "/api/projets/$projetId" @{ titre = "Titre pirate" } $tb).status 403
Check "A modifie" (Call PUT "/api/projets/$projetId" @{ statut = "termine" } $ta).status 200
Check "modification vide refusee" (Call PUT "/api/projets/$projetId" @{} $ta).status 400
Check "statut mis a jour" (Call GET "/api/projets/$projetId").json.projet.statut "termine"

Write-Host "== Commentaires et likes"
Check "commentaire sans token" (Call POST "/api/projets/$projetId/commentaires" @{ contenu = "Super" }).status 401
Check "B commente" (Call POST "/api/projets/$projetId/commentaires" @{ contenu = "Super projet" } $tb).status 201
Check "commentaire vide refuse" (Call POST "/api/projets/$projetId/commentaires" @{ contenu = "" } $tb).status 400
Check "liste des commentaires" (Call GET "/api/projets/$projetId/commentaires").json.commentaires.Count 1
Check "B aime" (Call POST "/api/projets/$projetId/like" $null $tb).json.nb_likes 1
Check "double like sans effet" (Call POST "/api/projets/$projetId/like" $null $tb).json.nb_likes 1
Check "B retire son like" (Call DELETE "/api/projets/$projetId/like" $null $tb).json.nb_likes 0
Check "retrait sans like" (Call DELETE "/api/projets/$projetId/like" $null $tb).json.nb_likes 0

Write-Host "== Upload (sans fichier)"
Check "upload sans token" (Call POST "/api/upload").status 401

Write-Host "== Suppression"
Check "B ne peut pas supprimer" (Call DELETE "/api/projets/$projetId" $null $tb).status 403
Check "A supprime" (Call DELETE "/api/projets/$projetId" $null $ta).status 200
Check "projet disparu" (Call GET "/api/projets/$projetId").status 404
Check "commentaires supprimes avec le projet" (Call GET "/api/projets/$projetId/commentaires").status 404

Write-Host ""
if ($script:fail -eq 0) { Write-Host "TOUT EST BON" -ForegroundColor Green }
else { Write-Host "$($script:fail) verification(s) en echec" -ForegroundColor Red; exit 1 }
