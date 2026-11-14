# Ubuntu Tales

> *Umuntu ngumuntu ngabantu* — a person is a person through other persons.

A mobile-first reading home for African folktales, organised by tribe and region. Pick your roots,
read illustrated tales from the publications you follow, keep your reading list, and (soon) listen
to narrations with read-along highlighting.

The product is built with a **Substack-inspired editorial experience**: each tribe is a publication,
each tale is a letter, and the reading feed is yours. See
[`docs/design/substack-experience.md`](docs/design/substack-experience.md).

This repository is being delivered phase by phase from the production plan in
[`docs/production-plan/`](docs/production-plan/). The current branch builds the **foundations +
catalogue read path** (roadmap Phase 0 and Phase 1). See
[`docs/production-plan/DEVIATIONS.md`](docs/production-plan/DEVIATIONS.md) for what is intentionally
deferred.

## Stack

React 19 + Vite + TanStack Router/Query · NestJS 11 + Fastify · Prisma 6 + PostgreSQL 17 ·
pnpm workspaces + Turborepo · CSS Modules with shared design tokens · Vitest.

Planned (not in this slice): accounts, audio/read-along, uploads, offline/PWA, admin console,
RustFS media, Valkey, worker. All documented in the production plan.

## Quickstart

Requirements: Node 22+, pnpm 10+, Docker.

```bash
pnpm install
cp .env.example .env
pnpm build:deps          # build shared contracts + Prisma client package
pnpm infra:up            # PostgreSQL 17 on localhost:5433
pnpm db:migrate          # create schema
pnpm db:seed             # load the catalogue
pnpm dev                 # API :4100, web :5173
```

Open <http://localhost:5173>. API: <http://localhost:4100/api/v1/health/live>.

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
- **Next:** Phase 2 accounts, saved stories and progress sync.

## Contributing

- One roadmap task per PR where possible; update the deviations register when diverging.
- `pnpm lint && pnpm typecheck && pnpm test` must pass.
- No secrets in git, no `package-lock.json`/`yarn.lock`, TypeScript strict.
