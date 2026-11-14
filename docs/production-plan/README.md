# Ubuntu Tales — Production Plan

This folder is the source of truth for turning the Ubuntu Tales concept app (Angular 22, hardcoded data, fake `localStorage` auth) into a production-ready product.

Target stack: **React (Vite) frontend**, **NestJS backend**, **PostgreSQL** database, **RustFS** (S3-compatible) object storage. Everything else is specified in these docs.

## How to use these docs (for implementing agents)

1. Read `00-overview-and-decisions.md` and `01-architecture.md` first. Every task assumes you know them.
2. Pick the next task from `10-implementation-roadmap.md`. Tasks are ordered and list their dependencies. Do not start a task whose dependencies are not merged.
3. Read the reference docs listed on the task (for example `02-domain-model-and-database.md` for schema work).
4. Implement, test, and satisfy every acceptance criterion on the task before opening a PR.
5. If a doc is wrong or ambiguous, fix the doc in the same PR and say so in the PR description. Do not silently diverge.

## Document index

| File | Purpose |
| --- | --- |
| `00-overview-and-decisions.md` | Concept-app audit, goals, non-goals, full tech stack with rationale, architectural decision records |
| `01-architecture.md` | System diagram, components, key request flows, deployment topology |
| `02-domain-model-and-database.md` | Entities, Prisma schema, indexes, search, seed data |
| `03-api-specification.md` | REST API contract: conventions, every endpoint, errors, pagination |
| `04-file-storage-rustfs.md` | Buckets, object keys, upload/processing/playback flows, CDN, backups |
| `05-backend-implementation.md` | NestJS module layout, auth, jobs, config, conventions |
| `06-frontend-implementation.md` | React app structure, routes mapped from concept screens, state, audio, PWA, design system |
| `07-infrastructure-devops.md` | Local dev, Docker, CI/CD, environments, deployment, observability, backups |
| `08-security-privacy.md` | Threat model, auth hardening, upload safety, privacy law (POPIA/GDPR/NDPR) |
| `09-testing-quality.md` | Test pyramid, tooling, coverage gates, e2e scenarios, performance budgets |
| `10-implementation-roadmap.md` | Phased, dependency-ordered task list with acceptance criteria |

## Global rules for every agent

- **Monorepo:** pnpm workspaces and Turborepo. Never add `package-lock.json` or `yarn.lock`.
- **Language:** TypeScript `strict: true` everywhere. No `any` without a comment explaining why.
- **Contract first:** the backend publishes OpenAPI; the frontend consumes a generated client (`packages/api-client`). Never hand-write fetch calls to the API.
- **No secrets in git.** Use `.env.example` with placeholder values.
- **Migrations are append-only.** Never edit a migration that has merged to `main`.
- **Every PR:** passes `pnpm lint`, `pnpm typecheck`, `pnpm test`, and builds. New behaviour has tests.
- **Design fidelity:** the concept app's look and feel is the spec for the UI. Port it; do not redesign it.
- **Small PRs:** one roadmap task per PR where possible.
