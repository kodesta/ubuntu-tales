# Ubuntu Tales

> *Umuntu ngumuntu ngabantu* — a person is a person through other persons.

A mobile-first reading home for African folktales, organised by tribe and region. Pick your roots,
read illustrated tales from the publications you follow, keep a synced reading list, track your
progress and reactions, and (soon) listen to narrations with read-along highlighting.

The product is built with a **Substack-inspired editorial experience**: each tribe is a publication,
each tale is a letter, and the reading feed is yours. See
[`docs/design/substack-experience.md`](docs/design/substack-experience.md).

This repository is being delivered phase by phase from the production plan in
[`docs/production-plan/`](docs/production-plan/). The current branch builds the **foundations,
catalogue read path and accounts/personal features** (roadmap Phases 0–2). See
[`docs/production-plan/DEVIATIONS.md`](docs/production-plan/DEVIATIONS.md) for what is intentionally
deferred.

## Stack

React 19 + Vite + TanStack Router/Query · NestJS 11 + Fastify · Prisma 6 + PostgreSQL 17 ·
pnpm workspaces + Turborepo · CSS Modules with shared design tokens · Vitest.

Planned (not in this slice): audio/read-along, uploads, offline/PWA, admin console, RustFS media,
Valkey, worker, legal/privacy tooling. All documented in the production plan.

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
  reading progress/completion/stats, reactions and recommendations. *(Google sign-in, avatar upload,
  data export/delete and legal pages deferred.)*
- **Next:** Phase 3 audio, read-along, uploads and offline.

## Verification

- Unit/integration: `pnpm test` (89 tests across shared, api and web).
- End-to-end: `pnpm exec playwright test` with the API, web and seeded database running
  (`PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers"`). See [`e2e/README.md`](e2e/README.md).
- Accessibility: axe-core scan with zero violations across 9 routes × 2 viewports.
- Evidence: [`docs/qa/phase-1-report.md`](docs/qa/phase-1-report.md) (GO verdict),
  [`screenshot contact sheet`](docs/qa/screenshots/index.html), API smoke log and layout audit.

## Contributing

- One roadmap task per PR where possible; update the deviations register when diverging.
- `pnpm lint && pnpm typecheck && pnpm test` must pass.
- No secrets in git, no `package-lock.json`/`yarn.lock`, TypeScript strict.
