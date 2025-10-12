import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587


def send_email(to_email: str, subject: str, html_body: str, text_body: str = None):
    """Send an email via Gmail SMTP"""
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = f"Beneficial Inspections <{GMAIL_USER}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Attach text version (fallback)
        if text_body:
            part1 = MIMEText(text_body, 'plain')
            msg.attach(part1)
        
        # Attach HTML version
        part2 = MIMEText(html_body, 'html')
        msg.attach(part2)
        
        # Connect to Gmail SMTP server
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        
        # Remove spaces from app password
        clean_password = GMAIL_APP_PASSWORD.replace(" ", "")
        server.login(GMAIL_USER, clean_password)
        
        # Send email
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False


def send_inspection_cancellation_email(
    to_email: str,
    recipient_name: str,
    property_address: str,
    scheduled_date: str = None,
    scheduled_time: str = None,
    is_owner: bool = False
):
    """Send inspection cancellation notification"""
    
    recipient_type = "Owner" if is_owner else "Customer"
    
    subject = f"Inspection Cancelled - {property_address}"
    
    # Create calendar cancellation (.ics format would go here)
    date_time_str = ""
    if scheduled_date and scheduled_time:
        date_time_str = f" scheduled for {scheduled_date} at {scheduled_time}"
    
    # Text version
    text_body = f"""
Dear {recipient_name},

This email is to notify you that the home inspection{date_time_str} at the following property has been cancelled:

Property Address: {property_address}

If you have any questions or would like to reschedule, please contact us.

Best regards,
Beneficial Inspections
Brad Baker
bradbakertx@gmail.com
"""
    
    # HTML version
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #FF3B30; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }}
        .property-box {{ background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #FF3B30; }}
        .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        .button {{ display: inline-block; padding: 12px 24px; background-color: #007AFF; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Inspection Cancelled</h1>
        </div>
        <div class="content">
            <p>Dear {recipient_name},</p>
            
            <p>This email is to notify you that the home inspection{date_time_str} has been <strong>cancelled</strong>.</p>
            
            <div class="property-box">
                <h3>Property Details:</h3>
                <p><strong>Address:</strong> {property_address}</p>
                {f'<p><strong>Original Date:</strong> {scheduled_date}</p>' if scheduled_date else ''}
                {f'<p><strong>Original Time:</strong> {scheduled_time}</p>' if scheduled_time else ''}
            </div>
            
            <p>If you have any questions or would like to reschedule this inspection, please don't hesitate to contact us.</p>
            
            <p>We apologize for any inconvenience this may cause.</p>
        </div>
        <div class="footer">
            <p><strong>Beneficial Inspections</strong></p>
            <p>Brad Baker</p>
            <p>Email: bradbakertx@gmail.com</p>
        </div>
    </div>
</body>
</html>
"""
    
    return send_email(to_email, subject, html_body, text_body)


def send_quote_notification_email(to_email: str, customer_name: str, property_address: str, quote_amount: float):
    """Send quote price notification to customer"""
    
    subject = f"Your Inspection Quote - {property_address}"
    
    text_body = f"""
Dear {customer_name},

Thank you for your interest in our home inspection services!

We have prepared a quote for the property at:
{property_address}

Quote Amount: ${quote_amount:.2f}

To proceed with scheduling your inspection, please log into your account and accept the quote.

Best regards,
Beneficial Inspections
Brad Baker
bradbakertx@gmail.com
"""
    
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #007AFF; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }}
        .quote-box {{ background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #34C759; text-align: center; }}
        .price {{ font-size: 36px; font-weight: bold; color: #34C759; }}
        .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Your Inspection Quote is Ready!</h1>
        </div>
        <div class="content">
            <p>Dear {customer_name},</p>
            
            <p>Thank you for your interest in our home inspection services!</p>
            
            <p>We have prepared a quote for the property at:</p>
            <p><strong>{property_address}</strong></p>
            
            <div class="quote-box">
                <p>Your Quote Amount</p>
                <div class="price">${quote_amount:.2f}</div>
            </div>
            
            <p>To proceed with scheduling your inspection, please log into your account and accept the quote.</p>
            
            <p>If you have any questions, please don't hesitate to contact us.</p>
        </div>
        <div class="footer">
            <p><strong>Beneficial Inspections</strong></p>
            <p>Brad Baker</p>
            <p>Email: bradbakertx@gmail.com</p>
        </div>
    </div>
</body>
</html>
"""
    
    return send_email(to_email, subject, html_body, text_body)


def send_inspection_scheduled_email(
    to_email: str,
    recipient_name: str,
    property_address: str,
    scheduled_date: str,
    scheduled_time: str,
    is_owner: bool = False
):
    """Send inspection scheduled confirmation"""
    
    subject = f"Inspection Scheduled - {property_address}"
    
    text_body = f"""
Dear {recipient_name},

Your home inspection has been scheduled!

Property: {property_address}
Date: {scheduled_date}
Time: {scheduled_time}

{'As the inspector, please ensure you arrive on time and are prepared with all necessary equipment.' if is_owner else 'We look forward to serving you. Please ensure someone is available to provide access to the property.'}

Best regards,
Beneficial Inspections
Brad Baker
bradbakertx@gmail.com
"""
    
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #34C759; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }}
        .schedule-box {{ background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #34C759; }}
        .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Inspection Scheduled!</h1>
        </div>
        <div class="content">
            <p>Dear {recipient_name},</p>
            
            <p>Your home inspection has been scheduled!</p>
            
            <div class="schedule-box">
                <h3>Inspection Details:</h3>
                <p><strong>Property:</strong> {property_address}</p>
                <p><strong>Date:</strong> {scheduled_date}</p>
                <p><strong>Time:</strong> {scheduled_time}</p>
            </div>
            
            <p>{'As the inspector, please ensure you arrive on time and are prepared with all necessary equipment.' if is_owner else 'We look forward to serving you. Please ensure someone is available to provide access to the property.'}</p>
        </div>
        <div class="footer">
            <p><strong>Beneficial Inspections</strong></p>
            <p>Brad Baker</p>
            <p>Email: bradbakertx@gmail.com</p>
        </div>
    </div>
</body>
</html>
"""
    
    return send_email(to_email, subject, html_body, text_body)
