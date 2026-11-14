# Ubuntu Tales — Phase 1 QA report

**Slice:** Phase 0 foundations + Phase 1 catalogue read path
**Report date:** 2026-11-15 (Africa/Johannesburg)
**Author:** qa-verifier
**Verdict: GO for launch of this slice** — all quality gates and the end-to-end suite are green, axe-core
finds **zero** violations (was 164 serious nodes before the token/label fixes below), and the API
contract smoke is 20/20. Only five low-severity design-polish items remain (see §7); none blocks launch.

---

## 1. Environment

| Item            | Value                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Workspace       | `/home/photon/ubuntu-tales` (pnpm workspace + Turborepo)                                       |
| Node / pnpm     | v24.18.0 / 10.34.9                                                                             |
| API             | NestJS 11 + Fastify, `http://localhost:4100/api/v1` (health `…/health/live`, `…/health/ready`) |
| Web             | Vite 6 dev server, `http://localhost:5173` (proxies `/api` → `:4100`)                          |
| Database        | PostgreSQL 17 (Docker container `ut-postgres`, host port 5433), seeded catalogue               |
| Seed data       | 16 tribes, 5 categories, 7 narrators/griots, 18 tales                                          |
| Browser         | Playwright 1.65.1, vendored Chromium 1255 in `.playwright-browsers/`                           |
| Accessibility   | axe-core 4.14.0 via `@axe-core/playwright` (root devDependency)                                |
| Test viewports  | 390×844 (Pixel 7 emulation) and 1440×900 (Desktop Chrome)                                      |
| Locale/timezone | en-GB / Africa/Johannesburg, light scheme, reduced motion for E2E stability                    |

Servers were already running (managed by the Lead); this QA pass did not start or stop them.

## 2. Commands run

```bash
# workspace quality gates
pnpm build
pnpm lint
pnpm typecheck
pnpm test

# end-to-end (API + web + seeded DB must be up)
PLAYWRIGHT_BROWSERS_PATH=$PWD/.playwright-browsers pnpm exec playwright test

# API contract smoke (curl)
bash e2e/scripts/api-smoke.sh | tee docs/qa/api-smoke.log

# accessibility + layout evidence
node e2e/scripts/axe-audit.mjs      # → docs/qa/axe-results.json, docs/qa/axe-summary.md
node e2e/scripts/layout-audit.mjs   # → docs/qa/layout-audit.json

# screenshots (390×844 + 1440×900)
node e2e/scripts/capture-screenshots.mjs   # → docs/qa/screenshots/ + index.html
```

Exact prerequisites and per-spec commands: [`e2e/README.md`](../../e2e/README.md).

## 3. Pass/fail matrix

| Area                | Check                                          | Result                                      | Evidence                                                                                                                                       |
| ------------------- | ---------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Build               | `pnpm build` (5 turbo tasks)                   | **PASS**                                    | exit 0, 5/5 tasks                                                                                                                              |
| Lint                | `pnpm lint` (8 tasks)                          | **PASS**                                    | exit 0, 8/8 tasks, no warnings                                                                                                                 |
| Types               | `pnpm typecheck` (8 tasks)                     | **PASS**                                    | exit 0, 8/8 tasks                                                                                                                              |
| Unit/integration    | `pnpm test` (18 Vitest files)                  | **PASS**                                    | 89/89 tests (shared 5, api 39, web 45)                                                                                                         |
| E2E                 | Playwright suite, 2 projects                   | **PASS**                                    | **68/68 passed** (34 journeys × 2 viewports), 0 retries needed                                                                                 |
| API contract        | curl smoke, 20 assertions                      | **PASS**                                    | 20/20 — [`api-smoke.log`](./api-smoke.log)                                                                                                     |
| Accessibility       | axe-core, 9 routes × 2 viewports               | **PASS**                                    | **0 violations** total (0 serious/critical, 0 moderate/minor) — [`axe-summary.md`](./axe-summary.md), [`axe-results.json`](./axe-results.json) |
| Console cleanliness | core journey incl. 404                         | **PASS**                                    | 0 console errors, 0 uncaught page errors, 0 warnings (both projects)                                                                           |
| Layout              | 10 routes × 2 viewports                        | **PASS**                                    | 0 horizontal overflow, 0 broken images, both fonts loaded — [`layout-audit.json`](./layout-audit.json)                                         |
| Visual evidence     | 11 routes × 2 viewports                        | **PASS**                                    | 22 PNGs + contact sheet — [`screenshots/index.html`](./screenshots/index.html)                                                                 |
| Design conformance  | review vs `docs/design/substack-experience.md` | **PASS (with 5 low-severity polish items)** | §7 below                                                                                                                                       |

## 4. End-to-end suite

Root `playwright.config.ts`, specs in `e2e/`, independent tests (fresh browser context + seeded
`localStorage` per test), single worker for determinism, one retry allowed but **not used** in the
final run. Report artifacts: `playwright-report/`, `test-results/results.json`.

| Spec                       | Journeys                                                                                   | What is asserted                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onboarding.spec.ts` (4)   | first visit → `/welcome`; choose roots → low-story dialog → home; skip; onboarded redirect | copy, both entry actions, step chrome, disabled/enabled CTA, dialog copy, personalised home, `ut.tribe`/`ut.follows`/`ut.onboarded` persistence                             |
| `home.spec.ts` (4)         | today's tale, feed, sidebar; `?q=`; `?category=`; search overlay                           | API-derived hero title, personalised band, feed rows, wisdom notes, discover rail, URL ⇄ UI state, reload persistence, clear, suggestion → reader                           |
| `publications.spec.ts` (3) | `/tribes` index; `/tribes/zulu`; unknown publication                                       | 16 cards, region filter 16→4, search 1, empty-search escape hatch, masthead/archive/about, Subscribe→Subscribed + persistence, 404                                          |
| `reader.spec.ts` (5)       | reader chrome and sentence markup; A−/A+; save; finish → complete; unknown tale            | no global chrome, >15 sentence spans, progressbar, `ut.fontSize` clamp + reload persistence, save → `/saved`, Finish → complete, reaction persistence, recommendations, 404 |
| `library.spec.ts` (5)      | cursor infinite scroll; category filter; audio empty; voices; deep links                   | 12 → 18 rows via sentinel, end-of-archive note, `?category=` URL + reload, narration empty state, 7 griot rows, tab URL state                                               |
| `saved.spec.ts` (3)        | list/filters/unsave; empty state; progress hairline                                        | local snapshot rows, `?filter=` state, disabled Offline + deep-link note, unsave + toast + storage, empty state, "42% read"/Continue reading                                |
| `author.spec.ts` (2)       | griot profile; unknown griot                                                               | identity, tale count, affiliations, follow-this-voice, 404                                                                                                                  |
| `a11y.spec.ts` (7)         | axe on welcome/home/tribes/reader/library/saved/voices                                     | serious/critical must be 0 (reductions attached as JSON artifacts)                                                                                                          |
| `console.spec.ts` (1)      | full click-through journey                                                                 | 0 console errors, 0 page errors; warnings surfaced                                                                                                                          |

Journeys cover the Phase 1 slice of the plan's critical journeys (§4.1–§4.5) adapted to this
read-only catalogue; audio playback, accounts, offline downloads and upload flows are out of scope by
the deviations register.

## 5. Accessibility (axe-core)

Nine routes scanned at both viewports with WCAG 2.0/2.1/2.2 A+AA tags:
`/welcome`, `/`, `/tribes`, `/stories/unogwaja-and-the-lions-well`, `/library`,
`/library?tab=authors`, `/saved`, `/stories/…/complete`, `/a-path-that-grew-over`.

**Final result: 18/18 scans with 0 violations of any impact level.**

Three real defects were found and fixed during this QA pass (verified by re-scan; web unit tests,
lint and typecheck re-run green):

| ID     | Was                                                                                                                                    | Fix (owner: Lead/frontend)                                                                                           | Verified                    |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| A11Y-1 | 55+ small-text nodes failed AA contrast: `--faint #9a8e82` on paper 2.99:1 / paper-sunk 2.72:1; `--muted #7a6e63` on paper-sunk 4.22:1 | Tokens → `--faint: #6f6459` (5.40/4.92/5.67) and `--muted: #6b6056` (5.73/5.22/6.02) in `tokens.css` + design doc §4 | ✅ 0 contrast findings      |
| A11Y-2 | `FollowButton` aria-label ("Unfollow Zulu") did not contain visible text ("Subscribed ✓") — WCAG 2.5.3                                 | Accessible name now starts with the visible label + publication name ("Subscribed ✓ Zulu")                           | ✅ 0 label-in-name findings |
| A11Y-3 | Reader A−/A+ glyphs were `aria-hidden`, so accessible names omitted visible text — WCAG 2.5.3                                          | Names are now "A− Decrease text size" / "A+ Increase text size"                                                      | ✅ 0 findings               |

Automated coverage caveat: axe catches rule violations, not screen-reader comprehension; a manual
NVDA/VoiceOver pass is still recommended before public launch (see §8).

## 6. API contract smoke

[`api-smoke.log`](./api-smoke.log) — 20/20 assertions passed. Covered endpoints and shape checks:

- `GET /health/live`, `/health/ready` (200; `database: up`)
- `GET /home` (story of the day, 6 latest, 5 categories, 5 wisdom notes); `GET /home?tribe=zulu` personalisation
- `GET /tribes` (16, required fields), `/tribes/zulu` (2 latest tales, count), `/categories` (5)
- `GET /stories?limit=3` (paginated + `nextCursor`), `?category=animal` (3), `/stories/unogwaja-and-the-lions-well` (`body.paragraphs[].sentences[]` non-empty), 404 shape (`code: NOT_FOUND`)
- `GET /stories/search-suggestions?q=zulu`, `/stories/story-of-the-day`, `/stories/:slug/recommendations`
- `GET /library/stories?limit=12` (12 + cursor) then page 2 (6 + `nextCursor: null`), `/library/audio` (empty in Phase 1 by design)
- `GET /authors?limit=100` (7 voices), `/authors/adewale-okunola` (3 tales), `/config` (reveals `lowStoryThreshold: 5`, 5 reactions)

Endpoint naming note for future test authors: the story-of-the-day route is
`/stories/story-of-the-day` (not `/story-of-the-day`), voices are `/authors` + `/library/audio`
(not `/library/authors`), and `GET /library/:tab` is the paginated read path.

## 7. Visual / design review vs `docs/design/substack-experience.md`

Reviewed all 22 screenshots ([contact sheet](./screenshots/index.html)). The editorial system is
faithful: warm paper, Lora/DM Sans only, hairline rules, one accent per publication, generous
rhythm, no SaaS gradients/shadows, no dashboard stats grid, one `h1` per route, 4-item bottom nav
(Read · Publications · Library · Saved) hidden on the reader, 680 px reading measure with 19 px/1.75
body and 2 px progress hairline, sticky reader bar transparent → paper after scroll, 16:10-style feed
hero on mobile, URL-driven search/filter/tab state, and editorial 404/empty states. Verified
concretely:

- Reading column: 760 px article box − 2×40 px gutters = **680 px content**, body `19px/33.25px`,
  `max-width: 68ch`, `user-select: text` — matches §5/§7.5.
- Reader top bar: `rgba(0,0,0,0)` + transparent hairline at top → `rgba(251,247,240,0.92)` + hairline
  after scroll; progress bar height **2 px**, `aria-valuenow` advances — matches §7.5.
- No raw hex values in component CSS (tokens only); only "Ubuntu!" uses an exclamation mark; the
  audience is never called "users"; emoji appear only in reactions — matches §4/§11.
- No horizontal overflow on any of the 20 route × viewport combinations; no broken cover images;
  both variable fonts load — [`layout-audit.json`](./layout-audit.json).

### Divergences found (all low severity, no breakage)

| ID  | Severity       | Route                            | Finding                                                                                                                                                                                               | Expected (design)                    | Evidence                                                                                                                                                                          | Owner            |
| --- | -------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| V1  | Low            | all mobile routes                | Several controls are smaller than the 44×44 touch target: icon buttons 36×36 (save, A−/A+), follow pills 40 px high, header wordmark link 30 px high, footer links 32 px high, "Audio" tab 42 px wide | §10 "Touch targets ≥ 44×44"          | [`reader-mobile`](./screenshots/reader-mobile-390x844.png), [`tribes-mobile`](./screenshots/tribes-mobile-390x844.png), [`layout-audit.json`](./layout-audit.json) (smallTargets) | frontend         |
| V2  | Low            | `/` mobile                       | Today's-tale hero cover uses the 3:2 `Image` ratio; §7.4 asks for a 16:10 cover above the copy on mobile                                                                                              | §7.4                                 | [`home-mobile`](./screenshots/home-mobile-390x844.png)                                                                                                                            | frontend         |
| V3  | Low (copy)     | `/authors/$slug`                 | Stats row reads "3 tales · 2 publications"; spec labels the second stat "M tribes"                                                                                                                    | §7.7 "stats (`N tales`, `M tribes`)" | [`author-desktop`](./screenshots/author-desktop-1440x900.png), [`author-mobile`](./screenshots/author-mobile-390x844.png)                                                         | frontend/product |
| V4  | Low            | `/library?tab=authors` desktop   | Griot bio lines run the full ~1040 px content width (~150 characters per line), which weakens the editorial reading posture                                                                           | §3/§6 reading measure discipline     | [`library-voices-desktop`](./screenshots/library-voices-desktop-1440x900.png)                                                                                                     | frontend         |
| V5  | Low (cosmetic) | `/stories/$slug/complete` mobile | Five reactions in a 2-column grid leave the fifth card orphaned on its own row; a 3/2 or auto-fit arrangement would be more even                                                                      | §9 (no exact grid specified)         | [`complete-mobile`](./screenshots/complete-mobile-390x844.png)                                                                                                                    | frontend         |

Observations, not defects: the welcome "Tale of the day" card sits below the 844 px fold on mobile
(the art composition stacks after the copy — no mobile order is specified in §7.1); `/saved` count
copy is rendered as the masthead intro ("2 tales kept on this device") rather than a badge — both
read well and are consistent with the editorial voice.

### Design findings that passed

Hero proportions (7/5 desktop, cover-above-copy mobile), masthead 60ch intro, 2-column publication
grid, numbered archive rows, accent-wash publication masthead, 96×72 archive thumbs, tab filter URL
state, 404 voice, empty states for audio/offline/saved, `--faint`/`--muted` token-only colours, and
reduced-motion handling (confetti ≤1.2 s, CSS-only) all match the binding spec.

## 8. Known issues and residual risk

| ID        | Severity   | Area                   | Status / owner                                                 | Notes                                                                                                                                                                                 |
| --------- | ---------- | ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A11Y-1..3 | High (was) | Accessibility          | **Fixed & verified** (Lead/frontend)                           | See §5                                                                                                                                                                                |
| V1        | Low        | Mobile touch targets   | Open — frontend                                                | Raise `IconButton` `sm`, `FollowButton` `sm` and small text links to 44 px minimum                                                                                                    |
| V2        | Low        | Home mobile hero ratio | Open — frontend                                                | Confirm with design: 16:10 per §7.4, or amend the spec                                                                                                                                |
| V3        | Low        | Author stats copy      | Open — frontend/product                                        | Align with §7.7 wording ("tribes" vs "publications")                                                                                                                                  |
| V4        | Low        | Voices bio measure     | Open — frontend                                                | Constrain bio to ~68–90ch or drop it from the row                                                                                                                                     |
| V5        | Low        | Complete reaction grid | Open — frontend                                                | Cosmetic iteration, not launch-blocking                                                                                                                                               |
| R1        | Info       | Cross-browser          | Coverage gap                                                   | E2E runs Chromium desktop + mobile emulation only; plan wants WebKit/iPhone and optionally Firefox before public launch                                                               |
| R2        | Info       | Visual regression      | Coverage gap                                                   | No approved `toHaveScreenshot` baselines yet; screenshots in this report are the baseline evidence for this slice                                                                     |
| R3        | Info       | Performance            | Coverage gap                                                   | Lighthouse CI / ≤170 KB gzip JS budget and Core Web Vitals not measured in this pass                                                                                                  |
| R4        | Info       | Manual a11y            | Coverage gap                                                   | Automated axe only; manual screen-reader/keyboard pass still recommended                                                                                                              |
| R5        | Info       | Contract               | Coverage gap                                                   | Smoke asserts shapes; no OpenAPI/codegen parity check in Phase 1 (deferred per DEVIATIONS 0.8)                                                                                        |
| D-Phase1  | Info       | Deferred by design     | Accepted — [`DEVIATIONS.md`](../production-plan/DEVIATIONS.md) | Accounts/saves sync, audio/read-along, offline downloads, OG share pages, admin/submissions, media pipeline are Phase 2+; audio tab empty and Offline filter disabled are intentional |

## 9. Evidence index

| Artifact                                                      | Path                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------ |
| Screenshot contact sheet (22 images: 11 routes × 2 viewports) | [`docs/qa/screenshots/index.html`](./screenshots/index.html)       |
| Screenshot manifest (paths, viewports, notes)                 | [`docs/qa/screenshots/manifest.json`](./screenshots/manifest.json) |
| axe results (full node/selector detail)                       | [`docs/qa/axe-results.json`](./axe-results.json)                   |
| axe summary table                                             | [`docs/qa/axe-summary.md`](./axe-summary.md)                       |
| API smoke log                                                 | [`docs/qa/api-smoke.log`](./api-smoke.log)                         |
| Layout audit (overflow, images, fonts, touch targets)         | [`docs/qa/layout-audit.json`](./layout-audit.json)                 |
| Playwright suite + exact run commands                         | [`e2e/README.md`](../../e2e/README.md)                             |
| Playwright HTML report (local, gitignored)                    | `playwright-report/index.html`                                     |
| JSON results (local, gitignored)                              | `test-results/results.json`                                        |

Captured routes (each at 390×844 and 1440×900): `/welcome`, `/`, `/tribes`, `/tribes/zulu`,
`/authors/adewale-okunola`, `/stories/unogwaja-and-the-lions-well`, `/library`,
`/library?tab=authors`, `/saved`, `/stories/unogwaja-and-the-lions-well/complete`, and the editorial
404 (`/a-path-that-grew-over`).

## 10. Recommendation

**GO** for launch of the Phase 1 catalogue read path.

Rationale: build/lint/typecheck/tests are green (89/89), 68/68 browser journeys pass on mobile and
desktop with no retries, the API contract smoke is 20/20, axe reports 0 violations after the token
and label fixes, and there are no console errors or uncaught exceptions on core journeys. The five
remaining findings are low-severity polish and can ship in a Phase 1.1 pass; R1–R4 are coverage
gaps to close before the public production launch, not regressions introduced by this slice.
