#!/usr/bin/env bash
# Idempotent restart for the loopback deployment (API :4100, web :4180).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

status() {
  echo "— listeners"
  ss -ltnp 2>/dev/null | grep -E ':(4100|4180)\b' || echo "  (none)"
  echo "— containers"
  docker ps --filter name=ut-web --format '  {{.Names}} {{.Status}}' || true
}

if [[ "${1:-}" == "--status" ]]; then
  status
  exit 0
fi

# API: stop whatever is on :4100, then start the production build detached.
for pid in $(ps -eo pid,args | grep -E 'node dist/main\.js' | grep -v grep | awk '{print $1}'); do
  kill "$pid" 2>/dev/null || true
done
for _ in $(seq 1 20); do
  ss -ltn 2>/dev/null | grep -q ':4100' || break
  sleep 0.5
done

setsid nohup "$ROOT/deploy/start-api.sh" > /tmp/ut-api-prod.log 2>&1 < /dev/null &
for _ in $(seq 1 40); do
  if curl -s -m 1 -o /dev/null http://127.0.0.1:4100/api/v1/health/live; then
    echo "api: up"
    break
  fi
  sleep 0.5
done

# Web: recreate the static container if missing; rebuild the image is unnecessary (Caddy + volume).
if ! docker ps --format '{{.Names}}' | grep -q '^ut-web$'; then
  docker rm -f ut-web >/dev/null 2>&1 || true
  docker run -d --name ut-web --restart unless-stopped \
    -p 127.0.0.1:4180:4180 \
    -v "$ROOT/apps/web/dist:/srv:ro" \
    -v "$ROOT/deploy/Caddyfile.web:/etc/caddy/Caddyfile:ro" \
    caddy:2-alpine >/dev/null
  echo "web: started"
else
  docker restart ut-web >/dev/null
  echo "web: restarted"
fi

sleep 2
curl -s -o /dev/null -w "web: %{http_code}\n" http://127.0.0.1:4180/
status
