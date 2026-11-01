# Test de bout en bout des notes vocales (envoi, controle du format, transcription) pour Windows PowerShell.
# Serveur lance (npm run dev) + MongoDB demarre. Sans cle WHISPER_API_KEY, la transcription reste vide : c'est normal.
# Usage :  powershell -ExecutionPolicy Bypass -File scripts/smoke-audio.ps1
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


# Envoi multipart/form-data (HttpWebRequest, sans keep-alive)
function Envoyer($path, [byte[]]$octets, $nom, $token) {
  $limite = "----smoke$n"
  $req = [System.Net.HttpWebRequest]::Create("$Base$path")
  $req.Method = "POST"; $req.KeepAlive = $false; $req.Timeout = 60000
  $req.ContentType = "multipart/form-data; boundary=$limite"
  if ($token) { $req.Headers.Add("Authorization", "Bearer $token") }
  $debut = [System.Text.Encoding]::UTF8.GetBytes("--$limite`r`nContent-Disposition: form-data; name=`"file`"; filename=`"$nom`"`r`nContent-Type: application/octet-stream`r`n`r`n")
  $milieu = [System.Text.Encoding]::UTF8.GetBytes("`r`n--$limite`r`nContent-Disposition: form-data; name=`"transcrire`"`r`n`r`nfalse`r`n--$limite--`r`n")
  $req.ContentLength = $debut.Length + $octets.Length + $milieu.Length
  $flux = $req.GetRequestStream()
  $flux.Write($debut, 0, $debut.Length); $flux.Write($octets, 0, $octets.Length); $flux.Write($milieu, 0, $milieu.Length); $flux.Close()
  try { $resp = $req.GetResponse() } catch [System.Net.WebException] { $resp = $_.Exception.Response; if ($resp -eq $null) { throw } }
  $status = [int]$resp.StatusCode
  $lecteur = New-Object System.IO.StreamReader($resp.GetResponseStream(), [System.Text.Encoding]::UTF8)
  $texte = $lecteur.ReadToEnd(); $lecteur.Close(); $resp.Close()
  $json = $null; try { $json = $texte | ConvertFrom-Json } catch {}
  return @{ status = $status; json = $json }
}

Write-Host "== Compte"
$r = Call POST "/api/auth/register" @{ pseudo = "vocal$n"; email = "vocal$n@test.com"; mot_de_passe = "Azerty123" }
Check "register" $r.status 201
$tk = $r.json.token

Write-Host "== Statut"
$r = Call GET "/api/audio/statut"
Check "statut public" $r.status 200
Write-Host "   transcription active : $($r.json.transcription)"

Write-Host "== Envoi"
# 4 octets d'en-tete WebM (EBML) + remplissage : suffit pour le controle du format
$webm = [byte[]](0x1A,0x45,0xDF,0xA3) + (New-Object byte[] 60)
Check "sans token" (Envoyer "/api/audio" $webm "note.webm" $null).status 401
Check "format refuse (script)" (Envoyer "/api/audio" ([System.Text.Encoding]::UTF8.GetBytes("<?php echo 1; ?> ................................")) "note.webm" $tk).status 400
$r = Envoyer "/api/audio" $webm "note.webm" $tk
Check "note vocale acceptee" $r.status 201
Check "adresse /uploads/audio/" ($r.json.audio_url -like "/uploads/audio/*.webm") $true
$url = $r.json.audio_url

Write-Host "== Lecture"
$req = [System.Net.HttpWebRequest]::Create("$Base$url"); $req.KeepAlive = $false
$resp = $req.GetResponse()
Check "fichier servi" ([int]$resp.StatusCode) 200
$resp.Close()

Write-Host ""
if ($script:fail -eq 0) { Write-Host "TOUT EST BON" -ForegroundColor Green }
else { Write-Host "$($script:fail) verification(s) en echec" -ForegroundColor Red; exit 1 }
