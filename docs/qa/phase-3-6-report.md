# Ubuntu Tales — Phases 3–6 report

**Scope:** audio/read-along/offline (Phase 3), editorial console and submissions (Phase 4),
production hardening (Phase 5), launch readiness (Phase 6).

## Verdict

**Functional GO for the software; NOT launch-ready as a public product.** Every phase is implemented
and verified locally. The remaining items are inherently environment-, legal- or human-dependent
(recordings, cultural review, DNS/TLS, ZAP, 2FA/ClamAV, backups drill, screen-reader pass) and are
listed as blockers in `docs/launch/launch-checklist.md`.

## What was delivered

### Phase 3 — audio, read-along, offline
- Local media pipeline: upload tickets (`POST /uploads`), raw PUT with MIME/size/magic-byte checks,
  `sharp` image renditions (w320/w640/w1280, avatars, 40MP limit, EXIF stripped), `ffmpeg` audio
  validation + AAC 64k/128k encoding, `GET /uploads/:id`.
- Narration model + seeding from a generated manifest (6 tales, real sentence timings), public
  `GET /narrations/:id`, `hasAudio`/`listenTimeMinutes`/`defaultNarration` on story detail,
  `/library/audio`.
- Offline bundle endpoint, per-device downloads, `filter=offline` on `/me/saved`.
- Media served read-only at `/media/**` with HTTP Range (206 verified).
- Web: `AudioEngine`, persisted player store, mini player, full `/stories/$slug/listen` player
  (seek/speed/soundscape/keyboard/Media Session), read-along highlighting with auto-scroll and
  tap-to-seek, 15s audio progress sync with real listened deltas.
- PWA: `vite-plugin-pwa` + custom service worker (precache, image/API runtime caches, range plugin,
  offline navigation fallback), manifest + maskable icons, offline banner.
- Offline downloads: bundle + cover + audio in Cache Storage, download/remove UI, queued progress
  outbox replay.
- Tests: player/read-along/rendition/offline logic (web), timing/body-merge/media policy (api).

### Phase 4 — admin console and submissions
- Admin API: story CRUD with sentence-id preservation, publish/unpublish/archive (+ revisions,
  audit log, tribe counts), narration attach/update with timing validation, tribes/categories/
  narrators CRUD, story-of-the-day calendar, users admin (role/suspension with session revocation),
  feature flags, audit log, metrics overview.
- Submissions: state machine (DRAFT → SUBMITTED → IN_REVIEW → APPROVED/REJECTED, changes-requested
  loop), events, ownership privacy (404 not 403), contributor upgrade, admin queue actions,
  approval creates a draft story.
- Web: `/submit` with local draft autosave and word-count/rights validation, `/me/submissions`,
  role-guarded `/admin` with dashboard, story list/editor, moderation queue, calendar, flags,
  users and audit views; drawer links.

### Phase 5 — production hardening
- Caddy edge: HSTS, CSP, COOP/CORP, Referrer/Permissions policies, immutable asset caching, media
  range pass-through, crawler routing for share previews (validated with `caddy validate`).
- Multi-stage non-root Dockerfiles for API (ffmpeg, tini, read-only FS, healthcheck) and web.
- Production compose with secrets via env, read-only containers, media volume.
- Deploy workflows (staging on main, production on tags) with Trivy scans, SBOM/provenance,
  approval gates and rollback placeholders.
- Observability: Prometheus scrape + alert rules, Grafana dashboard, OTel Collector, Loki/Tempo
  compose profile, runbooks.
- Security/privacy: checklist mapped to evidence, `security.txt`, legal pages (terms, privacy,
  community guidelines, copyright), consent-gated analytics stub, cookie/storage disclosure.
- Quality tooling: Lighthouse CI budgets, bundle analysis (initial JS 168.3 KB gzip ≤ 170 KB),
  k6 catalogue + media scripts, screen-reader checklist, WebKit/Firefox notes.
- Content tooling: `pnpm content:lint` (passes, 16 publication-content warnings) and
  `pnpm content:import`.

### Phase 6 — launch readiness
- Dated launch checklist with owners/evidence and explicit blockers.
- Release notes, visual sign-off template, content-readiness thresholds, incident-response runbook,
  runbook index, moderation runbook, backup/restore, rollback and observability runbooks.

## Verification performed

| Check | Result |
| --- | --- |
| Build/lint/typecheck/test (workspace) | pass (see final gate output) |
| Upload image → READY with renditions | pass (900×600 → w320/w640 webp) |
| Upload wrong MIME rejected | pass (400 VALIDATION_FAILED) |
| Media full + Range | pass (200 / 206, 1,024 bytes) |
| Narration detail + timings | pass (46 timings, public) |
| Offline bundle + downloads + saved filter | pass |
| Audio progress with real listened seconds | pass |
| Player plays and position advances | pass (0 → 2,308 ms in headless Chromium) |
| Read-along highlight appears | pass (1 active sentence) |
| Offline download writes bundle + caches | pass (`ut.bundle.*`, cache audio+cover, server download row) |
| Admin metrics/stories/moderation/flags | pass (editor), reader gets 403, admin gets audit |
| Submission create → submit → claim → approve → draft story | pass (`SUBMITTED → IN_REVIEW → APPROVED`) |
| Caddyfile validation | pass (`Valid configuration`) |
| Prod compose config | pass (`docker compose config`, warnings only for unset env) |
| Content lint | pass with publication-content warnings |
| Bundle budget | pass (168.3 KB initial JS gzip, budget 170) |

## Known issues (non-blocking for this slice)

| ID | Severity | Area | Note |
| --- | --- | --- | --- |
| P36-1 | Low | Bundle | Initial JS at 168.3 KB gzip — close to the 170 KB budget; split the admin/editor bundles further before adding features. |
| P36-2 | Low | Audio | `AudioEngine` uses single-pass `loudnorm`; plan asks for two-pass. Quality only. |
| P36-3 | Medium | Narration timing editor | The console accepts verified timings via API but has no waveform editor (roadmap 4.3's `wavesurfer.js` UI). Editors currently attach timings programmatically. |
| P36-4 | Medium | Media | Local-disk storage instead of RustFS/S3; the `StorageService` seam is ready for the swap. |
| P36-5 | Medium | Email | Emails are sent synchronously; no outbox/queue (roadmap 4.5). |
| P36-6 | Low | Admin | No image picker for covers in the editor; covers are set through the upload API. |
| P36-7 | Low | Offline | Offline outbox covers progress writes; saves/reactions offline queue is not wired (plan 3.8). |
| P36-8 | Low | WebKit/iOS | Audio + range requests verified in Chromium only; manual iOS pass required. |

## Production-only blockers (tracked in the launch checklist)

Recorded narration voices and ≥60 reviewed tales; legal review of policies; DNS/TLS/domain; OWASP ZAP
on staging; TOTP 2FA and ClamAV; backup restore drill; manual screen-reader pass; Sentry/status page;
load test against production-shaped staging; `/metrics` exporter wiring.
