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

## Implementation notes (verified 2026-11-15)

### Backend

1. No `searchVector` generated column in this slice. Accent-insensitive search uses
   `unaccent_immutable(...) ILIKE` plus GIN trigram expression indexes on story title/summary/moral
   and tribe name (see the appended SQL in the initial migration).
2. `Story.status` defaults to `PUBLISHED` (plan says `DRAFT`) because the read-path slice has no
   admin/publish flow. Revert to `DRAFT` when the admin console lands (4.2).
3. No Swagger/OpenAPI emit yet; `openapi:emit` is still a stub (0.6/0.8).
4. CORS is implemented with a Fastify `onRequest` hook instead of `@fastify/cors` (no extra
   dependency). Behaviour is equivalent for credential-less public GETs.
5. No ETag and no in-process/Valkey response cache; public catalogue GETs send
   `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` only (Valkey deferred).
6. `/authors` serves the "Voices" tab (the typed client's `getVoices`), matching plan 03 §2.6 in
   intent; the literal `/library/authors` route is not implemented.
7. No narration data exists yet: `hasAudio` is always false, `audioDurationMinutes` is omitted and
   `/library/audio` returns an empty page until Phase 3.
8. `sourceNotes` is not modelled in the read-path schema (optional in the shared DTO).
9. Story covers map to `ImageRef` 1200×800; publication marks map to 600×600 (Tribe stores no
   dimensions). Both are root-relative `/covers/*.svg` paths served by the web app for now.
10. `/stories?q=` filters within the requested sort (default `recent`); only
    `/stories/search-suggestions` is relevance-ordered until full-text search lands (1.4/A-?).
11. The seed rejects content import when `NODE_ENV=production` unless `SEED_ALLOW_PRODUCTION=true`.
12. `ReactionType` enum exists in the schema without a reaction table (Phase 2.6).

### Web

13. `apps/web` build is `vite build && tsc --noEmit` because the file-based route tree is generated
    by the Vite plugin; a fresh `tsc` before generation would fail. `routeTree.gen.ts` is gitignored.
14. The DEV gallery lives at `src/routes/[_]_ui.tsx` (URL `/__ui`); TanStack treats a leading `__`
    directory/file as pathless, so the escaped filename is required. It 404s in production builds.
15. Library "Voices" tab is `?tab=authors` per the plan URL contract, but the page renders authors and
    the data call is `getVoices()` → `GET /authors` (see backend note 6).
16. Saves, follows, reactions, font size, onboarding and reading progress are local-only
    (`localStorage`, Zustand persisted stores, keys `ut.*`); toasts say "accounts are coming soon".
    These stores are the seam for the Phase 2 APIs.
17. `react-i18next` is not installed in this slice; copy is English and lives in the feature
    components. The i18n audit task (5.5) still owns extraction.
18. Playwright, `@axe-core/playwright` and `axe-core` were added at the workspace root for the QA
    evidence required by task 5; browsers live in `.playwright-browsers/` (gitignored).
19. `eslint-plugin-react-hooks` was added to `packages/config` and the shared flat config now enables
    the two hooks rules (error/warn) for `apps/web`.
20. CI (0.3) is minimal: frozen install, Prisma generate, build, lint, typecheck, test + gitleaks.
    No Turbo remote cache, no deploy workflows yet.

## Phase 2 — Accounts and personal features (implemented 2026-11-15)

Phase 2 is implemented except for optional Google sign-in (2.7). The following intentional
deviations apply:

### Auth/session

1. **HS256 JWT with `JWT_SECRET`** instead of Ed25519/`kid` rotation. Claims are `sub`, `sv`, `role`;
   access tokens are 15 minutes and live in memory only. EdDSA can be swapped in `TokenService` when
   key rotation is needed.
2. **Refresh rotation + reuse detection** are implemented (opaque 32-byte token, sha256 stored,
   family revocation). Cookie: `refresh_token`, httpOnly, SameSite=Lax, Path=`/api/v1/auth`,
   Secure via `COOKIE_SECURE`, max-age 30 days. CSRF header `X-Requested-With: ubuntu-tales`
   required on `/auth/refresh`.
3. **Rate limiting is in-process and partial**: login lockout (10 failures/15 min) and resend
   (3/hour) are enforced; the broader Valkey-backed API throttler from 05 §3.2 is deferred
   (Valkey is not part of this slice). Progressive delays are not implemented.
4. **HIBP k-anonymity check** is implemented with a 2.5 s timeout and fail-open; disable via
   `HIBP_ENABLED=false`.
5. **Email is sent synchronously** (nodemailer → Mailpit in dev; any SMTP in prod) with a safe
   console fallback when SMTP is unavailable. There is no BullMQ/outbox email queue yet (4.5).
   In non-production, register/forgot responses include `devEmailToken`/`devResetToken` so tests and
   demos can complete the flows without reading email.
6. **Password change rotates the session**: because the refresh cookie is scoped to
   `/api/v1/auth`, the API revokes all refresh tokens, bumps `sessionVersion` and issues a fresh
   cookie for the current device; other devices are signed out.
7. **Dev seed users** are created outside production (`admin@`, `editor@`, `kwame@`, `thandiwe@`,
   `tendai@`, `amina@ubuntutales.local`, password from `SEED_DEV_PASSWORD`). Dev-only quick-login
   chips exist on `/login`.
8. **No email-verified gate on login**: unverified accounts can sign in; the UI shows a verification
   banner and resend action. Gated actions are not blocked on verification in this slice.

### Personal features

9. **Avatars are initials-only** (no RustFS upload). `User.avatar` is absent in DTOs; the web renders
   a monogram. Avatar upload stays in 3.1/2.3 follow-up.
10. **`UserStats` keeps streaks directly** via `lastActiveDay` (optional `X-Timezone` header, editorial
    timezone fallback); the `ListeningDaily` table and nightly `stats.recompute` job are deferred to
    the audio phase. `listeningSeconds` accumulates from API deltas but text reading contributes 0.
11. **Completion auto-triggers at ≥95%** on progress PUT as well as via the explicit complete
    endpoint (05 §3.9). Completion is idempotent: `talesRead`/`tribesExplored` increment only on the
    first completion.
12. **`GET /me/saved` returns `total`** for the active filter, which the signed-in `/saved` header
    uses (additive to the plan's pagination shape).
13. **Optional auth on catalogue GETs** populates `StoryCard.viewer`; authenticated catalogue
    responses use `Cache-Control: private, no-store`. `/home` prefers the account tribe over the
    guest `?tribe=` preference.
14. **Guest data is merged on login/signup** for roots (tribe), saved stories and reading progress.
    Guest reactions stay local until the reader re-picks them (first sync uploads); documented as a
    known minor gap for QA.
15. **Export, delete account, consents management and legal pages** (privacy work, roadmap 5.2) are
    still deferred; registration records terms/privacy/lineage consent rows.
16. **Google sign-in (2.7)** is deferred as optional for launch.
17. **Security headers/CSP/Helmet, OWASP ZAP, and a manual screen-reader pass** remain Phase 5 work;
    cookies are httpOnly/SameSite-protected and tokens are never stored in localStorage.

### Phase 2 roadmap status

| Task | Status |
| --- | --- |
| 2.1 Auth backend | ✅ implemented (deviations above) |
| 2.2 Web auth | ✅ implemented (AuthModal, requireAuth resume, guest merge, dev quick login) |
| 2.3 Profile, settings, `/me` | ✅ adapted (initials avatar; update profile/password; export/delete deferred) |
| 2.4 Saved stories | ✅ synced for accounts; local fallback for guests |
| 2.5 Reading progress and stats | ✅ text progress, completion, streak, continue list; audio deltas later |
| 2.6 Celebration, reactions, recommendations | ✅ API-synced reactions/counts, API recommendations and stats |
| 2.7 Google sign-in | ⏸ deferred (optional for launch) |

### Phase 2 verification

QA sign-off: **GO** ([`docs/qa/phase-2-report.md`](../../docs/qa/phase-2-report.md)).
116/116 Playwright journeys (desktop + mobile), 63/63 session/security contract assertions,
37/37 API smoke assertions, 274/274 unit/integration tests, 0 axe violations across 34 scans.
Four defects were found and fixed during QA: guest-merge cache race, signed-in reading-progress
restore, an unreachable AuthModal trigger (now wired from the guest reading list), and a
label-in-name regression on the reaction buttons. The only open findings are low-severity touch
target sizes (carried from Phase 1) and launch-time coverage notes (WebKit/Firefox, visual
baselines, Lighthouse, manual screen-reader pass, production `COOKIE_SECURE` + dev-token gating).

## Phase 3 — Audio, read-along, offline (implemented 2026-11-15)

Implemented: media uploads, image/audio processing, narrations + timings, story `hasAudio`/
`listenTimeMinutes`/`defaultNarration`, `/library/audio`, offline bundles, downloads, a full player,
read-along highlighting, PWA shell, offline downloads and a progress outbox.

Deviations:

1. **Local-disk storage instead of RustFS/S3.** `StorageService` behind `/media/**` with Range
   support; `MEDIA_ROOT` points at `var/media`. The S3/RustFS swap is isolated to that one class.
2. **In-process processing instead of the worker queue.** Uploads are processed synchronously (no
   BullMQ/worker in this slice). Large files buffer in memory up to 320 MB.
3. **Demo narration is synthesised** (Piper TTS) with exact sentence timings; seeded from
   `var/media/narrations/manifest.json` via `tools/generate-narrations.mjs`. Human recordings replace
   them for launch (6.2).
4. **Single-pass loudness normalisation** instead of the plan's two-pass `loudnorm`.
5. **No timing waveform editor UI.** The API validates and stores timings (monotonic, non-overlapping,
   sentence ids exist) and accepts `VERIFIED`; the `wavesurfer.js` editor (4.3) is not built.
6. **No auto-alignment service** (4.10); `auto_align` feature flag exists and is off.
7. **Service worker strategy** is `injectManifest` with Workbox precache, image/API runtime caches and
   `RangeRequestsPlugin`; native HLS is out of scope (ADR-010 unchanged).
8. **Offline writes**: progress is queued and replayed; save/reaction offline queueing (3.8 fully) is
   not wired.
9. **`AudioEngine` uses a plain `HTMLAudioElement`** with Media Session and Web Audio gain for
   ambience; no waveform scrubbing during playback beyond the seek bar.
10. **Video/podcast media** is out of scope; only narration and soundscape purposes are processed.

## Phase 4 — Admin console and submissions (implemented 2026-11-15)

Implemented: admin story CRUD + publish transitions with revisions/audit, narration attach/update,
tribes/categories/narrators CRUD, story-of-the-day, users admin with session revocation, feature
flags, audit log, metrics, full submission state machine and the moderation UI.

Deviations:

1. **No transactional outbox (4.5).** Audit/revision rows are written transactionally; emails remain
   synchronous.
2. **Admin uploads have no in-editor picker**: covers are uploaded through `/uploads` and attached by
   asset id (the API supports it; the UI does not yet).
3. **No `wavesurfer.js` timing editor** (see Phase 3 #5).
4. **Story editor is paragraph-text based** (blank line = paragraph) with server-side sentence
   splitting and sentence-id preservation; per-sentence manual split/merge is not exposed in the UI.
5. **Library author tab / community author pages** show seeded griots; a community author profile page
   for submission authors is not built (their tale appears once published).
6. **Submissions approval** creates a DRAFT story prefilled from the submission; it does not copy the
   cover/audio asset automatically (the editor attaches them).
7. **Moderation queue actions write audit rows**, but there is no email notification to the author on
   moderation decisions yet (task 4.6's notification emails require the outbox).
8. **RBAC**: users/flags/audit are ADMIN-only; every other admin route is EDITOR+. TOTP 2FA for
   editors is Phase 5 and not implemented.

## Phase 5 — Production hardening (implemented 2026-11-15)

Implemented in repo: Caddy security headers/CSP + routing (validated), multi-stage non-root
Dockerfiles, production compose, deploy workflows (Trivy, SBOM, approvals, rollback placeholders),
observability configs (Prometheus rules, Grafana dashboard, OTel Collector, Loki/Tempo), legal pages,
consent-gated analytics stub, security checklist, Lighthouse budgets, k6 scripts, content tooling.

Deviations/remaining:
1. **No `prom-client` metrics endpoint in the API yet** — the Prometheus scrape config expects
   `/metrics` on :9464; wiring it is a follow-up.
2. **Logs use Nest's default logger**, not `nestjs-pino`/redaction.
3. **No OTel SDK instrumentation** in the API/worker; collector/dashboards are ready.
4. **Deploy pipelines require real hosts/secrets** and are guarded placeholders for the roll/smoke/
   rollback steps.
5. **TOTP 2FA, ClamAV scanning, OWASP ZAP and a manual screen-reader pass are not done** — production
   blockers.
6. **Legal copy is a draft** and needs legal review (POPIA/NDPA/Kenya DPA/GDPR).
7. **Analytics provider is not wired**; the consent gate and event wrapper are in place.

## Phase 6 — Launch readiness (implemented 2026-11-15)

Delivered: dated launch checklist with owners/evidence, release notes draft, visual sign-off
template, content-readiness thresholds, incident-response/backup/rollback/observability/moderation
runbooks, screen-reader checklist, content lint/import tooling.

Deviations:
1. **Content thresholds are not met** (18 demo tales vs ≥60; no human recordings; no cultural review
   sign-off) — editorial work, not code.
2. **No legacy Angular app exists in this repository**, so 6.1's visual parity/legacy-deletion step is
   N/A; visual sign-off is measured against the design spec instead.
3. **Final sign-off requires humans** (design, legal, security, editorial) and real infrastructure.

## Explore atlas (added 2026-11-15, beyond the original plan)

1. **Bundled map, no tile provider.** `/explore` renders Natural Earth 1:110m country boundaries
   (public domain, via the `world-atlas` package) as generated SVG paths in
   `apps/web/src/features/explore/world-geometry.ts` (`node tools/generate-map.mjs`). No Mapbox/Google
   tiles, no API keys, no network calls and no third-party map attribution burden; the map chunk is
   lazy-loaded with the route.
2. **Curated coordinates.** `Tribe.latitude/longitude/mapPlaceLabel` are seeded from
   `content/geo.json`. Pins are cultural homelands, not borders; the page says so.
3. **Explore is a new API surface** (`GET /explore`, public + cacheable) not listed in the original
   `03-api-specification.md`; it returns publication points with tale counts and up to three featured
   tales, plus region summaries.
4. **Navigation** now has five bottom-nav destinations (Read, Explore, Publications, Library, Saved);
   the design spec was updated from four.
5. **List view** is provided alongside the map for keyboard/screen-reader parity; axe reports zero
   violations on both viewports.
