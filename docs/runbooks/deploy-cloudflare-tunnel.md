# Deploying behind Cloudflare Tunnel (tales.fabapi.xyz + talesapi.fabapi.xyz)

This host runs both services on loopback; Cloudflare Tunnel terminates TLS and publishes them.
Nothing needs to listen publicly.

## Services on this host

| Service | Local address | Purpose |
| --- | --- | --- |
| Web (SPA + PWA) | `http://127.0.0.1:4180` | `tales.fabapi.xyz` |
| API (REST + media) | `http://127.0.0.1:4100` | `talesapi.fabapi.xyz` (routes `/api/v1/*` and `/media/*`) |
| PostgreSQL | `127.0.0.1:5433` / `ubuntu_tales_prod` | not published |
| Media files | `/home/photon/ubuntu-tales/var/media` | served by the API |

The web build points at `https://talesapi.fabapi.xyz/api/v1` (built with `VITE_API_URL`), and the API
returns absolute media URLs (`MEDIA_PUBLIC_BASE_URL=https://talesapi.fabapi.xyz`) so images/audio work
across the two subdomains.

## Runtime env

Production environment lives in `deploy/.env.production` (0600, gitignored), including the
`ubuntu_tales_prod` database URL, a 96-hex-character `JWT_SECRET`, `COOKIE_SECURE=true`,
`WEB_ORIGIN=https://tales.fabapi.xyz`, and `MEDIA_PUBLIC_BASE_URL`.
Editorial credentials are in `deploy/admin-credentials.txt` (0600, gitignored) — **rotate them after
first sign-in** (Settings → change password).

## Start / restart

```bash
cd /home/photon/ubuntu-tales
./deploy/restart.sh          # restarts the API and re-creates the web container if needed
./deploy/restart.sh --status # show listeners + container state
```

`deploy/restart.sh` is idempotent: it stops any old API process on :4100, starts
`deploy/start-api.sh` detached, and ensures the `ut-web` Caddy container is running with
`--restart unless-stopped`.

## Cloudflare Tunnel ingress

Add these entries to the tunnel that serves `fabapi.xyz` (either in the Zero Trust dashboard under
Networks → Tunnels → your tunnel → Public Hostnames, or in the local `config.yml`):

```yaml
tunnel: <your-tunnel-id>
credentials-file: /etc/cloudflared/<your-tunnel-id>.json

ingress:
  - hostname: tales.fabapi.xyz
    service: http://localhost:4180
  - hostname: talesapi.fabapi.xyz
    service: http://localhost:4100
  - service: http_status:404
```

Then route DNS (once per hostname):

```bash
cloudflared tunnel route dns <tunnel-name> tales.fabapi.xyz
cloudflared tunnel route dns <tunnel-name> talesapi.fabapi.xyz
```

Restart the tunnel service after editing config (`sudo systemctl restart cloudflared`, or restart the
container/tunnel process you use).

## Cloudflare settings worth enabling

- **SSL/TLS mode: Full (strict)** — the tunnel origin is plain HTTP on loopback, but Cloudflare's
  tunnel terminates TLS; Full is correct.
- **Always Use HTTPS**: on.
- **HSTS**: the web host already sends HSTS; Cloudflare HSTS is optional.
- **Caching**: leave HTML/API/media uncached by default rules (the app sets its own cache headers and
  the API sends `Cache-Control` for catalogue GETs). If you add a cache rule, exclude `/api/*`.
- **WAF/rate limiting** (recommended before public launch): rate-limit `/api/v1/auth/*` (e.g. 20 req/min
  per IP) as an extra layer in front of the API's in-process lockout.

## Verify after DNS is live

```bash
curl -sS https://talesapi.fabapi.xyz/api/v1/health/ready
curl -sS https://talesapi.fabapi.xyz/api/v1/explore | head -c 200
curl -sS -o /dev/null -w "%{http_code}\n" https://tales.fabapi.xyz/
curl -sS -o /dev/null -w "%{http_code}\n" https://tales.fabapi.xyz/explore
# audio range through the API host (expect 206):
curl -sS -o /dev/null -w "%{http_code}\n" -H 'Range: bytes=0-1023' \
  https://talesapi.fabapi.xyz/media/narrations/when-the-chameleon-carried-the-word/aac_64k.m4a
```

Sign in at `https://tales.fabapi.xyz/login` as `admin@ubuntutales.local` with the password in
`deploy/admin-credentials.txt`, then open `https://tales.fabapi.xyz/admin`.

## Deploying new code

```bash
cd /home/photon/ubuntu-tales
git pull
pnpm install --frozen-lockfile
pnpm --filter @ubuntu-tales/shared build && pnpm --filter @ubuntu-tales/db build
pnpm --filter api build
VITE_API_URL=https://talesapi.fabapi.xyz/api/v1 pnpm --filter web build
source deploy/.env.production
(cd packages/db && pnpm exec prisma migrate deploy)
./deploy/restart.sh
```

## Known limitations of this deployment

- **Email is not delivered**: no SMTP provider is configured, so `EMAIL_LOG_ONLY=true` and verification
  / reset tokens are written to the API log (`/tmp/ut-api-prod.log`). Configure `SMTP_*` and set
  `EMAIL_LOG_ONLY=false` (then restart) before relying on sign-up verification. The seeded admin/editor
  accounts are already verified.
- **No off-site backups yet**: `docs/runbooks/backups.md` describes the nightly job; it is not scheduled.
- **No `/metrics` exporter yet**: the API does not expose Prometheus metrics (see the Phases 3–6 report).
- **Legal copy is a draft** and needs review before public launch.
