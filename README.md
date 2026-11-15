# Ubuntu Tales

> *Umuntu ngumuntu ngabantu* — a person is a person through other persons.

A mobile-first reading home for African folktales, organised by tribe and region. Pick your roots,
read illustrated tales from the publications you follow, explore them on a map of the continent,
listen to narrations with read-along highlighting, keep a synced reading list, download tales for offline reading, track progress and
reactions, and contribute your own tales through an editorial process.

The product is built with a **Substack-inspired editorial experience**: each tribe is a publication,
each tale is a letter, and the reading feed is yours. See
[`docs/design/substack-experience.md`](docs/design/substack-experience.md).

This repository is delivered phase by phase from the production plan in
[`docs/production-plan/`](docs/production-plan/). The current branch builds **Phases 0–6**: the
foundations, catalogue read path, accounts and personal features, audio/read-along/offline, the
editorial console and community submissions, and production hardening. See
[`docs/production-plan/DEVIATIONS.md`](docs/production-plan/DEVIATIONS.md) for what is intentionally
deferred and [`docs/launch/launch-checklist.md`](docs/launch/launch-checklist.md) for the
production-only launch blockers (human recordings, legal review, DNS/TLS, security scanners, backups).

## Stack

React 19 + Vite + TanStack Router/Query · NestJS 11 + Fastify · Prisma 6 + PostgreSQL 17 ·
pnpm workspaces + Turborepo · CSS Modules with shared design tokens · Vitest.

Also built: local media pipeline (uploads, sharp/ffmpeg processing), narration + read-along, PWA with
offline downloads, editorial console (stories, narration timings, moderation, calendar, flags, audit),
community submissions, legal pages, Dockerfiles, Caddy edge, deploy workflows and observability
configs. Still deferred: RustFS/S3, BullMQ worker, Valkey, transactional outbox, 2FA, ClamAV,
auto-alignment, Google sign-in.

## Quickstart

Requirements: Node 22+, pnpm 10+, Docker.

```bash
pnpm install
cp .env.example .env
pnpm db:generate         # generate the Prisma client
pnpm build:deps          # build shared contracts + the db package
pnpm infra:up            # PostgreSQL 17 on localhost:5433
pnpm db:migrate          # create schema
pnpm db:seed             # load the catalogue
pnpm dev                 # API :4100, web :5173
```

Open <http://localhost:5173>. API: <http://localhost:4100/api/v1/health/live>.
Mailpit (dev email) is at <http://localhost:8025>.

### Accounts (Phase 2)

Seeded dev readers (password `ubuntu-tales-dev`, or `SEED_DEV_PASSWORD` in `.env`):
`kwame@ubuntutales.local`, `thandiwe@ubuntutales.local`, `tendai@ubuntutales.local`,
`amina@ubuntutales.local`. In development the login page has one-click chips for them. Registering a
new account works end-to-end: outside production the API returns a `devEmailToken` that the
verification screen can use without opening Mailpit. Signed-in saves, reading progress and reactions
sync to PostgreSQL; guest behaviour remains local and merges into the account on sign-in.

> `pnpm dev` builds `@ubuntu-tales/shared` and `@ubuntu-tales/db` first so the API can resolve the
> workspace packages, then runs both apps in watch mode.

## Repository layout

```
apps/
  api/                 NestJS API (/api/v1)
  web/                 React SPA
packages/
  api-client/          typed API client (hand-written in Phase 1; orval later)
  config/              shared tsconfig + ESLint config
  db/                  Prisma schema, migrations, seed
  shared/              domain types, content schemas, constants
content/               editorial catalogue (JSON + spec)
docs/
  design/              Substack-inspired visual specification
  production-plan/     the delivery plan + deviations register
infra/
  compose/             local infrastructure
  postgres/            extension bootstrap
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Build deps, then API + web in watch mode |
| `pnpm build` | Build every package and app |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Quality gates (run in CI) |
| `pnpm infra:up` / `pnpm infra:down` / `pnpm infra:reset` | Local PostgreSQL lifecycle |
| `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:reset` / `pnpm db:studio` | Database lifecycle |

## Environment

Copy `.env.example` → `.env`. Values are local development defaults only. Never commit `.env`.
`VITE_*` variables are public by definition; keep secrets out of them.

## Roadmap status

- **Phase 0 — Foundations:** monorepo, CI, local Postgres, DB package, API scaffold, typed client,
  web scaffold. *(Worker, RustFS, Valkey and OpenAPI codegen deferred.)*
- **Phase 1 — Catalogue read path:** tribes, publications, catalogue API, home feed, library,
  reader, griot (author) pages, local reading list. *(Media pipeline and OG share pages deferred.)*
- **Phase 2 — Accounts and personal features:** email/password accounts with rotating refresh
  sessions, verification/reset email, profiles and settings, guest-data merge, synced saved stories,
  reading progress/completion/stats, reactions and recommendations. *(Google sign-in, avatar upload
  and data export/delete deferred.)*
- **Phase 3 — Audio, read-along and offline:** narration seeding, uploads/media processing, full and
  mini players, read-along highlighting, audio progress sync, installable PWA, offline downloads and
  a progress outbox. *(RustFS/worker queues deferred; demo audio is TTS until human recordings land.)*
- **Phase 4 — Editorial console and submissions:** story CRUD/publish, narration attach, moderation
  queue, story-of-the-day calendar, users/flags/audit, community submission flow. *(Waveform timing
  editor, outbox emails and auto-alignment deferred.)*
- **Explore atlas:** `/explore` pins every publication to its cultural homeland on a world/Africa
  map, with a place list, region summaries, a keyboard-friendly list view and direct links into the
  tales.
- **Phase 5 — Production hardening:** Caddy security headers/CSP, Docker images, deploy workflows,
  observability configs, legal pages, consent-gated analytics, security checklist, Lighthouse/k6
  tooling, content lint/import.
- **Phase 6 — Launch readiness:** dated launch checklist, release notes, visual sign-off, content
  readiness, incident/backup/rollback/observability/moderation runbooks.

## Verification

- Unit/integration: `pnpm test` (274 tests across shared, api and web).
- End-to-end: `pnpm exec playwright test` with the API, web and seeded database running
  (`PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers"`). See [`e2e/README.md`](e2e/README.md) —
  116 journeys across desktop and mobile.
- Accessibility: axe-core scan with zero violations across 17 routes × 2 viewports (Phase 1/2).
- Evidence: [`Phase 1`](docs/qa/phase-1-report.md), [`Phase 2`](docs/qa/phase-2-report.md) and
  [`Phases 3–6`](docs/qa/phase-3-6-report.md) reports, screenshot contact sheets
  ([Phase 1](docs/qa/screenshots/index.html), [Phase 2](docs/qa/screenshots/phase-2/index.html),
  [Phase 3/4](docs/qa/screenshots/phase-3-4/index.html)), security probe, API smoke and layout audit.
- Content: `pnpm content:lint` (fails on placeholders, thin tales, missing art).

## Contributing

- One roadmap task per PR where possible; update the deviations register when diverging.
- `pnpm lint && pnpm typecheck && pnpm test` must pass.
- No secrets in git, no `package-lock.json`/`yarn.lock`, TypeScript strict.
