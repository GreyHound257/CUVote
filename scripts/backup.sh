#!/bin/bash
# scripts/backup.sh
# Performs a pg_dump of the PostgreSQL database.

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set."
else
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  BACKUP_FILE="backup_${TIMESTAMP}.sql"
  BACKUP_DIR="./backups"

  mkdir -p "$BACKUP_DIR"

  echo "Starting database backup to $BACKUP_DIR/$BACKUP_FILE..."
  pg_dump "$DATABASE_URL" > "$BACKUP_DIR/$BACKUP_FILE"

  echo "Backup complete. File saved to $BACKUP_DIR/$BACKUP_FILE."
fi
