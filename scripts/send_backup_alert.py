#!/usr/bin/env python3
"""
Backup Alert Email System
Sends email notifications for backup failures and weekly summaries
"""

import os
import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

# Email configuration
GMAIL_USER = os.getenv('GMAIL_USER', 'bradbakertx@gmail.com')
GMAIL_APP_PASSWORD = os.getenv('GMAIL_APP_PASSWORD')
ALERT_EMAIL = GMAIL_USER  # Send alerts to the same Gmail

def send_email(subject, body, is_html=False):
    """Send email via Gmail"""
    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = GMAIL_USER
        msg['To'] = ALERT_EMAIL
        msg['Subject'] = subject
        
        if is_html:
            msg.attach(MIMEText(body, 'html'))
        else:
            msg.attach(MIMEText(body, 'plain'))
        
        # Connect to Gmail SMTP
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.send_message(msg)
        
        print(f"✓ Email sent successfully to {ALERT_EMAIL}")
        return True
    except Exception as e:
        print(f"✗ Failed to send email: {e}")
        return False

def send_failure_alert(error_message):
    """Send alert when backup fails"""
    subject = "🚨 BACKUP FAILURE - Beneficial Inspections"
    
    body = f"""
BACKUP FAILURE ALERT
====================

Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Status: FAILED

Error Details:
{error_message}

Action Required:
1. Check backup logs: /app/backups/cron.log
2. Verify disk space is available
3. Check AWS S3 credentials
4. Run manual backup to test: /app/scripts/backup_to_s3.sh

If issue persists, contact support.

---
Automated alert from Beneficial Inspections Backup System
"""
    
    return send_email(subject, body)

def send_weekly_summary():
    """Send weekly backup summary"""
    import subprocess
    
    # Run monitoring script and capture output
    try:
        result = subprocess.run(
            ['/app/scripts/check_backups.sh'],
            capture_output=True,
            text=True,
            timeout=30
        )
        report = result.stdout
    except Exception as e:
        report = f"Failed to generate report: {e}"
    
    subject = "📊 Weekly Backup Report - Beneficial Inspections"
    
    body = f"""
WEEKLY BACKUP SUMMARY
=====================

Generated: {datetime.now().strftime('%A, %B %d, %Y at %I:%M %p')}

{report}

---

Next Steps:
- If you see warnings, investigate the specific issues
- All backups are stored in AWS S3: beneficial-inspections-backups
- To manually check status, run: /app/scripts/check_backups.sh

---
Automated weekly report from Beneficial Inspections Backup System
"""
    
    return send_email(subject, body)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: send_backup_alert.py [failure|weekly]")
        sys.exit(1)
    
    alert_type = sys.argv[1]
    
    if alert_type == "failure":
        error_msg = sys.argv[2] if len(sys.argv) > 2 else "Unknown error"
        send_failure_alert(error_msg)
    elif alert_type == "weekly":
        send_weekly_summary()
    else:
        print(f"Unknown alert type: {alert_type}")
        sys.exit(1)
