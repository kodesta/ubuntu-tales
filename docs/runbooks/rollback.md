# Rollback runbook

Rollback is always image-based: the database migration must already be backward compatible
(expand → migrate → contract).

1. Identify the last good tag from the GitHub release list or `docker images`.
2. On the host: set `API_IMAGE` and `WEB_IMAGE` to the previous tags in the environment file.
3. `docker compose -f infra/compose/docker-compose.prod.yml up -d --no-deps api web`.
4. Wait for `/api/v1/health/ready` and run the smoke list from `deploy.md`.
5. Verify Grafana: error rate back under 1%, p95 latency under 200 ms.
6. Record the incident in `docs/runbooks/incidents/` with timestamps, cause and follow-ups.

**Do not** roll back migrations automatically. If a migration caused the incident, forward-fix with a
new migration; restore from PITR only for data corruption (`backups.md`).
