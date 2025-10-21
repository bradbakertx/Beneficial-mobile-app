#!/bin/bash
#
# Backup Monitoring Script
# Shows backup status, latest backups, and alerts for issues
#

echo "========================================="
echo "Backup System Status Report"
echo "========================================="
echo "Generated: $(date)"
echo ""

# Check if cron is running
echo "📋 CRON SERVICE STATUS:"
if service cron status | grep -q "running"; then
    echo "  ✓ Cron service: RUNNING"
else
    echo "  ✗ Cron service: NOT RUNNING"
fi
echo ""

# Check cron job
echo "📅 SCHEDULED BACKUP JOB:"
if crontab -l 2>/dev/null | grep -q "backup_to_s3.sh"; then
    echo "  ✓ Daily backup scheduled at 2:00 AM"
    crontab -l | grep backup
else
    echo "  ✗ No backup cron job found!"
fi
echo ""

# Check local backups
echo "💾 LOCAL BACKUPS:"
if [ -d "/app/backups/mongodb" ]; then
    BACKUP_COUNT=$(ls -1 /app/backups/mongodb/backup_*.tar.gz 2>/dev/null | wc -l)
    echo "  Total backups: $BACKUP_COUNT"
    
    if [ $BACKUP_COUNT -gt 0 ]; then
        LATEST_BACKUP=$(ls -t /app/backups/mongodb/backup_*.tar.gz 2>/dev/null | head -1)
        BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
        BACKUP_DATE=$(stat -c %y "$LATEST_BACKUP" | cut -d' ' -f1-2)
        BACKUP_AGE_HOURS=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 3600 ))
        
        echo "  Latest backup: $(basename $LATEST_BACKUP)"
        echo "  Size: $BACKUP_SIZE"
        echo "  Created: $BACKUP_DATE"
        echo "  Age: $BACKUP_AGE_HOURS hours ago"
        
        # Alert if backup is old
        if [ $BACKUP_AGE_HOURS -gt 48 ]; then
            echo "  ⚠️  WARNING: Backup is older than 48 hours!"
        else
            echo "  ✓ Backup is recent"
        fi
    else
        echo "  ✗ No local backups found!"
    fi
    
    # Check disk space
    DISK_USAGE=$(df -h /app/backups | tail -1 | awk '{print $5}' | sed 's/%//')
    echo "  Disk usage: ${DISK_USAGE}%"
    if [ $DISK_USAGE -gt 80 ]; then
        echo "  ⚠️  WARNING: Disk space is running low!"
    fi
else
    echo "  ✗ Backup directory not found!"
fi
echo ""

# Check S3 backups
echo "☁️  S3 BACKUPS:"
if command -v aws &> /dev/null; then
    # Load AWS credentials
    if [ -f "/app/backend/.env" ]; then
        export $(grep -E "AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_REGION|AWS_S3_BACKUP_BUCKET" /app/backend/.env | xargs)
    fi
    
    if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
        S3_BUCKET="${AWS_S3_BACKUP_BUCKET:-beneficial-inspections-backups}"
        
        S3_COUNT=$(aws s3 ls s3://$S3_BUCKET/mongodb-backups/ --region ${AWS_REGION:-us-east-2} 2>/dev/null | grep -c ".tar.gz" || echo "0")
        echo "  Total S3 backups: $S3_COUNT"
        
        if [ $S3_COUNT -gt 0 ]; then
            LATEST_S3=$(aws s3 ls s3://$S3_BUCKET/mongodb-backups/ --region ${AWS_REGION:-us-east-2} 2>/dev/null | tail -1)
            if [ -n "$LATEST_S3" ]; then
                echo "  Latest S3 backup: $(echo $LATEST_S3 | awk '{print $4}')"
                echo "  Date: $(echo $LATEST_S3 | awk '{print $1, $2}')"
                echo "  Size: $(echo $LATEST_S3 | awk '{print $3}') bytes"
                echo "  ✓ S3 backups available"
            fi
        else
            echo "  ⚠️  No S3 backups found"
        fi
    else
        echo "  ⚠️  AWS credentials not configured"
    fi
else
    echo "  ⚠️  AWS CLI not installed"
fi
echo ""

# Check backup logs
echo "📄 RECENT BACKUP LOG (last 10 lines):"
if [ -f "/app/backups/cron.log" ]; then
    tail -10 /app/backups/cron.log
    echo ""
    
    # Check for errors
    ERROR_COUNT=$(grep -i "error\|failed\|✗" /app/backups/cron.log 2>/dev/null | wc -l)
    if [ $ERROR_COUNT -gt 0 ]; then
        echo "  ⚠️  Found $ERROR_COUNT errors in log"
        echo "  Recent errors:"
        grep -i "error\|failed\|✗" /app/backups/cron.log | tail -3
    else
        echo "  ✓ No errors found in backup log"
    fi
else
    echo "  ⚠️  Backup log not found (backups may not have run yet)"
fi
echo ""

# Summary
echo "========================================="
echo "SUMMARY:"
echo "========================================="

# Count issues
ISSUES=0

# Check various conditions
if ! service cron status | grep -q "running"; then
    echo "⚠️  Cron service not running"
    ((ISSUES++))
fi

if [ ! -f "/app/backups/cron.log" ]; then
    echo "⚠️  No backup log found - backups may not have run"
    ((ISSUES++))
fi

if [ $BACKUP_COUNT -eq 0 ]; then
    echo "⚠️  No local backups found"
    ((ISSUES++))
fi

if [ $BACKUP_AGE_HOURS -gt 48 ]; then
    echo "⚠️  Latest backup is older than 48 hours"
    ((ISSUES++))
fi

if [ $DISK_USAGE -gt 80 ]; then
    echo "⚠️  Disk space running low"
    ((ISSUES++))
fi

if [ $ISSUES -eq 0 ]; then
    echo "✓ All systems operational - no issues detected"
else
    echo "Found $ISSUES issue(s) that need attention"
fi

echo ""
echo "========================================="
echo "Next scheduled backup: Tonight at 2:00 AM"
echo "========================================="
