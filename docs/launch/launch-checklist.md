# Launch checklist — Ubuntu Tales v1

**Status:** not launch-ready. Phases 0–6 are built; this checklist separates what is done from what
requires real infrastructure, legal review or human sign-off.

Legend: ✅ done and verified in this repo · 🟡 implemented but needs an environment/human step ·
⛔ blocker for public launch (cannot be completed from a development workstation).

## 1. Product and content

| Item | Status | Owner | Evidence / next step |
| --- | --- | --- | --- |
| Catalogue read path (home, publications, reader, library, griots) | ✅ | eng | `docs/qa/phase-1-report.md` — 116/116 e2e journeys |
| Accounts, sessions, saved, progress, reactions | ✅ | eng | `docs/qa/phase-2-report.md` — security probe 63/63 |
| Audio narration playback + read-along + PWA/offline | ✅ | eng | `docs/qa/phase-3-report.md`; listen page plays/seeks with real timings |
| Community submissions + moderation console | ✅ | eng | `phase4-flow` verification; `/admin/moderation` e2e |
| ≥ 60 published tales across ≥ 12 publications | ⛔ | editorial | 18 demo tales exist for 16 publications; **human-written/recorded content required** (`pnpm content:lint` warns per publication) |
| Cultural review of every published tale | ⛔ | editorial | Process documented in `docs/runbooks/moderation.md`; reviewer sign-off missing |
| Human narration recordings + verified timings | ⛔ | editorial | Demo audio is local TTS (Piper); production needs recorded voices |
| Story of the Day scheduled 60 days ahead | 🟡 | editorial | Console supports scheduling; calendar not filled |
| No placeholder text in production | ✅ | eng | `pnpm content:lint` fails on placeholders |

## 2. Security and privacy

| Item | Status | Owner | Evidence |
| --- | --- | --- | --- |
| Auth/session hardening (argon2id, rotating refresh, reuse detection, CSRF header, lockout) | ✅ | eng | `docs/runbooks/security.md` items 3–5; QA security probe |
| Security headers + CSP at the edge | ✅ | eng | `infra/caddy/Caddyfile`, `caddy validate` passes |
| Upload safety (MIME/magic bytes, pixel limits, metadata strip, audio probe) | ✅ | eng | `apps/api/src/modules/media` |
| Role-gated admin + audit log | ✅ | eng | reader → 403 verified; audit rows written |
| OWASP ZAP baseline on staging | ⛔ | security | Needs a deployed staging URL |
| TOTP 2FA for EDITOR/ADMIN | ⛔ | eng | Not implemented; required before public admin use |
| ClamAV scanning for community uploads | ⛔ | ops | Required before public uploads |
| Dependency audit with no HIGH/CRITICAL fixable | 🟡 | eng | `pnpm audit` wired in CI; review on release |
| Log redaction (tokens/passwords/cookies) | 🟡 | eng | Keep tokens out of logs; structured redaction to confirm |
| Legal review of terms/privacy/community/copyright pages | ⛔ | legal | Draft copy shipped at `/legal/*`; needs counsel (POPIA/GDPR/NDPA/Kenya DPA) |
| Data export and account deletion endpoints | ⛔ | eng | Planned in privacy workstream; UI mentions manual contact meanwhile |

## 3. Operations

| Item | Status | Owner | Evidence |
| --- | --- | --- | --- |
| Multi-stage non-root Docker images | 🟡 | ops | `infra/docker/*`; build needs registry/infra to verify |
| Production compose + Caddy edge (TLS/HSTS) | 🟡 | ops | `infra/compose/docker-compose.prod.yml`, validated config |
| Deploy pipelines with approval gate | 🟡 | ops | `.github/workflows/deploy-*.yml`; needs secrets/hosts |
| Backups + restore drill | ⛔ | ops | Procedures in `docs/runbooks/backups.md`; drill not executed |
| Observability stack + alert rules | 🟡 | ops | `infra/observability/*`; API `/metrics` exporter still to wire |
| Real domain, DNS, TLS certificates | ⛔ | ops | Not provisioned |
| Load test at production shape | ⛔ | ops | k6 scripts ready (`k6/`); not run against staging |
| Error tracking (Sentry) with source maps | ⛔ | ops | Env placeholders documented; DSN/account missing |
| Status page + on-call rotation | ⛔ | ops | Not started |

## 4. Quality gates

| Item | Status | Evidence |
| --- | --- | --- |
| Build, lint, typecheck, tests | ✅ | `pnpm build && pnpm lint && pnpm typecheck && pnpm test` |
| Browser e2e (desktop + mobile) | ✅ | Playwright suite, Phase 1/2 + Phase 3/4 journeys |
| Accessibility (axe) | ✅ | 0 serious/critical across key routes (Phase 1/2 reports) |
| Manual screen-reader pass (TalkBack/VoiceOver) | ⛔ | Human task; checklist in `docs/qa/screen-reader-checklist.md` |
| WebKit/Firefox e2e coverage | 🟡 | Config documented; run before launch |
| Lighthouse budgets | 🟡 | `lighthouse/lighthouserc.json`; needs a stable preview URL |
| Visual-regression baselines | 🟡 | Screenshot evidence exists; approved baselines not yet enforced |

## 5. Launch steps (in order)

1. Legal review complete; `/legal/*` copy approved.
2. Editorial content loaded (≥60 tales, recordings, cultural review).
3. Staging deploy green; ZAP baseline clean; 2FA + ClamAV in place.
4. Backups configured **and a restore drill recorded**.
5. Production DNS + TLS live; `COOKIE_SECURE=true`; dev-only affordances disabled
   (`NODE_ENV=production` removes dev tokens and quick-login chips).
6. Security.txt, status page, on-call runbooks published.
7. Soft launch behind the `public_signup` flag to a closed beta.
8. Public launch; monitor Grafana/Sentry for 24 h; error budget documented (99.5% API, 99.9% media).
