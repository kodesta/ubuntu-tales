# 09 — Testing and Quality

## 1. Test pyramid and tools

| Layer | Scope | Tools | Location |
| --- | --- | --- | --- |
| Unit | Pure functions, services with mocked deps, React hooks/components | Vitest, React Testing Library, `@testing-library/user-event`, MSW | `*.spec.ts(x)` next to source |
| Integration (API) | Controllers + services + real Postgres/Valkey/RustFS | Vitest + Supertest + Testcontainers | `apps/api/test/**/*.e2e-spec.ts` |
| Integration (storage/worker) | Presign → upload → process → renditions | Vitest + Testcontainers (RustFS, Postgres, Valkey) + fixture media | `packages/storage/test`, `apps/worker/test` |
| Contract | OpenAPI ↔ generated client stay in sync | `api-client:check` in CI | — |
| End-to-end | Real browser against full stack | Playwright (Pixel 7 Chrome, iPhone 14 WebKit, Desktop Chrome for admin) | `e2e/` at repo root |
| Visual regression | Key screens vs approved baselines | Playwright `toHaveScreenshot` | `e2e/visual/` |
| Accessibility | Automated a11y rules | `@axe-core/playwright` on every e2e page | — |
| Performance | Web vitals budgets | Lighthouse CI | CI job |
| Load | API capacity | k6 scripts | `perf/` |

## 2. Coverage gates

- `apps/api` and `apps/worker`: ≥ 80% lines on `modules/**/**.service.ts` and `processors/**`; 100% of submission state machine transitions.
- `apps/web`: ≥ 70% lines on `features/**` hooks and stores (`useReadAlong`, `AudioEngine`, `playerStore`, offline outbox, auth refresh flow).
- Coverage is a floor, not a goal; reviewers reject tests that assert nothing meaningful.

## 3. Required test cases (non-exhaustive)

**Auth:** register with/without tribe; duplicate email; weak/pwned password; login success/fail; lockout after 10 failures; refresh rotation; refresh token reuse revokes family; logout; reset password revokes sessions; suspended user cannot refresh; access token rejected after suspension.

**Authorization:** every admin endpoint returns 403 for READER and CONTRIBUTOR; users cannot read/edit others' submissions, progress, or downloads.

**Catalogue:** published-only visibility; search ranking for title vs tribe matches; accent-insensitive search ("Ananse" vs "Anansé"); cursor pagination stable under inserts; low-story count accurate after publish/unpublish.

**Progress/stats:** last-write-wins by `clientUpdatedAt`; delta caps; completion idempotent; `talesRead` and `tribesExplored` correct; streak across timezones.

**Uploads/media:** wrong content-type rejected at presign; size mismatch rejected by storage; HEAD verification; image renditions created and EXIF GPS stripped (fixture with GPS); audio renditions have expected bitrate/channels/duration; corrupt audio → FAILED with reason; range request returns 206.

**Submissions:** full lifecycle; invalid transitions rejected; approve creates draft story with sentence IDs; publish emails author (outbox row created).

**Web:** read-along picks correct sentence at boundaries; tapping sentence seeks; auto-scroll pauses after manual scroll; player rate/skip; offline download then airplane mode → story readable and audio plays; queued progress syncs on reconnect; guest saved items merge after signup; 401 → refresh → retry once → logout on failure.

## 4. Critical end-to-end journeys (Playwright, run on every PR)

1. First visit → onboarding → choose tribe (low-story tribe shows dialog) → home shows "Your tribe".
2. Sign up → verify email (read token from Mailpit API) → profile shows tribe and community role.
3. Search "baobab" → open story → play audio → highlighted sentence advances → finish → celebration → set reaction → recommendation opens.
4. Save story → Saved list shows it with progress → download → go offline (`context.setOffline(true)`) → open and play.
5. Library → Audio tab infinite scroll loads a second page.
6. Submit a story with cover image → editor (second browser context) approves → publishes → story visible in Library "Authors" tab; author received email.
7. Admin uploads narration → processing completes → timing editor tap mode saves timings → reader highlights follow audio.
8. Share link: request `/stories/:slug` with WhatsApp UA returns OG tags.

## 5. Visual parity with the concept

During Phases 2–3, run the legacy Angular app (`legacy/angular-concept`) and the new React app side by side in Playwright at 390×844 for: onboarding, tribes, home, read mode, player, celebration, library (each tab), saved, drawer, profile, auth modal. Store concept screenshots as baselines in `e2e/visual/concept-baselines/`. Differences > 2% pixel ratio need explicit design sign-off in the PR.

## 6. Load test targets (k6, before launch)

- 300 RPS mixed catalogue reads (home, stories list, story detail) with p95 < 200 ms and 0% errors on the production topology.
- 50 RPS progress writes with p95 < 150 ms.
- 200 concurrent audio streams from the CDN origin without RustFS errors (cache-bypass test).

## 7. Definition of Done (every task)

- Acceptance criteria in the roadmap task met and demonstrated (screenshot/GIF for UI in the PR).
- Tests added/updated; CI green.
- OpenAPI + generated client regenerated if API changed.
- Docs in `docs/production-plan` updated if behaviour or schema differs from the plan.
- No new lint warnings; no `TODO` without a linked issue.
- Accessibility: keyboard and screen-reader pass for new UI.
- Feature flags for anything risky or incomplete that merges to `main`.
