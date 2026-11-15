# 00 — Overview and Decisions

## 1. What Ubuntu Tales is

A mobile-first app for discovering, reading, and listening to African folktales, organised by tribe/people and region. Users pick their "roots" (tribe), read stories with read-along highlighting, listen to narrated audio with ambient soundscapes, save stories (including offline), react emotionally after finishing a tale, share wisdom quotes, and submit their own folktales to a community library.

Tagline: *"Umuntu ngumuntu ngabantu" — A person is a person through other persons.*

## 2. Audit of the concept app (what exists today)

The concept is an Angular 22 SSR app in `src/`. It is a high-fidelity UI prototype with no real backend.

| Concept screen (component) | What it shows | What is fake |
| --- | --- | --- |
| `onboarding` | Welcome hero, "Join tribe" / "Skip" | — |
| `tribe-selection` | "Choose your roots" tribe grid with search; popup when a tribe has fewer than 5 stories | Tribes and story counts are hardcoded |
| `home` | Header, search with keyword chips, Story of the Day hero, "Your tribe" section, category filter (All/Animal/Trickster/Wisdom/Folklore), story list | All stories hardcoded in `home.ts` |
| `read-mode` | Story text split into sentences with the active sentence highlighted, font size cycling, bookmark, mini player, finish button | One hardcoded story; highlighting not tied to audio |
| `player` | Full audio player: play/pause, ±15s skip, seek, speed (0.75x–2x), soundscape toggle, "Read story" | No audio file; timer values are fake |
| `celebration` | "Ubuntu!" end-of-story screen, emotion reactions (Joy, Great, Good, Thinking, Happy), recommendations, Share Wisdom modal | Reactions not stored; recommendations hardcoded; share does nothing |
| `library` | Tabs: Stories / Audio / Authors; 4-column grid; infinite scroll; "Submit Story" modal | Infinite scroll appends fake items; submissions stored in memory |
| `saved` | Saved stories with filters All / In progress / Offline, progress %, reflection tag, narrator | Fully hardcoded |
| App shell (`app.ts`) | Bottom nav, side drawer, profile modal (stats: tales read, tribes explored, listening time), login/signup modal with tribe + community role, toasts | Auth is `localStorage` with plaintext passwords and seed users; navigation is a `signal`, not a router (no URLs, no deep links) |

Assets: ~14 JPEGs in `public/assets/images`. Design tokens in `src/styles.css` (terracotta/saffron palette, Lora + DM Sans fonts, 8px spacing grid). ~4,100 lines of component CSS that define the visual spec.

### Key gaps to production

1. No backend, database, or persistent storage.
2. Insecure fake auth (plaintext passwords, auto-login as a seed user).
3. No routing/URLs — nothing is linkable or shareable.
4. No real audio, no audio-text synchronisation.
5. No content management or moderation for submitted stories.
6. No offline support despite "Offline ready" UI.
7. No tests beyond scaffolded specs, no CI, no deployment, no observability.

## 3. Goals

- Real accounts, profiles (tribe/lineage, community role), and statistics.
- A content catalogue of tribes, stories, narrations, and media served from PostgreSQL and RustFS.
- Read-along: sentence highlighting driven by real audio timestamps.
- Reading/listening progress synced across devices; saved stories; offline downloads.
- Community submissions with an editorial moderation workflow.
- Admin/editor console to manage content.
- Shareable story URLs with rich previews.
- Installable PWA, fast on low-end Android devices and slow mobile networks (primary audience: African mobile users).
- Production operations: CI/CD, backups, monitoring, security hardening, privacy-law compliance.

## 4. Non-goals for v1

- Native iOS/Android apps (the PWA covers v1; the API is designed so native apps can follow).
- Payments/subscriptions (data model leaves room for it; see ADR-012).
- Social features beyond reactions and sharing (no comments, follows, or DMs in v1).
- Machine translation of stories. Multi-language *content* is modelled but only English is populated at launch.

## 5. Technology stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Monorepo | pnpm workspaces + Turborepo | Shared types, one CI pipeline |
| Frontend | React 19, Vite, TypeScript | SPA + PWA |
| Routing | TanStack Router (file-based, type-safe) | Typed params/search params for filters |
| Server state | TanStack Query | Caching, pagination, optimistic updates |
| Client state | Zustand | Audio player, UI chrome (drawer, modals) |
| Forms | React Hook Form + Zod | |
| Styling | CSS Modules + global design tokens (ported from `src/styles.css`) | 1:1 port of concept CSS; no utility-framework rewrite |
| UI primitives | Radix UI (Dialog, Tabs, Slider, DropdownMenu) | Accessibility for modals, tabs, seek bar |
| PWA / offline | `vite-plugin-pwa` (Workbox) + IndexedDB (`idb-keyval`) | Offline saved stories and audio |
| i18n | `react-i18next` | English at launch; ready for isiZulu, Yoruba, Swahili, etc. |
| Backend | NestJS 11 (Node 22 LTS), Fastify adapter | |
| ORM | Prisma 6 | Typed client, migrations |
| Database | PostgreSQL 17 | With `pg_trgm` and `unaccent` extensions for search |
| Cache / queues | Valkey 8 (Redis-compatible) + BullMQ | Jobs, rate limiting, caching |
| Object storage | RustFS (S3-compatible) | Accessed with AWS SDK v3 |
| Media processing | `ffmpeg` (audio), `sharp` (images) in a worker | |
| Read-along alignment | WhisperX/aeneas forced alignment (Python sidecar, phase 4) with manual editor fallback | |
| Email | Nodemailer via SMTP provider (Resend / Postmark / SES); Mailpit in dev | |
| API contract | `@nestjs/swagger` → OpenAPI 3.1 → `orval` generated TanStack Query client | |
| Validation | `class-validator` DTOs on API; Zod on web forms | |
| Auth | Email + password (argon2id), JWT access token + rotating refresh token in httpOnly cookie; Google OAuth as optional roadmap task 2.7 | |
| Testing | Vitest (web + api, api via `unplugin-swc`), React Testing Library, MSW, Supertest, Testcontainers, Playwright | |
| Observability | `pino` logs, OpenTelemetry traces, Prometheus metrics, Grafana, Sentry (web + api) | |
| Product analytics | PostHog (self-hosted or EU cloud), consent-gated | |
| CI/CD | GitHub Actions → GHCR images | Repo is on GitHub (`kodesta/ubuntu-tales`) |
| Runtime | Docker containers; Docker Compose on VMs for v1, Kubernetes-ready | |
| Edge | Caddy (TLS, reverse proxy) + Cloudflare CDN/WAF | |

## 6. Architectural Decision Records

Each ADR is short; change them only with a PR that explains why.

### ADR-001 — Monorepo with pnpm + Turborepo
Frontend, backend, worker, and shared packages live in one repo so the generated API client and shared constants stay in lockstep. Layout is in `01-architecture.md`.

### ADR-002 — React SPA (Vite) instead of SSR framework
The app is behind-login-heavy, mobile, and offline-first; an SPA with a service worker is the simplest model for offline. SEO/social previews are only needed for public story pages and are served by the API's lightweight share-page renderer (ADR-009). Revisit if organic search becomes a growth channel.

### ADR-003 — NestJS modular monolith + separate worker process
One deployable API (`apps/api`) organised by domain modules, plus one worker (`apps/worker`) that runs BullMQ processors (media transcoding, emails, alignment). Both share code via `packages/*` and Nest libraries. No microservices.

### ADR-004 — PostgreSQL as the single system of record
Includes full-text search (`tsvector` + `pg_trgm`) instead of Elasticsearch/Meilisearch. Revisit at >50k stories or when multilingual fuzzy search becomes a requirement.

### ADR-005 — Prisma as ORM
Best agent ergonomics, typed queries, reliable migrations. Raw SQL (`$queryRaw`) is allowed for search and statistics.

### ADR-006 — RustFS for all binary assets, accessed only via S3 API
The app never touches the RustFS filesystem directly. Any S3-compatible store (AWS S3, Cloudflare R2, MinIO) must be a drop-in replacement by changing env vars. Browsers upload via presigned PUT URLs and read published media via the CDN. Details in `04-file-storage-rustfs.md`.

### ADR-007 — Session model: short JWT + rotating refresh cookie
Access token (15 min) held in memory on the client, sent as `Authorization: Bearer`. Refresh token (30 days, rotating, reuse-detection) stored hashed in Postgres and sent as an `httpOnly; Secure; SameSite=Lax` cookie scoped to `/api/v1/auth`. No tokens in `localStorage`.

### ADR-008 — Two distinct "role" concepts
The concept app's "role" (Storyteller, Seeker, Writer, Elder/Guardian) is a **community identity badge**, not a permission. Model it as `User.communityRole`. Permissions use a separate `User.systemRole` enum: `READER`, `CONTRIBUTOR`, `EDITOR`, `ADMIN`. Never derive permissions from `communityRole`.

### ADR-009 — Shareable URLs and social previews
Every story has a stable slug URL `/stories/:slug`. The API serves `GET /share/stories/:slug` (HTML with Open Graph tags + redirect to the SPA) so links shared on WhatsApp/X/Facebook render previews. Caddy routes crawler user agents for `/stories/*` to this endpoint.

### ADR-010 — Audio delivered as progressive AAC, not HLS (v1)
Stories are 4–10 minutes. Two AAC (`.m4a`) renditions — 64 kbps (data saver) and 128 kbps — served with HTTP range requests through the CDN are simpler and work offline. HLS can be added later without changing the data model (`AudioRendition` table).

### ADR-011 — Story content stored as structured JSON
Story body is stored as `paragraphs[] → sentences[]` (JSONB) with stable sentence IDs, so read-along timestamps (`startMs`, `endMs`) can be attached per narration. Editors author in a simple paragraph editor; the API splits sentences server-side.

### ADR-012 — Free at launch, entitlement-ready
Every story has `accessLevel: FREE | PREMIUM` (all `FREE` at launch). Media access checks go through one `EntitlementsService` so a subscription can be added later without touching controllers.
