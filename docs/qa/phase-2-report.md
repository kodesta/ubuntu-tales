# Ubuntu Tales — Phase 2 QA report

**Slice:** Phase 2 — accounts and personal features (auth, `/me`, saved sync, reading progress,
stats, reactions, profile/settings)
**Report date:** 2026-11-15 (Africa/Johannesburg)
**Author:** qa-verifier
**Verdict: GO for launch of this slice** — the Phase 1 suite stays green, the new Phase 2 journeys
pass on desktop and mobile, the session/security contract probe is 63/63, axe-core reports **0
violations across 34 route × viewport scans**, and four defects found during QA (two functional, one
accessibility, one missing gate wiring) were fixed and re-verified. No open blockers remain.

---

## 1. Environment

| Item                     | Value                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Workspace                | `/home/photon/ubuntu-tales` (pnpm workspace + Turborepo)                                                             |
| Node / pnpm              | v24.18.0 / 10.34.9                                                                                                   |
| API                      | NestJS 11 + Fastify, `http://localhost:4100/api/v1` (health `…/health/live`, `…/health/ready`)                       |
| Web                      | Vite 6 dev server, `http://localhost:5173` (proxies `/api` → `:4100`)                                                |
| Email                    | Mailpit SMTP/UI on `:8025` (tests use the non-production `devEmailToken`/`devResetToken` instead)                    |
| Database                 | PostgreSQL 17 (Docker `ut-postgres`, host port 5433), seeded catalogue + `phase2_accounts` migration                 |
| Seed users               | `kwame@`, `thandiwe@`, `tendai@`, `amina@`, `admin@`, `editor@ubuntutales.local`, password `ubuntu-tales-dev`        |
| Browser                  | Playwright 1.65.1, vendored Chromium 1255 in `.playwright-browsers/`                                                 |
| Accessibility            | axe-core 4.14.0 via `@axe-core/playwright`                                                                           |
| Viewports                | 390×844 (Pixel 7 emulation) and 1440×900 (Desktop Chrome)                                                            |
| Session shape under test | 15-minute HS256 bearer access token in memory + rotating httpOnly refresh cookie (`Path=/api/v1/auth`, SameSite=Lax) |

Servers were already running (Lead-managed); this QA pass did not start or stop them. The dev
database intentionally accumulates disposable `qa*@ubuntutales.local` accounts between runs; seeded
users are used read-only.

## 2. Commands run

```bash
# workspace gates
pnpm build && pnpm lint && pnpm typecheck && pnpm test

# full end-to-end suite (Phase 1 regression + Phase 2), desktop + mobile
PLAYWRIGHT_BROWSERS_PATH=$PWD/.playwright-browsers pnpm exec playwright test

# API contract smoke (guest catalogue + auth/personal)
bash e2e/scripts/api-smoke.sh | tee docs/qa/api-smoke.log

# security / session contract probe
node e2e/scripts/phase2-security.mjs | tee docs/qa/phase2-security.log

# accessibility + layout evidence (Phase 1 + Phase 2 routes)
node e2e/scripts/axe-audit.mjs
node e2e/scripts/layout-audit.mjs

# Phase 2 screenshots (auth + account surfaces)
node e2e/scripts/capture-phase2-screenshots.mjs
```

Exact prerequisites and per-spec commands: [`e2e/README.md`](../../e2e/README.md).

## 3. Pass/fail matrix

| Area                      | Check                                                                                   | Result                                             | Evidence                                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Build                     | `pnpm build`                                                                            | **PASS**                                           | 5/5 turbo tasks, exit 0                                                                                                               |
| Lint                      | `pnpm lint`                                                                             | **PASS**                                           | 8/8 tasks, exit 0                                                                                                                     |
| Types                     | `pnpm typecheck`                                                                        | **PASS**                                           | 8/8 tasks, exit 0                                                                                                                     |
| Unit/integration          | `pnpm test`                                                                             | **PASS**                                           | 274/274 tests across 42 Vitest files (shared 5, api 131, web 138)                                                                     |
| E2E (Phase 1 regression)  | existing suite, desktop + mobile                                                        | **PASS**                                           | 34/34 journeys per project (68 total), including all Phase 1 specs                                                                    |
| E2E (Phase 2)             | auth, merge, saved/progress/reactions, profile/settings, console, a11y                  | **PASS**                                           | 24/24 journeys per project (48 total)                                                                                                 |
| E2E totals                | full suite, both projects                                                               | **PASS**                                           | **116/116 passed** (58 journeys × 2 viewports; 0 failed, 0 flaky, 0 skipped)                                                          |
| Security/session contract | 63 assertions (cookies, CSRF, rotation/reuse, lockout, invalidation, caps, idempotency) | **PASS**                                           | 63/63 — [`phase2-security.log`](./phase2-security.log)                                                                                |
| API contract              | curl smoke, 37 assertions (Phase 1 + auth/personal)                                     | **PASS**                                           | 37/37 — [`api-smoke.log`](./api-smoke.log)                                                                                            |
| Accessibility             | axe-core, 17 routes × 2 viewports                                                       | **PASS**                                           | **0 violations** (0 serious/critical/moderate/minor) — [`axe-summary.md`](./axe-summary.md), [`axe-results.json`](./axe-results.json) |
| Console                   | signed-in journey + guest boot                                                          | **PASS**                                           | 0 JS errors, 0 console errors (expected guest boot `/auth/refresh` 401 network noise filtered), 0 warnings                            |
| Layout                    | 18 routes × 2 viewports                                                                 | **PASS**                                           | 0 horizontal overflow, 0 broken images, both fonts loaded — [`layout-audit.json`](./layout-audit.json)                                |
| Screenshots               | 8 Phase 2 surfaces × 2 viewports                                                        | **PASS**                                           | 16 PNGs + contact sheet — [`screenshots/phase-2/index.html`](./screenshots/phase-2/index.html)                                        |
| Design conformance        | review vs `docs/design/substack-experience.md`                                          | **PASS (with one low-severity touch-target item)** | §7 below                                                                                                                              |

## 4. End-to-end suite

The Phase 1 suite remains in place and green; Phase 2 adds six spec files. Tests are independent
(fresh browser context + seeded state per test), single worker, config reporters produce
`playwright-report/` and `test-results/results.json`.

### Phase 2 journeys

| Spec                          | Journeys                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `phase2-auth.spec.ts` (7)     | signup with optional roots + community role + consents → dev-token email verification → personalised home; login → reload keeps session, cookie attributes, **no bearer/JWT in localStorage or sessionStorage**, logout clears cookie; wrong password vs unknown email produce the same calm error; forgot password → dev reset token → choose new password → sign in with it; signed-out `/profile` → login redirect resume; verification banner + resend + verified state; client-side signup validation |
| `phase2-merge.spec.ts` (1)    | guest roots + saved tale + 40 % reading place → guest `/saved` "Sign in to keep this list on every device" → AuthModal sign-in → modal closes back on `/saved`, merged tale listed on the account, roots on profile, reading place restored in the reader, guest-only local keys cleared                                                                                                                                                                                                                   |
| `phase2-personal.spec.ts` (4) | saved sync across two browser contexts (save in A → visible in B → unsave in B → gone in A); reading progress synced and resumed in a new context; finish → completion screen with account stats ("That is 1 tale read on your account.") and public reaction count line; switching reactions keeps the public total stable                                                                                                                                                                                |
| `phase2-profile.spec.ts` (3)  | profile name/roots/community-role edit persists (API + UI); settings password change keeps this device signed in and revokes the other session, then sign-out-everywhere ends this one; wrong current password renders a field error                                                                                                                                                                                                                                                                       |
| `phase2-console.spec.ts` (1)  | signed-in journey login → home → saved → library → tribes → reader (scroll) → profile → settings → account menu → sign out with zero JS/console errors                                                                                                                                                                                                                                                                                                                                                     |
| `phase2-a11y.spec.ts` (8)     | axe on `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/profile`, `/settings`, signed-in home, signed-in `/saved`                                                                                                                                                                                                                                                                                                                                                                               |

### Phase 1 regression

All 34 Phase 1 journeys still pass on both projects after the Phase 2 header/account changes
(onboarding, home/search, publications, reader, library, saved, author, 404, Phase 1 axe, console).

## 5. Security / session contract (63/63 assertions)

[`phase2-security.log`](./phase2-security.log) — every assertion passed. Highlights:

| Area                       | Verified                                                                                                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Refresh cookie             | `refresh_token` is httpOnly, SameSite=Lax, `Path=/api/v1/auth`, `Max-Age=2592000` (30 d); `Secure` off in local dev per `COOKIE_SECURE=false` and absent from login/register response bodies                                   |
| Rotation + reuse detection | Refresh rotates the opaque token; replaying a rotated token → `401 AUTH_REFRESH_REUSED` and revokes the whole family (the freshly rotated cookie is refused too)                                                               |
| CSRF                       | `/auth/refresh` without `X-Requested-With: ubuntu-tales` (or with a wrong value) → 403                                                                                                                                         |
| Tokens                     | Access token is an HS256 JWT with `sub`/`sv`/`role`, expires in 15 minutes; the refresh cookie cannot be used as a bearer token                                                                                                |
| Protected endpoints        | `/me`, `/me/saved`, `/me/progress`, `PUT /me/saved/:id`, `PUT reactions`, `logout-all` → 401 without a token                                                                                                                   |
| Enumeration                | Unknown email and wrong password return byte-identical 401 `AUTH_INVALID_CREDENTIALS`; forgot-password is always 202 `{ ok: true }` and only known accounts get a dev reset token                                              |
| Invalidation               | Password change bumps `sessionVersion` (old access token 401, other refresh families 401, current device receives a fresh cookie); sign-out-everywhere revokes the current family; wrong current password is a field-level 400 |
| Verification               | Invalid/replayed email tokens → 400 `AUTH_INVALID_TOKEN`; resend allows 3/hour then 429                                                                                                                                        |
| Brute force                | 10 failed logins lock the email for 15 minutes → 429 `AUTH_ACCOUNT_LOCKED` (in-memory/single instance per DEVIATIONS)                                                                                                          |
| Progress                   | Last-write-wins on `clientUpdatedAt` (older write ignored), percent outside 0–100 rejected, ≥95 % auto-completes, completion is idempotent (`talesRead` increments once), completion returns recommendations                   |
| Reactions                  | Set/switch keeps the public total stable, counts move between emotions, invalid type 400, public summary exposes counts without viewer identity                                                                                |
| Saved                      | Idempotent PUT, account list with `total`/progress fields, DELETE removes, duplicate save is a no-op                                                                                                                           |

## 6. Accessibility (axe-core)

**Final result: 17 routes × 2 viewports = 34 scans, 0 violations of any impact level.** Routes:
Phase 1 `/welcome`, `/`, `/tribes`, reader, `/library`, `/library?tab=authors`, guest `/saved`, guest
completion, 404; Phase 2 `/login`, `/signup`, `/verify-email?sent=1`, `/forgot-password`,
`/profile`, `/settings`, signed-in home and signed-in `/saved`.

Findings during this QA pass — all fixed and re-scanned by the Lead/frontend before sign-off:

| ID        | Finding                                                                                                                                                                                          | Fix                                                                                                                           | Verified                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| A11Y-P2-1 | Reader `ReactionRow` (1 node) and completion reaction picker (5 nodes) had an `aria-label` that drifted from the visible label/count/meaning punctuation — WCAG 2.5.3 label-in-name, **serious** | Removed the overriding `aria-label`/`title`; the visible label(+count)+meaning is now the accessible name (group labels kept) | ✅ 0 violations on reader + completion |
| A11Y-P2-2 | Earlier phase 1 contrast/label defects are re-verified                                                                                                                                           | —                                                                                                                             | ✅ 0 violations on all Phase 1 routes  |

Note: axe automates rule checks only; a manual screen-reader pass remains Phase 5 work (see §8).

## 7. Visual / design review

Reviewed all 16 Phase 2 screenshots ([contact sheet](./screenshots/phase-2/index.html)) against
`docs/design/substack-experience.md`. The Phase 2 surfaces continue the editorial system: warm paper,
Lora + DM Sans, hairline rules and cards, restrained terracotta actions, editorial headings with
generous rhythm, one `h1` per page and consistent eyebrow/meta treatment; the account menu, auth
split layouts and account cards reuse the Phase 1 tokens only (no new component colours). Page
structure is coherent at both breakpoints (auth split collapses to a single column, forms remain
readable, no horizontal scrolling anywhere).

Findings from the visual/layout audit:

| ID  | Severity | Route                                      | Finding                                                                                                                                                                                                                                                                                       | Evidence                                                                                                                                                                             | Owner    |
| --- | -------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| V1  | Low      | `/login`, `/settings`, header account menu | Some controls are below the design-spec 44×44 touch target: password reveal toggles 40×40, dev quick-login chips 36 px high, account-menu trigger 40 px high, settings "Edit details" 40 px high (the same class of issue recorded in the Phase 1 report for small icon buttons/follow pills) | [`login-mobile`](./screenshots/phase-2/login-mobile-390x844.png), [`settings-mobile`](./screenshots/phase-2/settings-mobile-390x844.png), [`layout-audit.json`](./layout-audit.json) | frontend |
| V2  | Info     | `/profile`, `/settings`                    | The screenshot account uses a QA-generated email; long addresses wrap gracefully (two lines on mobile) with the verified badge kept visible — no overflow                                                                                                                                     | [`profile-mobile`](./screenshots/phase-2/profile-mobile-390x844.png)                                                                                                                 | —        |
| V3  | Info     | completion                                 | Reaction counts are global seed-data counts and therefore grow across QA runs (screenshot shows "15 readers felt this"), which is expected for a shared dev database — not a defect                                                                                                           | [`complete-reactions-desktop`](./screenshots/phase-2/complete-reactions-desktop-1440x900.png)                                                                                        | —        |
| V4  | Info     | `/login`, `/signup` mobile                 | The fixed bottom nav overlays the lower part of the long auth form/footer at the first viewport; the page scrolls and all controls remain reachable (same established pattern as Phase 1)                                                                                                     | [`signup-mobile`](./screenshots/phase-2/signup-mobile-390x844.png)                                                                                                                   | —        |

## 8. Defects found during QA (all fixed & verified)

| ID    | Severity              | Finding                                                                                                                     | Root cause                                                                                                                                      | Fix (owner)                                                                                                                                     | Status                                          |
| ----- | --------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| P2-D1 | Medium                | Guest merge → `/saved` showed "Nothing saved yet." even though the merged tale was on the account (empty list until reload) | Session flipped to authenticated before `mergeGuestData` writes landed; `GET /me/saved` cached an empty page and the merge never invalidated it | `authCompletion`: invalidate `['saved']`, re-hydrate, invalidate progress/home before resuming/navigating (Lead/web-auth)                       | ✅ fixed, `phase2-merge` green                  |
| P2-D2 | Medium                | Signed-in reader opened directly/reloaded from an account position showed 0 % and wrote a local 0 marker                    | Tracking started on the pre-boot guest fetch and wrote 0; hydrate guarded on any existing local marker                                          | Furthest-point-wins `record`, gate tracking until session is known, treat 0 as unset and restore viewer progress/completion (Lead/web-personal) | ✅ fixed, merge + personal progress tests green |
| P2-D3 | Medium                | `AuthModal`/`requireAuth` existed but had no trigger in the UI, so the documented resume flow was unreachable               | No gated surface called `requireAuth` (guest saves are local by design)                                                                         | Guest `/saved` now has "Sign in to keep this list on every device" → `requireAuth(undefined, { redirectTo: '/saved' })` (Lead)                  | ✅ fixed, exercised end-to-end                  |
| P2-D4 | Medium (a11y blocker) | axe serious label-in-name on reader reactions (1 node) and completion picker (5 nodes)                                      | Overriding `aria-label` punctuation drifted from visible text                                                                                   | Removed overriding `aria-label`/`title`; visible text is the accessible name (Lead)                                                             | ✅ fixed, axe 0                                 |

## 9. Known issues / residual risk

| ID  | Severity | Area                   | Status                | Notes                                                                                                                                                                     |
| --- | -------- | ---------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | Low      | Touch targets          | Open — frontend       | Password reveal 40×40, chips 36 px, account trigger 40 px; raise to 44 px in a polish pass                                                                                |
| R1  | Info     | Cross-browser          | Coverage gap          | Chromium desktop + mobile emulation only; WebKit/iPhone and Firefox still to run before public launch                                                                     |
| R2  | Info     | Visual regression      | Coverage gap          | No approved `toHaveScreenshot` baselines yet; these PNGs are the Phase 2 baseline evidence                                                                                |
| R3  | Info     | Performance            | Coverage gap          | Lighthouse CI / JS budget / Core Web Vitals not measured in this pass                                                                                                     |
| R4  | Info     | Manual a11y            | Coverage gap          | axe only; manual screen-reader/keyboard pass remains Phase 5 work                                                                                                         |
| R5  | Info     | Security hardening     | Deferred (DEVIATIONS) | HS256 JWT (no `kid` rotation), in-memory lockout (single instance), no Helmet/CSP, no OWASP ZAP run                                                                       |
| R6  | Info     | Deployment requirement | Verify before prod    | `COOKIE_SECURE=true` in production; dev-only `devEmailToken`/`devResetToken` must never be exposed when `NODE_ENV=production`; SMTP must be configured (synchronous mail) |
| R7  | Info     | Account lifecycle      | Deferred (DEVIATIONS) | Export/delete account, consent management and legal pages are roadmap 5.2; registration records consent rows                                                              |
| R8  | Info     | Guest reactions        | Accepted deviation    | Guest reactions remain local and are not merged on sign-in until re-picked (DEVIATIONS Phase 2 #14); guest reactions themselves still work (Phase 1 test)                 |
| R9  | Info     | Google sign-in         | Deferred              | Optional roadmap 2.7                                                                                                                                                      |
| R10 | Info     | QA data                | Accepted              | Dev DB accumulates QA accounts, saves, progress, reactions and lockout counters; seeded users are only used read-only                                                     |

## 10. Evidence index

| Artifact                                              | Path                                                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Phase 2 screenshot contact sheet (16 images)          | [`docs/qa/screenshots/phase-2/index.html`](./screenshots/phase-2/index.html)       |
| Phase 2 screenshot manifest                           | [`docs/qa/screenshots/phase-2/manifest.json`](./screenshots/phase-2/manifest.json) |
| Phase 1 screenshot contact sheet (baseline)           | [`docs/qa/screenshots/index.html`](./screenshots/index.html)                       |
| axe results (34 scans, full node detail)              | [`docs/qa/axe-results.json`](./axe-results.json)                                   |
| axe summary table                                     | [`docs/qa/axe-summary.md`](./axe-summary.md)                                       |
| Security/session probe log (63 assertions)            | [`docs/qa/phase2-security.log`](./phase2-security.log)                             |
| API smoke log (37 assertions)                         | [`docs/qa/api-smoke.log`](./api-smoke.log)                                         |
| Layout audit (overflow, images, fonts, touch targets) | [`docs/qa/layout-audit.json`](./layout-audit.json)                                 |
| Playwright suite + commands                           | [`e2e/README.md`](../../e2e/README.md)                                             |
| Playwright HTML report (local, gitignored)            | `playwright-report/index.html`                                                     |
| JSON results (local, gitignored)                      | `test-results/results.json`                                                        |

Phase 2 screenshot routes (390×844 and 1440×900): `/login`, `/signup`, `/verify-email?sent=1`,
`/profile`, `/settings`, signed-in home with the account menu open, signed-in `/saved`, and the
completion screen with public reaction counts.

## 11. Recommendation

**GO** for launch of the Phase 2 accounts + personal-features slice.

Rationale: the Phase 1 regression suite and all new Phase 2 journeys pass on desktop and mobile, the
63-assertion security/session contract holds (cookie attributes, CSRF, rotation/reuse detection,
enumeration resistance, invalidation, progress caps/LWW, completion idempotency, rate limits), axe
reports zero violations across all key routes, there are no JS/console errors, and the four defects
found during QA were fixed and re-verified. The one remaining low-severity item is the touch-target
polish carried over from Phase 1; R1–R10 are coverage/deployment notes to close before the public
production launch, not regressions in this slice.
