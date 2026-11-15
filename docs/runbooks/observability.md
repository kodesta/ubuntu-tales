# Observability runbook

## Signals

| Signal | Where | Threshold |
| --- | --- | --- |
| API availability | Prometheus `up` | 2 min down → critical |
| Error rate | `http_requests_total{status=~"5.."}` | > 2% for 10 min |
| Latency | `http_request_duration_seconds` | p95 > 200 ms for 10 min |
| DB connections | `pg_stat_activity_count` | > 80 |
| Media disk | `node_filesystem_avail_bytes{mountpoint="/data"}` | < 15% free |
| Backups | `ubuntu_tales_backup_last_success_timestamp_seconds` | none in 30 h |
| Web vitals | Sentry / Lighthouse CI | LCP > 2.5 s, INP > 200 ms, CLS > 0.05 |

## Setup

1. Start the sidecar stack: `docker compose -f infra/compose/docker-compose.observability.yml up -d`.
2. Prometheus scrapes `/metrics` from the API on port 9464 (enable `prom-client` metrics in a follow-up
   API task; the config is ready).
3. Grafana auto-provisions `infra/observability/grafana-dashboards/api-overview.json`.
4. Logs: the API writes structured JSON; ship with the OTel Collector `logs` pipeline to Loki.
5. Traces: set `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318` on the API/worker.

## API down

1. Check `docker compose ps`, then container logs (`docker compose logs --tail=200 api`).
2. Confirm Postgres and the media volume are healthy; check disk space.
3. If the process is crash-looping, roll back (`rollback.md`) and capture logs for the fix.
