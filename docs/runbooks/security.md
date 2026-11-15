# Security checklist and evidence (production plan 08 §2)

Status as of the Phase 5/6 build. Tick items by linking the code, config or test that proves them.
Items marked **BLOCKER** require real infrastructure, legal review or a human sign-off and are tracked
in [`../launch/launch-checklist.md`](../launch/launch-checklist.md).

| # | Control | Status | Evidence |
| --- | --- | --- | --- |
| 1 | OWASP ASVS L2 review of auth, session, access control, validation, files, config | Partial | Auth/session controls implemented and probed in `docs/qa/phase2-security.log`; full ASVS review outstanding |
| 2 | Security headers + CSP, no inline scripts | Implemented | `infra/caddy/Caddyfile` (`Content-Security-Policy`, HSTS, COOP/CORP, Referrer-Policy, Permissions-Policy); `caddy validate` passes |
| 3 | Input validation whitelisting (Zod + Problem Details) | Implemented | `apps/api/src/common/validation`, `apps/api/src/common/errors`, DTO schemas in admin/submissions/media controllers |
| 4 | Every user-scoped query checks ownership/role | Implemented | `JwtAuthGuard`, `RolesGuard`, `@Roles`, owner checks in saved/progress/downloads/submissions services |
| 5 | Refresh endpoint requires CSRF header + SameSite=Lax cookie | Implemented | `apps/api/src/modules/auth/*`, `packages/api-client` sends `X-Requested-With`; probed in QA security log |
| 6 | CORS restricted to the web origin | Implemented | `apps/api/src/main.ts` origin allowlist from `WEB_ORIGIN`; authenticated responses `private, no-store` |
| 7 | Rate limits on auth/uploads/submissions/search | Partial | Login lockout + resend limit in-memory; global Valkey throttler deferred (DEVIATIONS Phase 2 #3) |
| 8 | Errors never leak stack traces/SQL/bucket names | Implemented | Problem Details filter returns `{type,title,status,detail,code}` only; logs keep stack traces server-side |
| 9 | Logs redact tokens/passwords/cookies; emails hashed | Partial | Auth service avoids logging tokens; `nestjs-pino` redaction is configured in Phase 5 follow-up (API currently uses Nest logger) |
| 10 | Dependency vulnerabilities | Partial | `pnpm audit` runs in CI; no automated patching cadence yet (Renovate deferred) |
| 11 | Pen test / OWASP ZAP baseline | **BLOCKER** | Requires a deployed staging environment |
| 12 | `security.txt` | Implemented | `apps/web/public/.well-known/security.txt` |
| 13 | Upload safety: type/size/magic byte validation, image pixel limit, metadata stripped | Implemented | `apps/api/src/modules/media` (`sharp limitInputPixels`, `file-type` sniffing, ffmpeg probe) |
| 14 | Media served with Range + long-lived cache, no directory listing | Implemented | `@fastify/static` under `/media/`, `StorageService.resolve` traversal guard |
| 15 | Admin routes role-gated; audit log written | Implemented | `apps/api/src/modules/admin`, `AuditLog` writes; reader gets 403 (verified) |
| 16 | Suspension invalidates sessions | Implemented | `AdminUsersService.updateUser` bumps `sessionVersion` + revokes refresh tokens |
| 17 | TOTP 2FA for EDITOR/ADMIN | **BLOCKER** | Not implemented; required before public production launch |
| 18 | ClamAV scanning for community uploads | **BLOCKER** | Not implemented; required before accepting public uploads |
| 19 | Secret scanning + no secrets in git | Implemented | `.github/workflows/ci.yml` gitleaks job; `.env.example` only |
| 20 | Separate DB roles (`ut_app`, `ut_migrator`, `ut_readonly`) | **BLOCKER** | Requires provisioning; documented in `07-infrastructure-devops.md` |

## Threat-model notes for this build

- **Guest/local data:** guest saves/progress live in `localStorage` and are clearly labelled "on this
  device"; they merge into the account on sign-in and are cleared afterwards.
- **Tokens:** access tokens are memory-only; refresh tokens are httpOnly cookies hashed in Postgres
  (`sha256`), rotated on every refresh with family reuse detection.
- **Uploads:** the API stores originals under `MEDIA_ROOT/uploads/<assetId>` and only serves processed
  renditions under `/media`; originals are never reachable by URL.
- **Media trust boundary:** `MEDIA_ROOT` must be a non-executable volume; the API runs as a non-root
  user with a read-only root filesystem in `infra/compose/docker-compose.prod.yml`.
