# Backup & Recovery Guide

Data integrity is the highest priority for CUVote. PostgreSQL backups must be performed regularly.

## Automated Backups

Depending on your hosting provider (e.g., AWS RDS, Supabase, Neon), automated snapshots should be enabled at the infrastructure level. Ensure Point-in-Time Recovery (PITR) is enabled.

## Manual Backups

For self-hosted databases, use the provided `scripts/backup.sh`:

1. Ensure `DATABASE_URL` is exported in your environment.
2. Run `./scripts/backup.sh`.
3. The script will generate a timestamped `.sql` file in the `./backups` directory.

Store these backups securely off-site (e.g., AWS S3).

## Disaster Recovery

If the database becomes corrupted or unrecoverable:

1. Stop application traffic (enable maintenance mode on your load balancer).
2. Locate the most recent valid backup file (`.sql`).
3. Wipe the existing corrupted database or create a new one.
4. Export the new `DATABASE_URL`.
5. Run `./scripts/restore.sh path/to/backup.sql`.
6. Verify data integrity manually.
7. Restart the application and verify readiness via `/api/health/readiness`.
