# Test de bout en bout pour Windows PowerShell.
# Serveur lance (npm run dev) + MongoDB demarre.
# Usage :  powershell -ExecutionPolicy Bypass -File scripts/smoke.ps1
param([string]$Base = "http://localhost:4000")

$n = Get-Random -Minimum 10000 -Maximum 99999
$email = "smoke$n@test.com"
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

Write-Host "== Sante"
Check "health" (Call GET "/api/health").status 200

Write-Host "== Inscription / connexion"
$r = Call POST "/api/auth/register" @{ pseudo = "smoke$n"; email = $email; mot_de_passe = "Azerty123"; pays = "gn" }
Check "register" $r.status 201
$token = $r.json.token
Check "mot de passe faible refuse" (Call POST "/api/auth/register" @{ pseudo = "faible$n"; email = "f$n@test.com"; mot_de_passe = "abcdefgh" }).status 400
Check "doublon email refuse" (Call POST "/api/auth/register" @{ pseudo = "autre$n"; email = $email; mot_de_passe = "Azerty123" }).status 409
$r = Call POST "/api/auth/login" @{ identifiant = $email; mot_de_passe = "Azerty123" }
Check "login" $r.status 200
Check "login mauvais mot de passe" (Call POST "/api/auth/login" @{ identifiant = $email; mot_de_passe = "Mauvais123" }).status 401

Write-Host "== Compte et profil"
$r = Call GET "/api/auth/me" $null $token
Check "me avec token" $r.status 200
Check "me renvoie le bon email" $r.json.utilisateur.email $email
Check "me sans token" (Call GET "/api/auth/me").status 401
$r = Call PUT "/api/users/me" @{ stacks = @("React", "node", "react"); objectifs = @("collaborer"); ville = "Conakry"; profil = @{ niveau = "avance"; bio = "Dev fullstack" } } $token
Check "maj profil" $r.status 200
Check "stacks dedupliquees" $r.json.utilisateur.stacks.Count 2
Check "pays en majuscules" $r.json.utilisateur.pays "GN"
Check "niveau invalide refuse" (Call PUT "/api/users/me" @{ profil = @{ niveau = "dieu" } } $token).status 400
Check "maj sans token" (Call PUT "/api/users/me" @{ ville = "X" }).status 401

Write-Host "== Recherche et profil public"
$r = Call GET "/api/users?stack=react&pays=GN"
Check "recherche" $r.status 200
if ($r.json.total -ge 1) { Write-Host "[OK]   recherche trouve $($r.json.total) resultat(s)" -ForegroundColor Green }
else { Write-Host "[FAIL] recherche : aucun resultat" -ForegroundColor Red; $script:fail++ }
$id = $r.json.data[0].id
$r = Call GET "/api/users/$id"
Check "profil public" $r.status 200
Check "email absent du profil public" ($r.json.utilisateur.PSObject.Properties.Name -contains "email") $false
Check "id inconnu" (Call GET "/api/users/000000000000000000000000").status 404

Write-Host "== OTP"
$tel = "+224620$n"
$r = Call POST "/api/auth/otp/send" @{ telephone = $tel }
Check "otp send" $r.status 200
$code = $r.json.code_dev
Check "mauvais code refuse" (Call POST "/api/auth/otp/verify" @{ telephone = $tel; code = "000000"; pseudo = "otp$n" }).status 400
if ($code) {
  Check "otp verify cree le compte" (Call POST "/api/auth/otp/verify" @{ telephone = $tel; code = $code; pseudo = "otp$n" }).status 201
} else {
  Write-Host "[SKIP] code_dev absent (NODE_ENV=production ?)" -ForegroundColor Yellow
}

Write-Host "== Meta"
Check "meta/options" (Call GET "/api/meta/options").status 200

Write-Host ""
if ($script:fail -eq 0) { Write-Host "TOUT EST BON" -ForegroundColor Green }
else { Write-Host "$($script:fail) verification(s) en echec" -ForegroundColor Red; exit 1 }