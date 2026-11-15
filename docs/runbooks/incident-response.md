# Incident response runbook

## Severity

| Level | Example | Response |
| --- | --- | --- |
| SEV1 | Data breach, account takeover, site down | Immediate; page on-call; notify leadership |
| SEV2 | Auth broken, media unavailable, data corruption | Within 30 min |
| SEV3 | Single feature degraded, performance regression | Same business day |

## First 15 minutes

1. Declare the incident in the team channel; name an incident lead.
2. Preserve evidence: snapshot logs, Prometheus graphs, DB state; do not reboot before capturing.
3. Contain: revoke compromised credentials, rotate keys (`JWT_SECRET`, DB, SMTP), block offending IPs
   at Cloudflare/Caddy, roll back the deploy if it correlates (`rollback.md`).
4. Assess personal-data impact: which users, what categories (email, roots/lineage, activity).

## Privacy breach duties

- **POPIA (South Africa):** notify the Information Regulator and affected data subjects *as soon as
  reasonably possible*.
- **GDPR (EU/UK diaspora):** notify the supervisory authority within **72 hours** of awareness.
- **NDPA (Nigeria) / Kenya DPA:** follow the respective regulator timelines; document cross-border
  transfers.
- Record: timeline, data categories, number of subjects, containment, remediation, notifications.

## After

- Post-incident review within 5 working days; blameless; action items with owners and dates.
- Update this runbook, the security checklist and the launch checklist.
- Rotate any secret that may have been exposed and confirm no secret is in git history.
