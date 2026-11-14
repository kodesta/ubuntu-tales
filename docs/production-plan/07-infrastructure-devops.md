# 07 — Infrastructure and DevOps

## 1. Environments

| Env | Purpose | Deploy trigger | Data |
| --- | --- | --- | --- |
| `local` | Developer machines | `pnpm dev` | Seeded dev data, Mailpit, local RustFS |
| `ci` | Tests | Every PR | Testcontainers (ephemeral) |
| `staging` | QA, design review, content preview | Merge to `main` (auto) | Seeded catalogue + anonymised copy of prod content (no user PII) |
| `production` | Users | Git tag `v*` + manual approval in GitHub Environment | Real |

Domains: `ubuntutales.com` (web), `api` on same origin under `/api` (avoids CORS and keeps cookies first-party), `media.ubuntutales.com`, `storage.ubuntutales.com`. Staging uses `staging.` prefixes and is protected by Cloudflare Access.

## 2. Local development

Prerequisites: Node 22 (via `.nvmrc`), pnpm 10 (via `packageManager` + Corepack), Docker.

```bash
pnpm install
cp .env.example .env
pnpm infra:up          # docker compose -f infra/compose/docker-compose.dev.yml up -d
pnpm db:migrate        # prisma migrate dev
pnpm db:seed           # tribes, categories, stories, demo users, uploads images to RustFS
pnpm dev               # turbo: web :5173, api :3000, worker
```

`docker-compose.dev.yml` services: `postgres:17-alpine` (with init SQL enabling `pg_trgm`, `unaccent`, `citext`), `valkey/valkey:8-alpine`, `rustfs/rustfs:<pinned>` + `rustfs-init`, `axllent/mailpit`. Optional profile `observability`: `grafana/otel-lgtm` all-in-one for local traces/logs/metrics.

Vite dev server proxies `/api` → `http://localhost:3000` so the browser sees one origin, matching production.

## 3. Containers (`infra/docker`)

| Image | Base | Notes |
| --- | --- | --- |
| `api` | `node:22-bookworm-slim` multi-stage (`pnpm deploy --filter api --prod`) | Non-root user, `tini`, healthcheck `/api/v1/health/live`, read-only root FS |
| `worker` | `node:22-bookworm-slim` + static `ffmpeg` | Non-root, `/tmp/ut-worker` as tmpfs |
| `web` | `caddy:2-alpine` with built SPA in `/srv` | Serves static assets, SPA fallback, routes `/api/*` and crawler `/stories/*` to `api`, sets security headers |
| `migrate` | same as `api` | Runs `prisma migrate deploy` then exits |
| `aligner` (phase 4) | `python:3.12-slim` + WhisperX | CPU build; GPU optional |

All images: built for `linux/amd64` and `linux/arm64`, tagged with git SHA and semver, pushed to GHCR, scanned with Trivy (fail on HIGH/CRITICAL with a fix available), SBOM generated (Syft) and signed (cosign keyless).

### Caddy routing (web container)

```
ubuntutales.com {
  encode zstd gzip
  header {
    Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    X-Content-Type-Options nosniff
    Referrer-Policy strict-origin-when-cross-origin
    Permissions-Policy "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy "default-src 'self'; img-src 'self' https://media.ubuntutales.com data: blob:; media-src 'self' https://media.ubuntutales.com blob:; connect-src 'self' https://storage.ubuntutales.com https://*.ingest.sentry.io https://eu.i.posthog.com; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  }
  @crawler {
    path /stories/*
    header_regexp User-Agent (?i)(facebookexternalhit|twitterbot|whatsapp|slackbot|linkedinbot|telegrambot|discordbot)
  }
  handle @crawler { rewrite * /share{path} ; reverse_proxy api:3000 }
  handle /api/* { reverse_proxy api:3000 { health_uri /api/v1/health/ready } }
  handle /share/* { reverse_proxy api:3000 }
  handle {
    root * /srv
    @hashed path /assets/*
    header @hashed Cache-Control "public, max-age=31536000, immutable"
    header /index.html Cache-Control "no-cache"
    header /sw.js Cache-Control "no-cache"
    try_files {path} /index.html
    file_server
  }
}
```

(Agents: treat this as a reference; adjust syntax to the pinned Caddy version and test it.)

## 4. CI/CD (GitHub Actions)

### `ci.yml` — on pull request and push to `main`
1. Checkout, setup Node 22 + pnpm, restore pnpm store and Turbo cache.
2. `pnpm install --frozen-lockfile`
3. In parallel (Turbo, affected packages only on PRs):
   - `lint` (ESLint flat config + Prettier check)
   - `typecheck`
   - `test` (unit)
   - `test:int` (api + storage with Testcontainers: Postgres, Valkey, RustFS)
   - `api-client:check` (OpenAPI + generated client up to date)
   - `db:check` (Prisma schema formatted, `prisma migrate diff` shows no drift)
   - `build`
4. `e2e` job: build images, `docker compose -f infra/compose/docker-compose.ci.yml up`, seed, run Playwright (mobile Chrome + mobile Safari/WebKit), upload traces on failure.
5. `lighthouse` job on PRs touching `apps/web`: Lighthouse CI against the e2e stack, budgets from `06` §12.
6. Security: `pnpm audit --prod` (warn), CodeQL (weekly + PR), Gitleaks secret scan, Trivy on images.

### `deploy-staging.yml` — on push to `main` after CI passes
Build & push images (`:sha`), then deploy to staging (see §5), run smoke tests (`/health/ready`, login, open a story, stream 1 MB of audio with a Range request).

### `deploy-production.yml` — on tag `v*`
Requires approval in the `production` GitHub Environment. Promotes the exact staging-tested image digests (no rebuild), runs migrations, rolls api/worker/web, runs smoke tests, creates a Sentry release with source maps, and auto-rolls back to the previous digests if smoke tests fail.

Dependabot/Renovate: weekly grouped updates; RustFS, Postgres, and Valkey images pinned and updated deliberately.

## 5. Deployment (v1)

**Topology (production):**
- `app-1`, `app-2` VMs (4 vCPU / 8 GB): `web` (Caddy), `api` ×1 each; `worker` on `app-2`.
- Managed PostgreSQL 17 (HA, PITR) — or a self-hosted primary + replica with Patroni if no managed option is available in-region.
- `valkey` on `app-1` with AOF persistence (loss is tolerable; queues re-derivable via outbox).
- RustFS cluster: 4 storage VMs (see `04` §10).
- Cloudflare in front of `ubuntutales.com` and `media.` (proxied, WAF managed rules, bot fight mode, cache rules for `/assets/*` and media).
- Private network between all VMs; only Cloudflare IP ranges allowed on 443; SSH via Tailscale/WireGuard only.

**Mechanics:** Docker Compose per VM (`infra/compose/docker-compose.prod.yml`) driven by the deploy workflow over SSH (Tailscale GitHub Action). Rolling update: `docker compose pull` → run `migrate` container → update `api` on app-1, wait for `/health/ready`, then app-2 (or use the `docker rollout` plugin). Workers drain with `SIGTERM` (BullMQ graceful close, 60 s grace).

**Secrets:** stored in GitHub Environments (`staging`, `production`); the deploy job renders them into a root-only `.env` on each host. Rotate JWT keys and S3 keys every 90 days (JWT supports two active public keys via `kid`).

**Path to Kubernetes (later):** images, health checks, env-only config, and stateless api/worker are already k8s-ready; add Helm charts when traffic or team size warrants.

## 6. Backups and disaster recovery

| Data | Method | RPO | RTO | Retention |
| --- | --- | --- | --- | --- |
| PostgreSQL | Managed PITR (or pgBackRest: WAL archiving + daily full to off-site S3) | ≤ 5 min | ≤ 1 h | 30 days PITR, 12 monthly snapshots |
| RustFS `ut-media`, `ut-private` | Erasure coding + hourly `rclone sync` to off-site provider with versioning/object lock | ≤ 1 h | ≤ 4 h | 90 days of versions |
| Valkey | AOF; not backed up | n/a | minutes | — |
| Config/secrets | GitHub Environments + encrypted export in password manager | — | — | — |

Monthly restore drill: restore latest Postgres backup into staging, run `prisma migrate status` and smoke tests; record the result in `docs/runbooks/restore-log.md`.

## 7. Observability

- **Logs:** JSON (pino) → OTel Collector → Loki. Retention 30 days.
- **Metrics:** Prometheus scraping api, worker, Caddy, Postgres exporter, Valkey exporter, node exporter, RustFS. Grafana dashboards committed in `infra/grafana/dashboards`.
- **Traces:** OTel → Tempo; 10% sampling, 100% for errors.
- **Errors:** Sentry for web (with source maps, session replay off by default for privacy) and api/worker.
- **Uptime:** external checks every minute on `/`, `/api/v1/health/ready`, a media object, from two regions (Better Stack / Uptime Kuma).

**Alerts (to on-call channel):**
- API 5xx rate > 1% for 5 min; p95 latency > 800 ms for 10 min.
- `health/ready` failing from external monitor for 2 min.
- BullMQ failed jobs > 10 in 15 min; queue waiting > 500 for 15 min.
- Postgres connections > 80%, replication lag > 30 s, disk > 80%.
- RustFS disk > 75%, any node offline.
- Off-site backup job not successful in 2 h (dead-man switch).
- TLS certificate < 14 days to expiry.

## 8. Runbooks (create in `docs/runbooks/` during Phase 5)

`deploy-and-rollback.md`, `restore-postgres.md`, `restore-media.md`, `rotate-secrets.md`, `rustfs-node-failure.md`, `queue-backlog.md`, `incident-response.md`, `suspend-user-and-takedown-content.md`.

## 9. Cost-conscious starting point

For a soft launch (< 5k MAU) everything except RustFS can run on a single 4 vCPU / 8 GB VM plus managed Postgres, and RustFS on a single node with hourly off-site sync. Scale out to the §5 topology before public launch marketing.
