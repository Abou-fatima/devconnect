# Test de bout en bout de l'envoi d'images (conversion WebP) pour Windows PowerShell.
# Serveur lance (npm run dev) + MongoDB demarre + "npm install" fait dans server (module sharp).
# Usage :  powershell -ExecutionPolicy Bypass -File scripts/smoke-upload.ps1
param([string]$Base = "http://localhost:4000")

Add-Type -AssemblyName System.Drawing
$n = Get-Random -Minimum 10000 -Maximum 99999
$script:fail = 0

function Check($label, $actual, $expected) {
  if ($actual -eq $expected) { Write-Host "[OK]   $label ($actual)" -ForegroundColor Green }
  else { Write-Host "[FAIL] $label : attendu $expected, obtenu $actual" -ForegroundColor Red; $script:fail++ }
}

function Lire($req) {
  try { $resp = $req.GetResponse() }
  catch [System.Net.WebException] { $resp = $_.Exception.Response; if ($resp -eq $null) { throw } }
  $status = [int]$resp.StatusCode
  $type = $resp.ContentType
  $ms = New-Object System.IO.MemoryStream
  $resp.GetResponseStream().CopyTo($ms)
  $resp.Close()
  $octets = $ms.ToArray()
  $json = $null
  try { $json = [System.Text.Encoding]::UTF8.GetString($octets) | ConvertFrom-Json } catch {}
  return @{ status = $status; json = $json; type = $type; taille = $octets.Length }
}

function Call($method, $path, $body = $null, $token = $null) {
  $req = [System.Net.HttpWebRequest]::Create("$Base$path")
  $req.Method = $method
  $req.KeepAlive = $false
  $req.Timeout = 30000
  if ($token) { $req.Headers.Add("Authorization", "Bearer $token") }
  if ($body) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 6))
    $req.ContentType = "application/json; charset=utf-8"
    $req.ContentLength = $bytes.Length
    $stream = $req.GetRequestStream(); $stream.Write($bytes, 0, $bytes.Length); $stream.Close()
  }
  return Lire $req
}

# Envoi multipart/form-data : champs texte + (facultatif) un fichier
function Envoyer($token, $champs, $octets, $nom, $type) {
  $limite = "----devconnect" + [guid]::NewGuid().ToString("N")
  $enc = [System.Text.Encoding]::UTF8
  $ms = New-Object System.IO.MemoryStream
  foreach ($k in $champs.Keys) {
    $b = $enc.GetBytes("--$limite`r`nContent-Disposition: form-data; name=`"$k`"`r`n`r`n$($champs[$k])`r`n")
    $ms.Write($b, 0, $b.Length)
  }
  if ($octets -ne $null) {
    $b = $enc.GetBytes("--$limite`r`nContent-Disposition: form-data; name=`"file`"; filename=`"$nom`"`r`nContent-Type: $type`r`n`r`n")
    $ms.Write($b, 0, $b.Length)
    $ms.Write($octets, 0, $octets.Length)
    $b = $enc.GetBytes("`r`n"); $ms.Write($b, 0, $b.Length)
  }
  $b = $enc.GetBytes("--$limite--`r`n"); $ms.Write($b, 0, $b.Length)
  $corps = $ms.ToArray()
  $req = [System.Net.HttpWebRequest]::Create("$Base/api/upload")
  $req.Method = "POST"; $req.KeepAlive = $false; $req.Timeout = 60000
  if ($token) { $req.Headers.Add("Authorization", "Bearer $token") }
  $req.ContentType = "multipart/form-data; boundary=$limite"
  $req.ContentLength = $corps.Length
  $s = $req.GetRequestStream(); $s.Write($corps, 0, $corps.Length); $s.Close()
  return Lire $req
}

# Image PNG de test, volontairement grande (2400 x 1200) pour verifier la reduction a 1600 px
function NouvellePng($largeur, $hauteur) {
  $bmp = New-Object System.Drawing.Bitmap $largeur, $hauteur
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::SteelBlue)
  $g.FillEllipse([System.Drawing.Brushes]::Orange, 100, 100, 600, 600)
  $g.Dispose()
  $flux = New-Object System.IO.MemoryStream
  $bmp.Save($flux, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  return $flux.ToArray()
}

Write-Host "== Compte de test"
$r = Call POST "/api/auth/register" @{ pseudo = "upl$n"; email = "upl$n@test.com"; mot_de_passe = "Azerty123"; pays = "ZZ" }
Check "register" $r.status 201
$token = $r.json.token
$png = NouvellePng 2400 1200

Write-Host "== Refus"
Check "sans token" (Envoyer $null @{ cible_type = "user" } $png "a.png" "image/png").status 401
Check "sans fichier" (Envoyer $token @{ cible_type = "user" } $null $null $null).status 400
Check "cible_type invalide" (Envoyer $token @{ cible_type = "admin" } $png "a.png" "image/png").status 400
Check "projet sans cible_id" (Envoyer $token @{ cible_type = "projet" } $png "a.png" "image/png").status 400
Check "projet inconnu" (Envoyer $token @{ cible_type = "projet"; cible_id = "000000000000000000000000" } $png "a.png" "image/png").status 404
Check "type non image" (Envoyer $token @{ cible_type = "user" } ([System.Text.Encoding]::UTF8.GetBytes("bonjour")) "a.txt" "text/plain").status 400
Check "faux fichier annonce comme image" (Envoyer $token @{ cible_type = "user" } ([System.Text.Encoding]::UTF8.GetBytes("<?php echo 1; ?>")) "a.png" "image/png").status 400
$gros = New-Object byte[] (6 * 1024 * 1024)
(New-Object System.Random).NextBytes($gros)
Check "fichier trop gros (6 Mo)" (Envoyer $token @{ cible_type = "user" } $gros "gros.png" "image/png").status 413

Write-Host "== Photo de profil : conversion en WebP"
$r = Envoyer $token @{ cible_type = "user" } $png "moi.png" "image/png"
Check "envoi accepte" $r.status 201
$url1 = $r.json.data.url
Check "adresse /uploads/images/xxx.webp" ($url1 -match '^/uploads/images/[a-z0-9]+-[a-f0-9]{16}\.webp$') $true
Check "reduite a 1600 px de large" $r.json.data.metadata.largeur 1600
Check "type enregistre : webp" $r.json.data.mime_type "image/webp"
$f = Call GET $url1
Check "fichier servi" $f.status 200
Check "servi en image/webp" $f.type "image/webp"
Check "plus leger que le PNG d'origine" ($f.taille -lt $png.Length) $true

Write-Host "== Photo dans le profil"
Check "profil mis a jour automatiquement" (Call GET "/api/auth/me" $null $token).json.utilisateur.profil.photo $url1
Check "photo = fichier envoye" (Call PUT "/api/users/me" @{ profil = @{ photo = $url1 } } $token).status 200
Check "photo javascript: refusee" (Call PUT "/api/users/me" @{ profil = @{ photo = "javascript:alert(1)" } } $token).status 400
Check "photo avec .. refusee" (Call PUT "/api/users/me" @{ profil = @{ photo = "/uploads/../secret" } } $token).status 400

Write-Host "== Une seule photo a la fois"
$r2 = Envoyer $token @{ cible_type = "user" } (NouvellePng 400 400) "moi2.png" "image/png"
Check "2e envoi accepte" $r2.status 201
Check "nouvelle adresse" ($r2.json.data.url -ne $url1) $true
Check "image ne s'agrandit pas (400 px)" $r2.json.data.metadata.largeur 400
Check "ancienne photo supprimee" (Call GET $url1).status 404
Check "nouvelle photo servie" (Call GET $r2.json.data.url).status 200
Check "profil pointe vers la nouvelle photo" (Call GET "/api/auth/me" $null $token).json.utilisateur.profil.photo $r2.json.data.url

Write-Host ""
if ($script:fail -eq 0) { Write-Host "TOUT EST BON" -ForegroundColor Green }
else { Write-Host "$($script:fail) verification(s) en echec" -ForegroundColor Red; exit 1 }
