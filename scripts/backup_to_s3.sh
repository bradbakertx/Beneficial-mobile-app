#!/bin/bash
#
# MongoDB Backup Script with S3 Upload
# Backs up MongoDB and uploads to AWS S3 for off-site storage
#
# Usage: ./backup_to_s3.sh
#

set -e

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOCAL_BACKUP_DIR="/app/backups/mongodb"
DB_NAME="test_database"
RETENTION_DAYS=7
S3_BUCKET="${AWS_S3_BACKUP_BUCKET:-beneficial-inspections-backups}"
S3_PREFIX="mongodb-backups"

# AWS credentials should be in environment or .env
# AWS_ACCESS_KEY_ID
# AWS_SECRET_ACCESS_KEY
# AWS_REGION

# Create backup directory
mkdir -p "$LOCAL_BACKUP_DIR"

# Backup filename
BACKUP_FILE="backup_${DB_NAME}_${TIMESTAMP}.tar.gz"
LOCAL_PATH="$LOCAL_BACKUP_DIR/$BACKUP_FILE"

echo "========================================="
echo "MongoDB Backup with S3 Upload"
echo "========================================="
echo "Start Time: $(date)"
echo "Database: $DB_NAME"
echo "S3 Bucket: s3://$S3_BUCKET/$S3_PREFIX/"
echo "========================================="

# Create MongoDB dump
echo "Creating MongoDB backup..."
TEMP_DIR=$(mktemp -d)
mongodump \
    --uri="mongodb://localhost:27017" \
    --db="$DB_NAME" \
    --out="$TEMP_DIR" \
    --quiet

# Compress the backup
echo "Compressing backup..."
tar -czf "$LOCAL_PATH" -C "$TEMP_DIR" .
rm -rf "$TEMP_DIR"

BACKUP_SIZE=$(du -h "$LOCAL_PATH" | cut -f1)
echo "✓ Backup created: $BACKUP_FILE (Size: $BACKUP_SIZE)"

# Upload to S3 (if AWS credentials are configured)
if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "Uploading to S3..."
    
    # Install aws-cli if not present
    if ! command -v aws &> /dev/null; then
        echo "Installing AWS CLI..."
        pip install awscli --quiet
    fi
    
    aws s3 cp "$LOCAL_PATH" "s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_FILE" \
        --region "${AWS_REGION:-us-east-1}" \
        --storage-class STANDARD_IA
    
    if [ $? -eq 0 ]; then
        echo "✓ Backup uploaded to S3 successfully"
        
        # Clean up old S3 backups (keep last 30 days)
        echo "Cleaning up old S3 backups..."
        CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
        aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" | while read -r line; do
            BACKUP_DATE=$(echo "$line" | grep -oP 'backup_.*_\K[0-9]{8}')
            if [ -n "$BACKUP_DATE" ] && [ "$BACKUP_DATE" -lt "$CUTOFF_DATE" ]; then
                FILE_NAME=$(echo "$line" | awk '{print $4}')
                aws s3 rm "s3://$S3_BUCKET/$S3_PREFIX/$FILE_NAME"
                echo "  Removed old backup: $FILE_NAME"
            fi
        done
        echo "✓ S3 cleanup completed"
    else
        echo "⚠ S3 upload failed (backup saved locally)"
    fi
else
    echo "⚠ AWS credentials not configured - backup saved locally only"
    echo "  To enable S3 backups, set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
fi

# Clean up local backups
echo "Cleaning up old local backups..."
find "$LOCAL_BACKUP_DIR" -name "backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

TOTAL_SIZE=$(du -sh "$LOCAL_BACKUP_DIR" | cut -f1)

echo "========================================="
echo "Backup completed successfully!"
echo "Local Storage Used: $TOTAL_SIZE"
echo "End Time: $(date)"
echo "========================================="

# Log backup completion
echo "[$(date)] Backup completed: $BACKUP_FILE" >> "$LOCAL_BACKUP_DIR/backup.log"

exit 0
