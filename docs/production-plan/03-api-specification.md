# 03 — API Specification

REST + JSON. Base path `/api/v1`. The NestJS app generates OpenAPI 3.1 from decorators; that generated document is the binding contract. This file defines the intended surface so backend and frontend agents can work in parallel.

## 1. Conventions

| Topic | Rule |
| --- | --- |
| Auth | `Authorization: Bearer <accessToken>`; refresh via `refresh_token` httpOnly cookie on `/api/v1/auth/*` |
| Casing | JSON fields `camelCase`; URL paths `kebab-case`; enum values `UPPER_SNAKE` |
| IDs | UUIDv7 strings; stories/tribes/categories also addressable by `slug` |
| Timestamps | ISO 8601 UTC strings |
| Pagination | Cursor: `?limit=20&cursor=<opaque>` → `{ items: [...], nextCursor: string \| null }`. Max `limit` 50 |
| Filtering | Query params, e.g. `?tribe=zulu&category=wisdom&q=baobab` |
| Errors | RFC 9457 Problem Details: `{ type, title, status, detail, instance, code, errors? }` where `code` is a stable machine string (e.g. `AUTH_INVALID_CREDENTIALS`) and `errors` is field-level validation `[{ field, message }]` |
| Idempotency | `Idempotency-Key` header supported on `POST /uploads`, `POST /submissions`, `POST /me/progress/*/complete` (stored in Valkey 24 h) |
| Caching | Public catalogue GETs send `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` and `ETag`. Authenticated responses send `private, no-store` |
| Rate limits | Default 120 req/min per IP+user. Auth endpoints: 10/min per IP and 5/min per email. Uploads: 20/hour per user. Headers `RateLimit-*` per IETF draft |
| Versioning | URI versioning (`/v1`). Breaking changes require `/v2` |
| Media URLs | Responses contain absolute CDN URLs for public renditions; never raw bucket keys |

### Shared response shapes

```ts
type ImageRef = {
  url: string;              // default rendition (640w webp)
  srcset: string;           // "…320.webp 320w, …640.webp 640w, …1280.webp 1280w"
  width: number; height: number;
  blurhash?: string; alt?: string;
};

type TribeSummary = { id; slug; name; region: Region; countriesLabel; image?: ImageRef; maskImage?: ImageRef; themeVariant?; publishedStoryCount: number };

type StoryCard = {
  id; slug; title; summary; moral?;
  category: { slug; name; badge };
  tribe: { slug; name };
  regionLabel: string;           // e.g. "WEST AFRICA" or "IGBO, NIGERIA"
  readTimeMinutes: number;
  listenTimeMinutes?: number;    // from default narration
  hasAudio: boolean;
  cover: ImageRef;
  accessLevel: 'FREE' | 'PREMIUM';
  viewer?: { saved: boolean; progressPercent: number; completed: boolean; reaction?: ReactionType }; // only when authenticated
};

type UserMe = {
  id; email; emailVerified: boolean; displayName; avatar?: ImageRef;
  tribe?: TribeSummary; customLineage?; lineageLabel?;
  communityRole?: CommunityRole; systemRole: SystemRole;
  locale; onboarded: boolean;
  stats: { talesRead; tribesExplored; listeningMinutes; currentStreakDays };
};
```

## 2. Endpoints

Legend: 🌐 public, 🔐 authenticated, ✍️ CONTRIBUTOR+, 🛠 EDITOR+, 👑 ADMIN.

### 2.1 Health & config

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/health/live` | 🌐 | Process up |
| GET | `/health/ready` | 🌐 | DB, Valkey, RustFS reachable |
| GET | `/config` | 🌐 | Public runtime config: feature flags, `lowStoryThreshold` (5), supported locales, reaction types with labels/meanings, community roles with labels, max upload sizes |

### 2.2 Auth (`/auth`)

| Method | Path | Access | Body / Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | 🌐 | `{ displayName, email, password, tribeId?, customLineage?, communityRole?, acceptTerms: true, acceptPrivacy: true, confirmAge13Plus: true, consentLineagePersonalisation?: boolean }`. Tribe/lineage is **optional** (sensitive data, see `08` §3); at most one of `tribeId` / `customLineage`, and either requires `consentLineagePersonalisation: true`. Password: min 10 chars, checked against HIBP k-anonymity (fail-open on timeout). Returns `{ accessToken, user: UserMe }` + refresh cookie. Sends verification email |
| POST | `/auth/login` | 🌐 | `{ email, password }` → `{ accessToken, user }` + cookie. Generic error `AUTH_INVALID_CREDENTIALS`. Progressive delay + lockout after 10 failures/15 min |
| POST | `/auth/refresh` | 🌐 (cookie) | Rotates refresh token. Requires header `X-Requested-With: ubuntu-tales` (CSRF mitigation). Reuse of a rotated token revokes the whole family |
| POST | `/auth/logout` | 🔐 | Revokes current refresh token, clears cookie |
| POST | `/auth/logout-all` | 🔐 | Revokes all refresh tokens for user |
| POST | `/auth/verify-email` | 🌐 | `{ token }` |
| POST | `/auth/verify-email/resend` | 🔐 | Rate-limited 3/hour |
| POST | `/auth/password/forgot` | 🌐 | `{ email }` — always 202 |
| POST | `/auth/password/reset` | 🌐 | `{ token, newPassword }` — revokes all sessions |
| GET | `/auth/oauth/google` / `/auth/oauth/google/callback` | 🌐 | Roadmap task 2.7 (optional) |

### 2.3 Me (`/me`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/me` | 🔐 | `UserMe` |
| PATCH | `/me` | 🔐 | `{ displayName?, tribeId?, customLineage?, lineageLabel?, communityRole?, locale?, avatarAssetId? }` |
| POST | `/me/onboarding/complete` | 🔐 | Marks onboarding done (tribe chosen) |
| PUT | `/me/password` | 🔐 | `{ currentPassword, newPassword }` |
| GET | `/me/export` | 🔐 | Starts data export job; emails a download link (privacy right of access) |
| DELETE | `/me` | 🔐 | `{ password }` → schedules anonymisation (see `02` §4) |
| GET | `/me/consents` / PUT `/me/consents` | 🔐 | Analytics / marketing consent |

### 2.4 Tribes & categories

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/tribes` | 🌐 | `?q=&region=` → `TribeSummary[]` (not paginated; < 200 rows), sorted by `sortOrder` |
| GET | `/tribes/:slug` | 🌐 | Tribe detail + `featuredStories: StoryCard[]` (6) |
| GET | `/categories` | 🌐 | `{ slug, name, badge }[]` |

The web shows the "More stories coming soon" popup when `publishedStoryCount < config.lowStoryThreshold`.

### 2.5 Discovery & stories

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/home` | 🌐 (+🔐 personalisation) | One call for the home screen: `{ storyOfTheDay: StoryCard, yourTribe?: { tribe, stories: StoryCard[] }, continueListening?: StoryCard[], categories, popular: StoryCard[] }` |
| GET | `/stories` | 🌐 | `?q=&tribe=&category=&region=&hasAudio=&sort=recent\|popular\|title&limit=&cursor=` → paginated `StoryCard` |
| GET | `/stories/search-suggestions` | 🌐 | `?q=` → up to 8 `{ type: 'story'\|'tribe', slug, label }` (search-as-you-type) |
| GET | `/stories/:slug` | 🌐 | `StoryDetail` = `StoryCard` + `body` + `attribution` + `author?` + `narrations: NarrationSummary[]` + `defaultNarration?: NarrationDetail` |
| GET | `/stories/:slug/recommendations` | 🌐 (+🔐) | 4 `StoryCard`s: same tribe or category, excluding completed, ranked by popularity |
| GET | `/stories/:slug/offline-bundle` | 🔐 | `StoryDetail` + media URLs (signed, 24 h) for the chosen rendition `?rendition=aac_64k` |
| GET | `/narrations/:id` | 🌐 | `NarrationDetail` |

```ts
type NarrationDetail = {
  id; locale; durationMs;
  narrator: { id; name; avatar?: ImageRef };
  audio: { rendition: 'aac_64k' | 'aac_128k'; url: string; sizeBytes: number }[];
  soundscape?: { slug; name; url; defaultGain: number };
  sentenceTimings?: { sentenceId: string; startMs: number; endMs: number }[];
  timingStatus: 'NONE' | 'AUTO' | 'VERIFIED';
};
```

### 2.6 Library (concept "Library" tabs)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/library/stories` | 🌐 | Same as `/stories` sorted by title — "Stories" tab |
| GET | `/library/audio` | 🌐 | Stories with a published narration — "Audio" tab; items include `durationMinutes` |
| GET | `/library/authors` | 🌐 | Stories with `authorUserId` set (community-authored), items include `author: { id, displayName }` — "Authors" tab |
| GET | `/authors/:id` | 🌐 | Public author profile: displayName, lineageLabel, communityRole, published stories |

### 2.7 User activity

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/me/saved` | 🔐 | `?filter=all\|in-progress\|offline&deviceId=` → paginated `SavedStoryItem` = `StoryCard` + `savedAt` + `narrator?` + `reflection?` (reaction) + `progressPercent` + `offlineOnThisDevice` |
| PUT | `/me/saved/:storyId` | 🔐 | Save (idempotent) |
| DELETE | `/me/saved/:storyId` | 🔐 | Unsave |
| GET | `/me/progress` | 🔐 | Continue-listening list, paginated |
| PUT | `/me/progress/:storyId` | 🔐 | `{ narrationId?, lastSentenceId?, audioPositionMs, percent, listenedDeltaSec, clientUpdatedAt }`. Ignores writes older than stored `clientUpdatedAt`. `listenedDeltaSec` capped at 60 per call and at wall-clock elapsed since last call |
| POST | `/me/progress/:storyId/complete` | 🔐 | Marks completion, updates stats; returns `{ stats, recommendations: StoryCard[] }` for the celebration screen |
| PUT | `/stories/:storyId/reactions` | 🔐 | `{ type: ReactionType }` (upsert) |
| DELETE | `/stories/:storyId/reactions` | 🔐 | Remove reaction |
| GET | `/stories/:storyId/reactions/summary` | 🌐 | Counts per type |
| POST | `/me/downloads/:storyId` | 🔐 | `{ deviceId, narrationId, rendition }` |
| DELETE | `/me/downloads/:storyId?deviceId=` | 🔐 | |
| POST | `/stories/:storyId/share` | 🌐 | `{ channel: 'copy'\|'whatsapp'\|'x'\|'facebook'\|'native' }` analytics only, returns `{ url, quote }` |

### 2.8 Submissions (community "Submit Story")

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/submissions` | 🔐 (any verified user; becomes CONTRIBUTOR on first submit) | Create DRAFT `{ title, tribeId?, customTribe?, categoryId?, bodyText, moral?, attribution?, coverAssetId?, audioAssetId?, rightsConfirmed }` |
| GET | `/submissions/mine` | 🔐 | Paginated own submissions with status |
| GET | `/submissions/:id` | 🔐 owner or 🛠 | |
| PATCH | `/submissions/:id` | 🔐 owner | Only in DRAFT / CHANGES_REQUESTED |
| POST | `/submissions/:id/submit` | 🔐 owner | Requires `rightsConfirmed=true`, body ≥ 150 words, ≤ 5,000 words |
| POST | `/submissions/:id/withdraw` | 🔐 owner | |

### 2.9 Uploads

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/uploads` | 🔐 | `{ purpose: MediaPurpose, contentType, sizeBytes, filename }` → `{ assetId, uploadUrl, method: 'PUT', headers, expiresAt }`. Purpose → allowed roles, MIME types, and max size enforced (see `04` §4) |
| POST | `/uploads/:assetId/complete` | 🔐 uploader | Verifies object via HEAD, enqueues processing → `{ status }` |
| GET | `/uploads/:assetId` | 🔐 uploader or 🛠 | `{ status, renditions?, failureReason? }` |
| GET | `/uploads/:assetId/events` | 🔐 | Server-Sent Events stream of status changes (optional; polling is acceptable) |

### 2.10 Admin (`/admin`, 🛠 unless noted)

| Method | Path | Description |
| --- | --- | --- |
| GET/POST | `/admin/stories` | List (all statuses, filters) / create draft |
| GET/PATCH | `/admin/stories/:id` | Get / update (body as paragraphs; server assigns sentence IDs) |
| POST | `/admin/stories/:id/publish` · `/unpublish` · `/archive` | State transitions; writes `StoryRevision` + `AuditLog` |
| POST | `/admin/stories/:id/narrations` | Attach narration `{ narratorId, audioAssetId, locale, soundscapeId? }` |
| PATCH | `/admin/narrations/:id` | Update timings `{ sentenceTimings, timingStatus }`, default flag, publish flag |
| POST | `/admin/narrations/:id/auto-align` | Enqueue `media.align` (phase 4) |
| CRUD | `/admin/tribes`, `/admin/categories`, `/admin/narrators`, `/admin/soundscapes` | Catalogue management |
| GET/PUT | `/admin/story-of-the-day?from=&to=` / `/admin/story-of-the-day/:date` | Schedule |
| GET | `/admin/submissions?status=` | Moderation queue |
| POST | `/admin/submissions/:id/claim` · `/request-changes` · `/approve` · `/reject` | `{ note }`; approve creates a DRAFT Story pre-filled from the submission |
| GET | `/admin/users?q=` | 👑 search users |
| PATCH | `/admin/users/:id` | 👑 `{ systemRole?, status? }` |
| GET | `/admin/audit-log` | 👑 |
| GET/PUT | `/admin/feature-flags` | 👑 |
| GET | `/admin/metrics/overview` | Stories, users, completions, listening hours (last 7/30 days) |

### 2.11 Share pages (non-JSON, outside `/api/v1`)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/share/stories/:slug` | HTML with OG/Twitter meta tags + `<meta http-equiv="refresh">` to `/stories/:slug`. Cached 10 min at CDN |

## 3. Error codes (non-exhaustive, extend in `packages/shared/src/error-codes.ts`)

`VALIDATION_FAILED`, `AUTH_INVALID_CREDENTIALS`, `AUTH_EMAIL_TAKEN`, `AUTH_TOKEN_EXPIRED`, `AUTH_REFRESH_REUSED`, `AUTH_ACCOUNT_LOCKED`, `AUTH_EMAIL_NOT_VERIFIED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `UPLOAD_TOO_LARGE`, `UPLOAD_TYPE_NOT_ALLOWED`, `UPLOAD_NOT_FOUND_IN_STORAGE`, `SUBMISSION_INVALID_STATE`, `STORY_NOT_PUBLISHABLE`, `ENTITLEMENT_REQUIRED`.

## 4. Client generation

- `apps/api` exposes `pnpm --filter api openapi:emit` → writes `packages/api-client/openapi.json` without starting a server (uses `SwaggerModule.createDocument` on a test app).
- `packages/api-client` runs `orval` to generate `src/generated/*` (TanStack Query hooks + Zod schemas). Generated code is committed.
- CI fails if `openapi.json` or generated code is out of date (`pnpm api-client:check`).
- The Axios/fetch mutator in `packages/api-client/src/http.ts` attaches the in-memory access token, handles 401 → single-flight refresh → retry once, and maps Problem Details to a typed `ApiError`.
