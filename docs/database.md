# Database Management Guide

## Migrations

CUVote uses Prisma ORM for database migrations. Migrations ensure the database schema stays in sync with the Prisma schema file.

### Running Migrations

In production, run the following command during the deployment process **before** starting the application:

```bash
npx prisma migrate deploy
```

This applies all pending migrations in `prisma/migrations` to the database.

### Creating Migrations

When developing locally, after making changes to `prisma/schema.prisma`, run:

```bash
npx prisma migrate dev --name <migration_name>
```

### Rollback Strategy

Prisma does not have a built-in `migrate down` command. If a bad migration is deployed, the best approach is:

1. Restore from the latest database backup (see Backups section).
2. Revert the code change (e.g., git revert).
3. Re-deploy the older version of the code.

Alternatively, manually create a new migration that reverses the bad schema changes and deploy that forward.

## Seeding

For initial deployment, a database seed script is provided to create the default SUPER_ADMIN user.

```bash
npx ts-node scripts/seed.ts
```

*Note: Ensure `DATABASE_URL` is set in the environment. You can override defaults using `ADMIN_EMAIL` and `ADMIN_PASSWORD`.*

## Backup & Restore

See `docs/backup-recovery.md` and the `scripts/backup.sh` / `scripts/restore.sh` utilities for details on backing up the PostgreSQL database.
