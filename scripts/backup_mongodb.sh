#!/bin/bash
#
# MongoDB Backup Script for Beneficial Inspections
# This script creates automated backups of MongoDB database
#
# Usage: ./backup_mongodb.sh
#

set -e  # Exit on error

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/app/backups/mongodb"
DB_NAME="test_db"
RETENTION_DAYS=7
MAX_BACKUPS=10

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup filename
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}"

echo "========================================="
echo "MongoDB Backup Script"
echo "========================================="
echo "Start Time: $(date)"
echo "Database: $DB_NAME"
echo "Backup Location: $BACKUP_FILE"
echo "========================================="

# Create MongoDB dump
echo "Creating MongoDB backup..."
mongodump \
    --uri="mongodb://localhost:27017" \
    --db="$DB_NAME" \
    --out="$BACKUP_FILE" \
    --quiet

if [ $? -eq 0 ]; then
    echo "✓ MongoDB dump created successfully"
else
    echo "✗ MongoDB dump failed"
    exit 1
fi

# Compress the backup
echo "Compressing backup..."
tar -czf "${BACKUP_FILE}.tar.gz" -C "$BACKUP_DIR" "$(basename $BACKUP_FILE)"
rm -rf "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}.tar.gz" | cut -f1)
    echo "✓ Backup compressed successfully (Size: $BACKUP_SIZE)"
else
    echo "✗ Compression failed"
    exit 1
fi

# Remove backups older than RETENTION_DAYS
echo "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
echo "✓ Old backups cleaned up"

# Keep only MAX_BACKUPS most recent backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | wc -l)
if [ $BACKUP_COUNT -gt $MAX_BACKUPS ]; then
    echo "Removing excess backups (keeping last $MAX_BACKUPS)..."
    ls -1t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
    echo "✓ Excess backups removed"
fi

# Calculate total backup storage used
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

echo "========================================="
echo "Backup completed successfully!"
echo "End Time: $(date)"
echo "Total Backup Storage: $TOTAL_SIZE"
echo "========================================="

# Log backup completion
echo "[$(date)] Backup completed: ${BACKUP_FILE}.tar.gz" >> "$BACKUP_DIR/backup.log"

exit 0
