#!/bin/bash
# scripts/restore.sh
# Restores a PostgreSQL database from a backup file.

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set."
elif [ -z "$1" ]; then
  echo "Usage: ./restore.sh <path-to-backup-file.sql>"
else
  BACKUP_FILE="$1"
  if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: File $BACKUP_FILE not found."
  else
    echo "Starting database restore from $BACKUP_FILE..."
    psql "$DATABASE_URL" < "$BACKUP_FILE"
    echo "Restore complete."
  fi
fi
