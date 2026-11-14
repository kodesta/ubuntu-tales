# 08 — Security and Privacy

## 1. Threat model (summary)

| Asset | Threats | Primary controls |
| --- | --- | --- |
| User accounts | Credential stuffing, brute force, session theft, account takeover via reset | argon2id, HIBP check, rate limits + lockout, rotating refresh tokens with reuse detection, httpOnly cookies, in-memory access tokens, single-use hashed reset tokens (30 min), "password changed" emails |
| Admin/editor console | Privilege escalation, CSRF, XSS → admin takeover | Server-side role checks on every admin route, audit log, CSP without `unsafe-eval`/inline scripts, 2FA (TOTP) required for EDITOR/ADMIN (Phase 5) |
| Uploaded files | Malware, decompression bombs, polyglots, EXIF location leaks, storage abuse | Presigned PUT bound to type+size, magic-byte sniffing, `sharp` pixel limits, ffprobe validation, metadata stripping, ClamAV scan for user submissions, per-user quotas, files served from a separate origin (`media.`) |
| Story content | Stored XSS via submissions, copyright infringement, harmful content | Plain-text bodies only (no HTML/markdown rendering), React escaping, moderation before publishing, rights confirmation + licence, takedown runbook |
| Stats/gamification | Inflation via forged progress calls | Server-side caps on `listenedDeltaSec`, elapsed-time checks, idempotent completion |
| Infrastructure | Exposed consoles, leaked secrets, supply chain | RustFS console and DB on private network only, Tailscale SSH, Gitleaks, pinned + scanned images, signed images, Renovate |
| Availability | DDoS, scraping, expensive search queries | Cloudflare WAF/rate limiting, API throttler, statement timeouts, search query length cap (100 chars) |

## 2. Application security checklist (must be true before launch)

- [ ] OWASP ASVS Level 2 controls reviewed for auth, session, access control, validation, files, and config.
- [ ] Helmet/Caddy security headers and CSP as in `07` §3. No inline scripts in `index.html`.
- [ ] `ValidationPipe` whitelist + forbid unknown properties on every DTO.
- [ ] Every query that takes a user-supplied ID also scopes by owner or checks role.
- [ ] Refresh endpoint requires the custom `X-Requested-With` header and `SameSite=Lax` cookie (CSRF).
- [ ] CORS: only same-origin in production (API is served under the web origin); `storage.` allows only PUT from the app origins.
- [ ] Rate limits on auth, uploads, submissions, search, and share endpoints.
- [ ] Error responses never leak stack traces, SQL, or bucket names.
- [ ] Logs redact tokens, passwords, cookies; emails are hashed.
- [ ] Dependencies: no known HIGH/CRITICAL vulnerabilities with an available fix.
- [ ] External penetration test (or at minimum OWASP ZAP baseline + authenticated scan) on staging, findings fixed.
- [ ] `security.txt` at `/.well-known/security.txt` with a contact address.

## 3. Privacy and compliance

The audience spans multiple African jurisdictions and the diaspora. Design to the strictest common denominator:

- **South Africa — POPIA**, **Nigeria — NDPA 2023**, **Kenya — Data Protection Act 2019**, **EU/UK — GDPR** (diaspora users).

Requirements derived:

1. **Data minimisation:** collect only email, display name, optional tribe/lineage, community role, and activity. Tribe/ethnic origin can be **special personal information / sensitive data** under POPIA and GDPR — it must be **optional**, collected with explicit consent wording at signup ("Share your roots to personalise stories — optional"), editable and removable any time. The concept made tribe mandatory at signup; production must not.
2. **Consent records:** `UserConsent` rows for terms, privacy, analytics, marketing emails, and "tribe/lineage personalisation", with policy version.
3. **Rights:** access/export (`GET /me/export` → ZIP of JSON), rectification (`PATCH /me`), erasure (`DELETE /me` → anonymisation job), objection to analytics (consent toggle).
4. **Children:** folktales attract children. Minimum account age 13 (16 for EU users unless parental consent). Signup asks for a date-of-birth year **or** an "I am 13 or older" confirmation (choose with legal advice; default to the confirmation checkbox). Reading and listening work without an account, so children are not forced to sign up. No behavioural advertising, ever.
5. **Analytics:** PostHog only after consent; IP anonymisation; no session recording.
6. **Processors:** maintain a list (hosting, email provider, Sentry, PostHog, Cloudflare) with DPAs signed; publish in the privacy policy.
7. **Data residency:** prefer hosting in South Africa or another African region; document cross-border transfers.
8. **Retention:** refresh tokens deleted 7 days after expiry; email tokens after use/expiry; deleted-account activity hard-deleted after 30 days; logs 30 days; backups 30–90 days.
9. **Breach response:** documented in `incident-response.md`; POPIA requires notifying the Information Regulator and data subjects "as soon as reasonably possible"; GDPR within 72 hours.
10. **Legal pages:** Terms, Privacy Policy, Community Guidelines (submissions), Copyright/Takedown policy — drafted by the team with legal review; rendered at `/legal/*`.

## 4. Content governance

- Cultural sensitivity review for every published story (tribe attribution, sacred/restricted stories, respectful imagery of masks and people). Add a `culturalReviewBy` / `culturalReviewAt` field to `Story` when the editorial process is formalised.
- Submissions require: rights confirmation, licence choice (default CC BY 4.0), attribution to tradition/source.
- Report button on stories (Phase 5): `POST /stories/:id/reports { reason }` → admin queue.
- Takedown SLA: 72 hours for valid copyright or harm reports.

## 5. Secrets and keys

- JWT signing: Ed25519 keypair, `kid` header, two keys active during rotation.
- S3 credentials: scoped RustFS user, rotated every 90 days.
- DB: separate roles (`ut_app`, `ut_migrator`, `ut_readonly`), TLS required between app and DB.
- No secret ever in the web bundle; `VITE_*` vars are public by definition.
