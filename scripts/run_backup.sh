#!/bin/bash
# Wrapper script for cron job - loads environment variables

# Load environment variables from backend .env
export $(grep -v '^#' /app/backend/.env | xargs)

# Run backup script
/app/scripts/backup_to_s3.sh
