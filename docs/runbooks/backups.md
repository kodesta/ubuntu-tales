# Backups, restore and retention

## What is backed up

| Asset | Method | Frequency | Retention |
| --- | --- | --- | --- |
| PostgreSQL | `pg_dump` custom format + WAL archiving (PITR) | nightly full, continuous WAL | 30 days full, 7 days WAL |
| Media (`MEDIA_ROOT`) | `rclone`/`restic` snapshot to off-site object storage | nightly | 30 days |
| Configuration | encrypted copy of the production env + Caddyfile | on change | latest 5 |

## Nightly backup (host cron or systemd timer)

```bash
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
cd /srv/ubuntu-tales

# 1. Database (custom format is compressed and restorable selectively)
docker compose -f infra/compose/docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > "/backups/db-$STAMP.dump"

# 2. Media volume
docker run --rm -v ubuntu-tales-prod_ut-media:/data:ro -v /backups:/backups alpine \
  tar czf "/backups/media-$STAMP.tgz" -C /data .

# 3. Off-site sync (restic recommended; repository has a password file in the secret store)
restic backup /backups --tag ubuntu-tales
restic forget --keep-daily 30 --keep-weekly 8 --prune

# 4. Health signal for the BackupSyncStale alert
echo "$(date +%s)" > /var/lib/ubuntu-tales/last-backup
```

## Restore drill (quarterly, and before every production launch)

1. Create a scratch database: `createdb ut_restore_drill`.
2. `pg_restore -d ut_restore_drill /backups/db-<stamp>.dump`.
3. Point a throwaway API at it and run `GET /api/v1/health/ready` and `/home`.
4. Restore media into a scratch volume and verify a narration URL plays with Range requests.
5. Record the drill date and duration in `docs/launch/launch-checklist.md`.

Target: **RPO ≤ 24 h** (≤ 5 min with WAL), **RTO ≤ 2 h**.
