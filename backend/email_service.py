import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
from icalendar import Calendar, Event
from dateutil import parser
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



def send_inspection_calendar_invite(
    to_email: str,
    recipient_name: str,
    property_address: str,
    inspection_date: str,
    inspection_time: str,
    is_owner: bool = False,
    customer_name: str = None,
    customer_email: str = None,
    customer_phone: str = None,
    inspection_fee: str = None,
    inspector_name: str = "Brad Baker",
    inspector_phone: str = None
):
    """Send inspection calendar invite with .ics attachment including detailed information"""
    
    subject = f"Inspection Scheduled - {property_address}"
    
    # Build detailed notes/description
    notes_lines = []
    notes_lines.append(f"Property Address: {property_address}")
    notes_lines.append(f"Date: {inspection_date}")
    notes_lines.append(f"Time: {inspection_time}")
    notes_lines.append("")
    
    if customer_name:
        notes_lines.append(f"Client Name: {customer_name}")
    if customer_phone:
        notes_lines.append(f"Client Phone: {customer_phone}")
    if customer_email:
        notes_lines.append(f"Client Email: {customer_email}")
    
    if customer_name or customer_phone or customer_email:
        notes_lines.append("")
    
    if inspection_fee:
        notes_lines.append(f"Inspection Fee: ${inspection_fee}")
        notes_lines.append("")
    
    if inspector_name:
        notes_lines.append(f"Inspector: {inspector_name}")
    if inspector_phone:
        notes_lines.append(f"Inspector Phone: {inspector_phone}")
    
    description = "\n".join(notes_lines)
    
    # Create calendar event
    cal = Calendar()
    cal.add('prodid', '-//Beneficial Inspections//Inspection Calendar//EN')
    cal.add('version', '2.0')
    cal.add('method', 'REQUEST')
    
    event = Event()
    event.add('summary', f'Home Inspection - {property_address}')
    event.add('description', description)
    event.add('location', property_address)
    
    # Parse date and time
    try:
        # Combine date and time
        datetime_str = f"{inspection_date} {inspection_time}"
        dt = parser.parse(datetime_str)
        event.add('dtstart', dt)
        # Add 2 hour duration
        event.add('dtend', dt.replace(hour=dt.hour + 2))
    except Exception as e:
        logger.error(f"Error parsing date/time: {e}")
        # Fallback to simple datetime
        event.add('dtstart', datetime.utcnow())
        event.add('dtend', datetime.utcnow())
    
    event.add('dtstamp', datetime.utcnow())
    event.add('uid', f'{property_address.replace(" ", "-")}-{datetime.utcnow().timestamp()}@beneficial-inspections.com')
    event.add('organizer', 'mailto:bradbakertx@gmail.com')
    event.add('attendee', f'mailto:{to_email}')
    event.add('status', 'CONFIRMED')
    
    cal.add_component(event)
    
    # Text version
    text_body = f"""
Dear {recipient_name},

Your home inspection has been scheduled!

Property: {property_address}
Date: {inspection_date}
Time: {inspection_time}

{'As the inspector, please ensure you arrive on time and are prepared with all necessary equipment.' if is_owner else 'We look forward to serving you. Please ensure someone is available to provide access to the property.'}

A calendar invitation is attached to this email.

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
                <p><strong>Date:</strong> {inspection_date}</p>
                <p><strong>Time:</strong> {inspection_time}</p>
            </div>
            
            <p>{'As the inspector, please ensure you arrive on time and are prepared with all necessary equipment.' if is_owner else 'We look forward to serving you. Please ensure someone is available to provide access to the property.'}</p>
            
            <p><strong>A calendar invitation is attached to this email.</strong></p>
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
    
    # Send email with calendar attachment
    try:
        msg = MIMEMultipart('mixed')
        msg['From'] = f"Beneficial Inspections <{GMAIL_USER}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Attach text and HTML versions
        msg_alternative = MIMEMultipart('alternative')
        msg_alternative.attach(MIMEText(text_body, 'plain'))
        msg_alternative.attach(MIMEText(html_body, 'html'))
        msg.attach(msg_alternative)
        
        # Attach calendar file
        ics_part = MIMEBase('text', 'calendar', method='REQUEST', name='invitation.ics')
        ics_part.set_payload(cal.to_ical())
        encoders.encode_base64(ics_part)
        ics_part.add_header('Content-Disposition', 'attachment', filename='invitation.ics')
        msg.attach(ics_part)
        
        # Send
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        clean_password = GMAIL_APP_PASSWORD.replace(" ", "")
        server.login(GMAIL_USER, clean_password)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Calendar invite sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send calendar invite to {to_email}: {str(e)}")
        return False


def send_inspection_calendar_cancellation(
    to_email: str,
    recipient_name: str,
    property_address: str,
    inspection_date: str,
    inspection_time: str,
    is_owner: bool = False
):
    """Send inspection calendar cancellation with .ics attachment"""
    
    subject = f"Inspection CANCELLED - {property_address}"
    
    # Create calendar cancellation event
    cal = Calendar()
    cal.add('prodid', '-//Beneficial Inspections//Inspection Calendar//EN')
    cal.add('version', '2.0')
    cal.add('method', 'CANCEL')  # This tells calendar apps to remove the event
    
    event = Event()
    event.add('summary', f'Home Inspection - {property_address}')
    event.add('description', f'This inspection has been CANCELLED')
    event.add('location', property_address)
    
    # Parse date and time
    try:
        # Combine date and time
        datetime_str = f"{inspection_date} {inspection_time}"
        dt = parser.parse(datetime_str)
        event.add('dtstart', dt)
        # Add 2 hour duration
        event.add('dtend', dt.replace(hour=dt.hour + 2))
    except Exception as e:
        logger.error(f"Error parsing date/time: {e}")
        # Fallback to simple datetime
        event.add('dtstart', datetime.utcnow())
        event.add('dtend', datetime.utcnow())
    
    event.add('dtstamp', datetime.utcnow())
    event.add('uid', f'{property_address.replace(" ", "-")}-{datetime.utcnow().timestamp()}@beneficial-inspections.com')
    event.add('organizer', 'mailto:bradbakertx@gmail.com')
    event.add('attendee', f'mailto:{to_email}')
    event.add('status', 'CANCELLED')
    
    cal.add_component(event)
    
    # Text version
    text_body = f"""
Dear {recipient_name},

This is to notify you that the home inspection has been CANCELLED.

Property: {property_address}
Original Date: {inspection_date}
Original Time: {inspection_time}

{'As the inspector, this cancellation has been noted in your calendar.' if is_owner else 'If you need to reschedule, please contact us.'}

A calendar cancellation is attached to this email.

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
        .schedule-box {{ background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #FF3B30; }}
        .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❌ Inspection CANCELLED</h1>
        </div>
        <div class="content">
            <p>Dear {recipient_name},</p>
            
            <p>This is to notify you that the home inspection has been <strong>CANCELLED</strong>.</p>
            
            <div class="schedule-box">
                <h3>Cancelled Inspection Details:</h3>
                <p><strong>Property:</strong> {property_address}</p>
                <p><strong>Original Date:</strong> {inspection_date}</p>
                <p><strong>Original Time:</strong> {inspection_time}</p>
            </div>
            
            <p>{'As the inspector, this cancellation has been noted in your calendar.' if is_owner else 'If you need to reschedule, please contact us.'}</p>
            
            <p><strong>A calendar cancellation is attached to this email.</strong></p>
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
    
    # Send email with calendar attachment
    try:
        msg = MIMEMultipart('mixed')
        msg['From'] = f"Beneficial Inspections <{GMAIL_USER}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Attach text and HTML versions
        msg_alternative = MIMEMultipart('alternative')
        msg_alternative.attach(MIMEText(text_body, 'plain'))
        msg_alternative.attach(MIMEText(html_body, 'html'))
        msg.attach(msg_alternative)
        
        # Attach calendar file
        ics_part = MIMEBase('text', 'calendar', method='CANCEL', name='cancellation.ics')
        ics_part.set_payload(cal.to_ical())
        encoders.encode_base64(ics_part)
        ics_part.add_header('Content-Disposition', 'attachment', filename='cancellation.ics')
        msg.attach(ics_part)
        
        # Send
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        clean_password = GMAIL_APP_PASSWORD.replace(" ", "")
        server.login(GMAIL_USER, clean_password)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Calendar cancellation sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send calendar cancellation to {to_email}: {str(e)}")
        return False

