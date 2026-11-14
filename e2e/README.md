# Ubuntu Tales — Phase 1 end-to-end suite (Playwright)

Browser journeys for the integrated Phase 1 app: the Vite web app on **:5173**, proxying the NestJS
API on **:4100**, against the **seeded** local PostgreSQL. The suite does not start or seed servers;
it assumes the stack is up (see prerequisites) and reports contract/UX regressions in the app.

## Prerequisites

From the repository root:

```bash
# 1. Stack dependencies (already installed in this workspace)
pnpm install
pnpm build:deps
pnpm infra:up
pnpm db:migrate
pnpm db:seed

# 2. Start both servers (leave running in separate terminals)
pnpm --filter api start     # http://localhost:4100/api/v1
pnpm --filter web dev -- --port 5173   # http://localhost:5173
```

Playwright browsers are vendored in the workspace at `.playwright-browsers/` (Chromium 1255).
`playwright.config.ts` points `PLAYWRIGHT_BROWSERS_PATH` there automatically; if you invoke
Playwright from elsewhere set it explicitly:

```bash
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers"
```

Do **not** run `pnpm install` just for the suite; `@playwright/test` and `@axe-core/playwright` are
root devDependencies.

## Run the suite

```bash
# all journeys, desktop (1440×900) + mobile (390×844)
pnpm exec playwright test

# one project or one file / test
pnpm exec playwright test --project=mobile
pnpm exec playwright test e2e/onboarding.spec.ts
pnpm exec playwright test -g "A− / A\+"

# debug / inspect
pnpm exec playwright test --headed --project=desktop
pnpm exec playwright test --ui
pnpm exec playwright show-report        # opens playwright-report/index.html
```

Failure artifacts (trace, screenshot) land in `test-results/artifacts/`; the JSON report is written
to `test-results/results.json` and the HTML report to `playwright-report/`. Neither directory is
committed (`.gitignore`).

Override targets when the stack runs elsewhere:

```bash
WEB_URL=http://localhost:5173 API_URL=http://localhost:4100/api/v1 pnpm exec playwright test
```

## What is covered

| Spec | Journeys |
| --- | --- |
| `onboarding.spec.ts` | first visit → `/welcome`; choose tribe → low-story dialog → "Begin reading" → personalised home; skip onboarding; onboarded redirect; `ut.tribe`/`ut.follows` persistence |
| `home.spec.ts` | today's tale + publications feed + wisdom notes + discover rail; `/?q=` search result state (with reload); `/?category=` filter state; search overlay → suggestion → reader |
| `publications.spec.ts` | `/tribes` count/search/region filters; publication page masthead, numbered archive, about, subscribe persistence; unknown publication 404 |
| `reader.spec.ts` | reader chrome (no global header/bottom nav), sentence spans, reading progress; A−/A+ clamp + `ut.fontSize` persistence; save → `/saved`; finish → `/complete` → reaction persistence + recommendations; unknown tale 404 |
| `library.spec.ts` | `/library` tabs from URL, cursor-paginated infinite scroll (12 → 18), category filter URL state, audio empty state, voices list → griot page |
| `saved.spec.ts` | `/saved` rows from local snapshots, URL filters, disabled Offline, unsave + toast, empty state, progress hairline |
| `author.spec.ts` | griot profile identity/tales/affiliations, follow this voice, unknown griot 404 |
| `a11y.spec.ts` | axe-core (WCAG 2.0/2.1/2.2 A+AA) on `/welcome`, `/`, `/tribes`, reader, `/library`, `/saved`, voices tab — serious/critical must be 0 |
| `console.spec.ts` | full click-through journey with console error + uncaught page-error capture |

Tests are independent: Playwright gives each test a fresh browser context, and `e2e/support/state.ts`
seeds `localStorage` (`ut.onboarded`, `ut.tribe`, `ut.follows`, `ut.saved`, `ut.fontSize`,
`ut.reactions`, `ut.progress`) with the exact Zustand-persist envelope. The catalogue itself is
read-only seed data; journeys derive expectations from the API where counts matter.

## API smoke (curl)

```bash
bash e2e/scripts/api-smoke.sh
API_URL=http://localhost:4100/api/v1 bash e2e/scripts/api-smoke.sh | tee docs/qa/api-smoke.log
```

Asserts response shapes for `/health/*`, `/home`, `/tribes`, `/tribes/:slug`, `/categories`,
`/stories`, `/stories/:slug`, `/stories/search-suggestions`, `/stories/story-of-the-day`,
`/stories/:slug/recommendations`, `/library/stories` (both cursor pages), `/library/audio`,
`/authors`, `/authors/:slug` and `/config`.

## Screenshots

```bash
# 390×844 and 1440×900 for all ten key routes → docs/qa/screenshots/
node e2e/scripts/capture-screenshots.mjs
```

The script seeds local state per route, waits for fonts/images, and (re)writes
`docs/qa/screenshots/index.html` — the contact sheet used by the Phase 1 report.
