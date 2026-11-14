# Deviations register — Phase 0 + Phase 1 build (2026-11-14)

This file records where the implementation deliberately differs from the production plan, why, and
what replaces the deferred work. **Anything not listed here should follow the plan.** Update this
file whenever an agent diverges (also required by the plan README, rule 5).

## Context deviations

| # | Deviation | Why | Replacement / follow-up |
| --- | --- | --- | --- |
| D1 | Repository was not a git repository when work started. | The workspace contained only `docs/`. | `git init`, initial commit of the docs on `main`, work on `feat/phase-1-foundations`. |
| D2 | The Angular concept app (`src/`, assets, `public/assets/images`, component CSS) is not present. | Only `docs/production-plan/` exists in this checkout. | Greenfield build. Roadmap task 0.1's "move concept to `legacy/`" is N/A until a concept checkout is supplied. |
| D3 | "Port the concept 1:1" is superseded by the requested **Substack-inspired editorial feel**. | User instruction, 2026-11-14. | `docs/design/substack-experience.md` is the binding visual spec (ADR-013 below). |
| D4 | Seed catalogue is authored from scratch instead of extracted from concept components. | Concept data is unavailable (D2). | `/content` JSON written by the editorial agent, original retellings of traditional tales (roadmap 1.2 adapted). |

## Phase 0 status (this branch)

| Task | Status | Notes |
| --- | --- | --- |
| 0.1 Monorepo restructure | ✅ adapted | pnpm workspaces + Turborepo + `packages/config`. No legacy app to move (D2). |
| 0.2 Local infrastructure | 🟡 partial | PostgreSQL 17 + extensions via Docker Compose. **Valkey, RustFS, Mailpit deferred** — no Phase 1 feature needs them. `.env.example` created. |
| 0.3 CI skeleton | ✅ minimal | `.github/workflows/ci.yml`: frozen install, prisma generate, build, lint, typecheck, test. Gitleaks deferred. |
| 0.4 `packages/db` | 🟡 subset | Prisma schema for the read path (Tribe, Category, Narrator, Story, StoryOfTheDay), migration, idempotent seed, client export. User/progress/submission/media tables deferred to their phases. Raw search SQL adapted (no `searchVector` generated column yet; search uses `unaccent`/`pg_trgm` in the query). |
| 0.5 `packages/storage` | ⏸ deferred | No RustFS in Phase 1. Covers are static SVGs served by the web app. |
| 0.6 `apps/api` scaffold | ✅ adapted | NestJS 11 + Fastify, Zod env validation, Problem Details filter, Prisma provider, `/health/*`, `/api/v1` prefix. Swagger/OpenAPI emit deferred (0.8 depends on it). |
| 0.7 `apps/worker` | ⏸ deferred | No jobs in the read path. |
| 0.8 `packages/api-client` | 🟡 adapted | Hand-written typed client over shared DTOs (documented in the package). orval/codegen deferred. |
| 0.9 `apps/web` scaffold | ✅ | Vite + React 19 + TS strict, TanStack Router/Query, CSS Modules + tokens, self-hosted fonts, Vitest + RTL. |

## Phase 1 status (this branch)

| Task | Status | Notes |
| --- | --- | --- |
| 1.1 Image pipeline | ⏸ deferred | RustFS/sharp pipeline absent; static SVG artwork instead. |
| 1.2 Seed and asset import | 🟡 adapted | Idempotent seed from `/content`; no media upload/rendition step. 16 tribes, 18 tales, narrators, covers. |
| 1.3 Tribes & categories API | ✅ | `GET /tribes`, `/tribes/:slug`, `/categories`; in-process response caching + ETag/Cache-Control. Valkey caching deferred. |
| 1.4 Stories/search/library/home API | ✅ | Filters, keyset pagination, search suggestions, story detail, recommendations, `/home`, `/library/*`, `/authors/:id`, story-of-the-day fallback. |
| 1.5 Design-system primitives | ✅ adapted | Substack-inspired editorial system (`docs/design/substack-experience.md`), `/__ui` gallery. |
| 1.6 App shell + navigation | ✅ | URL-driven routes, bottom nav, drawer, toasts, 404, error boundary, scroll restoration. |
| 1.7 Onboarding + tribes screens | ✅ | `/welcome`, `/tribes`, low-story dialog, guest tribe in localStorage, `/tribes/$slug`. |
| 1.8 Home screen | ✅ | Today's tale hero, personalised feed, wisdom notes, discover publications, URL-synced search. |
| 1.9 Library screen | ✅ adapted | Substack-archive list (not 4-column grid) per D3; tabs bound to `?tab=`; infinite scroll. |
| 1.10 Read mode (text) | ✅ | `/stories/$slug`, sentence spans, font-size cycling, local reading progress, finish → `/complete`. |
| 1.11 Share pages / OG | ⏸ deferred | No crawler-rendering endpoint yet; SPA share uses `navigator.share`/clipboard. |

## Other deferrals in the Phase 1 slice

- **Auth/accounts (Phase 2)**: saves, follows, reactions and progress are local (`localStorage` via
  Zustand), clearly labelled as on-device until accounts ship. No tokens, no fake auth.
- **i18n (`react-i18next`)**: deferred to the i18n hardening task (5.5). Strings are centralized in
  feature components; no hardcoded user-facing strings justify a full extraction yet.
- **PWA/offline (3.6/3.7)**, **audio/read-along (3.x)**, **submissions/admin (4.x)** deferred.
- **Ports**: API on `4100`, web on `5173` because `3000`/`4000` are occupied on the dev host.
- **Media URLs**: API returns root-relative `/covers/*.svg` for Phase 1; production will return CDN
  absolute URLs (ADR-006).
- **API client generation**: see 0.8 above.
- **ESLint format**: ESLint 9 flat config (plan implies flat config) with typescript-eslint strict.
- **Seed users**: none in Phase 1 (no auth).

## ADR-013 — Substack-inspired editorial experience (new)

Adopt a publication/reading metaphor: tribes are publications, tales are posts/letters, narrators
are authors, home is a reading list, the library is an archive. Editorial typography (Lora), warm
paper surfaces, hairline rules, restrained accent colours, no dashboard chrome. The concept palette
and fonts are retained. Full specification: `docs/design/substack-experience.md`.
