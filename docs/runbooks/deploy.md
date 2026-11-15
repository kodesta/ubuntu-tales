# Deploy runbook (staging and production)

## Prerequisites

- Images built by `.github/workflows/deploy-staging.yml` (main) or `deploy-production.yml` (tag `v*`).
- Secrets present in the GitHub `staging` / `production` environments: `STAGING_HOST`, `STAGING_USER`,
  `STAGING_SSH_KEY`, `PRODUCTION_HOST`, `PRODUCTION_USER`, `PRODUCTION_SSH_KEY`, plus the runtime env
  from `infra/compose/docker-compose.prod.yml`.
- A server with Docker + Compose, a `ut-media` volume and a Caddy edge (TLS via ACME).

## Staging deploy

1. Merge to `main`; wait for CI and the image build to pass.
2. SSH to the staging host and `cd /srv/ubuntu-tales`.
3. **Back up first**: `docs/runbooks/backups.md` (takes < 2 min).
4. Pull: `docker compose -f infra/compose/docker-compose.prod.yml pull`.
5. Migrate: `docker compose -f infra/compose/docker-compose.prod.yml run --rm api pnpm db:deploy`
   (run from the API image with the build workspace present, or use `prisma migrate deploy` directly).
6. Roll the API and web containers one at a time; wait for `/api/v1/health/ready`.
7. Seed only if the catalogue changed: `docker compose ... run --rm api pnpm db:seed` (idempotent).
8. Smoke: `/api/v1/health/ready`, `/api/v1/home`, `/` (200), open a tale, play narration, sign in.

## Production deploy

Production requires the `production` environment approval gate.

1. Tag a release: `git tag v1.0.0 && git push origin v1.0.0`.
2. Approve the deployment in GitHub.
3. Follow the staging steps with the production host and a **verified** backup (`backups.md`).
4. Deploy during low traffic; watch Grafana (API p95, error rate, DB connections) for 15 minutes.
5. If any smoke check fails: `docs/runbooks/rollback.md` immediately.

## Validating the compose file without secrets

`docker compose config` needs the image tags and required env present. To lint the file locally:

```bash
cd infra/compose
API_IMAGE=ghcr.io/example/api:test WEB_IMAGE=ghcr.io/example/web:test \
POSTGRES_USER=ut POSTGRES_PASSWORD=pw DATABASE_URL=postgresql://example \
SMTP_HOST=smtp.example.com SMTP_PORT=587 SMTP_FROM=a@b.c DOMAIN=example.com \
ACME_EMAIL=a@b.c WEB_ORIGIN=https://example.com \
JWT_SECRET=0123456789012345678901234567890123456789 \
docker compose -f docker-compose.prod.yml config --quiet && echo valid
```

## Environment variables

See `.env.example` (dev) and `deploy/.env.production.example` (to be created from the same list plus
`POSTGRES_*`, `DOMAIN`, `ACME_EMAIL`, `API_IMAGE`, `WEB_IMAGE`). Production requires
`COOKIE_SECURE=true`, `NODE_ENV=production`, a 48+ character `JWT_SECRET`, and real SMTP credentials.
Dev-only affordances (`devEmailToken`, `devResetToken`, quick-login chips) are disabled when
`NODE_ENV=production`.
