# 05 — Backend Implementation (NestJS)

## 1. Apps and runtime

- Node.js 22 LTS, NestJS 11, Fastify adapter (`@nestjs/platform-fastify`), TypeScript strict, ESM-compatible build via SWC.
- `apps/api` — HTTP server.
- `apps/worker` — `NestFactory.createApplicationContext` (no HTTP except a tiny health/metrics server on `:9464`), runs BullMQ processors.
- Shared Nest code lives in `apps/api/src` modules exported for the worker via TS path aliases **or**, preferably, in `packages/*` (db, storage, shared). Do not import from `apps/api` into `apps/worker`; move shared code to a package instead.

## 2. Module layout (`apps/api/src`)

```
src/
├── main.ts                      # bootstrap: Fastify, helmet, CORS, cookies, versioning, swagger, shutdown hooks
├── app.module.ts
├── config/                      # Zod env schema, typed ConfigService
├── common/
│   ├── auth/                    # JwtAuthGuard, RolesGuard, @Public(), @Roles(), @CurrentUser()
│   ├── errors/                  # AppException, ProblemDetailsFilter, error codes
│   ├── pagination/              # cursor encode/decode, PaginatedDto<T>
│   ├── interceptors/            # logging, cache-control, etag
│   ├── idempotency/             # Idempotency-Key interceptor (Valkey)
│   └── validation/              # global ValidationPipe config
├── infra/
│   ├── prisma/                  # PrismaService (from packages/db), transaction helper
│   ├── redis/                   # Valkey connection
│   ├── queue/                   # BullMQ producers (typed job payloads from packages/shared)
│   ├── storage/                 # Nest provider wrapping packages/storage
│   └── mail/                    # MailService interface (actual sending happens in worker)
├── modules/
│   ├── health/
│   ├── config-public/           # GET /config, feature flags
│   ├── auth/                    # register, login, refresh, logout, verify, reset, oauth
│   ├── users/                   # /me, profile, consents, export, delete
│   ├── tribes/
│   ├── categories/
│   ├── stories/                 # catalogue, search, detail, recommendations, offline bundle
│   ├── home/                    # aggregated home endpoint
│   ├── library/
│   ├── narrations/
│   ├── activity/                # saved, progress, reactions, downloads, stats
│   ├── submissions/
│   ├── uploads/                 # presign, complete, status
│   ├── share/                   # OG HTML pages
│   ├── entitlements/
│   └── admin/                   # admin controllers per resource; reuse domain services
└── openapi.ts                   # emits openapi.json without listening
```

Each domain module contains: `*.controller.ts`, `*.service.ts`, `dto/` (class-validator + `@nestjs/swagger` decorators), `*.mapper.ts` (Prisma → DTO), and `*.spec.ts`. Controllers are thin; business rules live in services; Prisma access only in services (no repository layer — Prisma is the repository).

## 3. Cross-cutting implementation details

### 3.1 Configuration
- `config/env.schema.ts` defines every env var with Zod (types, defaults, required-in-prod). Boot fails fast with a readable error list.
- Key vars: `NODE_ENV`, `PORT`, `APP_URL`, `API_URL`, `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET` (or `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` for EdDSA), `JWT_ACCESS_TTL=900`, `REFRESH_TTL_DAYS=30`, `COOKIE_DOMAIN`, `CORS_ORIGINS`, S3 vars (see `04` §8), `SMTP_*`, `MAIL_FROM`, `SENTRY_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `HIBP_ENABLED`, `GOOGLE_CLIENT_ID/SECRET` (task 2.7), `SEED_DEV_PASSWORD`.

### 3.2 Authentication
- Passwords: `argon2id` (`@node-rs/argon2`), memoryCost 19 MiB, timeCost 2, parallelism 1. Rehash on login if params change.
- Access token: JWT signed with EdDSA (Ed25519) via `jose`; claims `sub`, `role` (systemRole), `sv` (session version), `iat`, `exp` (15 min), `iss`, `aud`.
- Refresh token: 32 random bytes base64url; DB stores `sha256(token)`; cookie `refresh_token`, `HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth; Max-Age=30d`.
- Rotation with reuse detection: on refresh, if the presented token is already revoked → revoke every token in its `familyId` and return `AUTH_REFRESH_REUSED`.
- `User.status != ACTIVE` blocks login and refresh. Suspension increments a `sessionVersion` cached in Valkey so existing access tokens are rejected within one request.
- Login brute-force protection: Valkey counters per email and per IP; after 5 failures add 1–4 s delay, after 10 lock for 15 min (`AUTH_ACCOUNT_LOCKED`), email the user.
- Email verification required to submit stories and upload; not required to read, save, or track progress.

### 3.3 Authorization
- Global `JwtAuthGuard` (all routes protected unless `@Public()`), optional-auth routes use `@OptionalAuth()` to personalise public responses.
- `RolesGuard` with `@Roles(SystemRole.EDITOR)`; role hierarchy READER < CONTRIBUTOR < EDITOR < ADMIN.
- Ownership checks in services (e.g. submission owner) — never trust IDs from the client without a `where: { id, authorId: user.id }`.

### 3.4 Validation and errors
- Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- All thrown domain errors are `AppException(code, status, detail?)`; `ProblemDetailsFilter` maps them, Prisma `P2002` → `CONFLICT`, `P2025` → `NOT_FOUND`, and unknown errors → 500 with no internals leaked (logged + Sentry).

### 3.5 Pagination
Cursor = base64url of `{ sortValue, id }`. Queries use `(sortValue, id) < (:sortValue, :id)` keyset pagination with a composite index. Never use `OFFSET` for user-facing lists.

### 3.6 Caching
- Public catalogue endpoints: response cached in Valkey for 60 s keyed by normalised query, invalidated by tag (`tribes`, `stories`, `home`) on admin writes.
- `ETag` (weak, hash of payload) on `GET /stories/:slug`; respond `304` when matched.
- Personalised overlays (`viewer` field) are computed per request and merged into cached public data — never cache personalised payloads.

### 3.7 Background jobs (BullMQ)
- Typed job contracts in `packages/shared/src/jobs.ts`:

```ts
export type JobMap = {
  'media.image':   { assetId: string };
  'media.audio':   { assetId: string };
  'media.align':   { narrationId: string };
  'email.send':    { template: EmailTemplate; to: string; data: Record<string, unknown>; locale: string };
  'stats.recompute': { userId?: string };          // nightly for all, or single user
  'stories.popularity': {};                        // nightly
  'maintenance.cleanupUploads': {};                // hourly
  'maintenance.orphanSweep': {};                   // monthly
  'users.anonymise': { userId: string };           // 30 days after DELETE /me
  'users.export':  { userId: string; jobId: string };
};
```

- Repeatable jobs are registered by the worker on boot (idempotent `upsertJobScheduler`).
- Every job payload carries `requestId` for trace correlation.
- Use the **transactional outbox** pattern for jobs that must not be lost when a DB transaction commits (e.g. "submission approved → email author"): write an `OutboxEvent` row inside the transaction; a worker poller publishes to BullMQ and marks it sent. (Add the `OutboxEvent` model in roadmap task 4.5.)

### 3.8 Email
- Templates in `apps/worker/src/email/templates` using React Email (`@react-email/components`), rendered to HTML + text.
- Templates: `verify-email`, `reset-password`, `password-changed`, `account-locked`, `submission-received`, `submission-changes-requested`, `submission-approved`, `submission-rejected`, `story-published`, `data-export-ready`, `account-deleted`.
- Dev uses Mailpit (`http://localhost:8025`).

### 3.9 Business rules to implement (reference for services)

**Home (`GET /home`)**
- `storyOfTheDay`: `StoryOfTheDay` for today's date in `Africa/Johannesburg` (configurable `EDITORIAL_TZ`); fallback = deterministic pick by `hash(date) % publishedCount` among featured stories.
- `yourTribe`: if user has `tribeId`, 6 latest published stories of that tribe; if fewer than 3, pad with same-region stories.
- `continueListening`: up to 5 `ReadingProgress` rows with `percent` between 1 and 95, newest first.
- `popular`: top 10 by `popularityScore`.

**Popularity score (nightly):** `completions_30d * 3 + saves_30d * 2 + reactions_30d + starts_30d * 0.5`, time-decayed (half-life 14 days).

**Progress & stats**
- `percent` is computed client-side but clamped server-side to 0..100.
- Completion when client calls `/complete` **or** percent ≥ 95.
- On first completion of a story: `talesRead += 1`; recompute `tribesExplored` = distinct tribe count of completed stories ∪ user's own tribe.
- `listenedDeltaSec` increments `UserStats.listeningSeconds` and `ListeningDaily`; reject deltas > 60 or larger than real elapsed time since the previous update (prevent stat inflation).
- Streak: consecutive days in `ListeningDaily` or completions, computed in the user's timezone offset sent as `X-Timezone` header.

**Recommendations:** exclude completed stories; candidates = same tribe ∪ same category ∪ same region; score = popularity + 2 if same category + 1 if same tribe; return 4. (Post-launch: replace with co-completion collaborative filtering.)

**Submissions:** transitions validated by a small state machine (`submission.state-machine.ts`) with an exhaustive transition table and unit tests for every allowed/denied transition. Approving creates a DRAFT `Story` (body split into sentences, `authorUserId` = submitter, `attribution` from submission), links `publishedStoryId`, and grants `CONTRIBUTOR` role. Publishing that story transitions the submission to `PUBLISHED` and emails the author.

**Share page:** escape all interpolated values (use a tiny template with explicit HTML escaping); `og:image` = `og_1200x630` rendition; `og:description` = moral or summary.

## 4. Worker app (`apps/worker/src`)

```
src/
├── main.ts                 # application context + health/metrics server
├── worker.module.ts
├── processors/
│   ├── media-image.processor.ts
│   ├── media-audio.processor.ts
│   ├── media-align.processor.ts
│   ├── email.processor.ts
│   ├── stats.processor.ts
│   ├── maintenance.processor.ts
│   └── users.processor.ts
├── media/                  # sharp + ffmpeg wrappers (pure functions, unit-tested with fixtures)
├── email/templates/
└── outbox/                 # outbox poller
```

Docker image includes `ffmpeg` (static build) and `sharp` prebuilt binaries for linux/amd64 and linux/arm64.

## 5. Observability in code
- `nestjs-pino` with redaction of `authorization`, `cookie`, `password`, `token`, `email` (hash emails in logs).
- OpenTelemetry Node SDK auto-instrumentation (http, fastify, pg/prisma, ioredis, aws-sdk); BullMQ job spans linked to the enqueuing request.
- Prometheus metrics via `prom-client`: HTTP latency histogram by route, job durations/failures by queue, auth failures, upload sizes.
- Sentry with `tracesSampleRate` 0.1 in prod; scrub PII.

## 6. Coding conventions
- DTO classes end in `Dto`; response DTOs in `dto/responses`. Every DTO property has `@ApiProperty` so OpenAPI is complete.
- Services return domain objects; controllers map with mappers. No Prisma types in controller signatures.
- Use `prisma.$transaction` for any multi-write operation; pass `tx` explicitly to helper methods.
- No `console.log`; use the injected `Logger`.
- Dates handled with native `Date` + `date-fns-tz` where timezone math is needed.
- Every endpoint has at least one e2e test (Supertest against a Testcontainers Postgres) covering success, auth failure, and validation failure.
