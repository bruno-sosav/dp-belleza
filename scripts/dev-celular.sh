#!/usr/bin/env bash
# Levanta la API, la web y el panel para abrirlos desde un celular en la misma red Wi-Fi.
set -e
IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}')
if [ -z "$IP" ]; then echo "No encontré la IP de la red local (¿estás conectado al Wi-Fi?)"; exit 1; fi

export CORS_ORIGINS="http://localhost:5173,http://localhost:5174,http://$IP:5173,http://$IP:5174"
export VITE_API_URL="http://$IP:3000"
export VITE_SITE_URL="http://$IP:5173"

echo ""
echo "  Desde el celular (mismo Wi-Fi):"
echo "    Web:   http://$IP:5173"
echo "    Panel: http://$IP:5174"
echo ""

trap 'kill 0' EXIT
npm run dev -w @dp/backend &
npm run dev -w @dp/cliente -- --host &
npm run dev -w @dp/admin -- --host &
wait
