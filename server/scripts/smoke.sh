#!/usr/bin/env bash
# Test rapide de bout en bout. Serveur lancé (npm run dev) + MongoDB démarré.
# Usage : bash scripts/smoke.sh [URL]    (défaut http://localhost:4000)
B="${1:-http://localhost:4000}"
H='Content-Type: application/json'
N=$RANDOM
E="smoke$N@test.com"

echo "== health";            curl -s $B/api/health; echo
echo "== register";          R=$(curl -s -X POST $B/api/auth/register -H "$H" -d "{\"pseudo\":\"smoke$N\",\"email\":\"$E\",\"mot_de_passe\":\"Azerty123\",\"pays\":\"gn\"}"); echo $R
echo "== doublon (409 attendu)"; curl -s -o /dev/null -w "%{http_code}\n" -X POST $B/api/auth/register -H "$H" -d "{\"pseudo\":\"smoke$N\",\"email\":\"$E\",\"mot_de_passe\":\"Azerty123\"}"
echo "== login";             L=$(curl -s -X POST $B/api/auth/login -H "$H" -d "{\"identifiant\":\"$E\",\"mot_de_passe\":\"Azerty123\"}"); echo $L
TOKEN=$(echo "$L" | sed -E 's/.*"token":"([^"]+)".*/\1/')
echo "== mauvais mot de passe (401 attendu)"; curl -s -o /dev/null -w "%{http_code}\n" -X POST $B/api/auth/login -H "$H" -d "{\"identifiant\":\"$E\",\"mot_de_passe\":\"Mauvais123\"}"
echo "== me";                curl -s $B/api/auth/me -H "Authorization: Bearer $TOKEN"; echo
echo "== maj profil";        curl -s -X PUT $B/api/users/me -H "$H" -H "Authorization: Bearer $TOKEN" -d '{"stacks":["React","node","react"],"objectifs":["collaborer"],"ville":"Conakry","profil":{"niveau":"avance","bio":"Dev fullstack"}}'; echo
echo "== recherche stack=react pays=GN"; curl -s "$B/api/users?stack=react&pays=GN"; echo
echo "== OTP envoi";         curl -s -X POST $B/api/auth/otp/send -H "$H" -d "{\"telephone\":\"+224620$N\"}"; echo
echo "== sans token (401 attendu)"; curl -s -o /dev/null -w "%{http_code}\n" $B/api/auth/me
echo "== meta";              curl -s $B/api/meta/options | head -c 200; echo
