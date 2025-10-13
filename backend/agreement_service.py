"""
Pre-Inspection Agreement Service
Handles agreement generation, PDF creation, and email delivery
"""

import os
import io
import base64
import logging
import requests
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from PIL import Image as PILImage

logger = logging.getLogger(__name__)

AGREEMENT_TEMPLATE = """
Beneficial Inspections, Inc
24114 Alpine Lodge
San Antonio, TX 78258
(210) 562-0673

Prepared For: {client_name}
Inspection Address: {inspection_address}

Client understands and agrees that acceptance or use of this report constitutes complete agreement to the terms and conditions specified herein. No verbal statement by the inspector shall expand the scope of this report. This report does not include inspection or any other conditions that may be on other contracts, forms or statements pertaining to this property. No change or modification shall be enforceable against any party unless such is in writing and signed by both parties.

An inspection fee of ${fee_amount} will be paid by Client at the time of inspection, or an inspection fee of ${fee_amount} + $100 is agreed to be paid at closing. In the event of the Earnest Money Contract does not close, client authorizes the escrow agent to pay this fee out of the earnest money before it is returned to Client.

Client has employed this Inspection Company to complete a Structural and Mechanical Inspection Report on the above described property. This report is solely between the Inspection Company and the Client. Disclosure of the findings in this report are at the discretion of the Client.

Client or authorized agent authorizes distribution of this report to Buyer, ☑ Agent(s), ☐ Title Company, ☐ Other.

It is the intention of this report to indicate which items were inspected and to help locate and indicate major structural and/or mechanical deficiencies discernible to the Inspector at the time of this inspection. All items indicated were inspected to determine if they were performing the function for which intended at the time of this inspection. This report outlines a non-destructive inspection of this building and major components of such that were discernible and readily accessible to the Inspector. The Inspector did not dig, probe, dismantle equipment, or remove permanent materials on items which could be damaged by such.

THIS REPORT IS MADE BASED ON A VISUAL INSPECTION OF READILY ACCESSIBLE AREAS ONLY.

Inaccessible areas include, but are not limited to : attics or portions thereof, behind or under insulation, inside walls, locked rooms, behind or under large appliances, furniture, stored items, crawl spaces less than three (3) feet high, crawl openings not large enough to crawl through, and any areas that are, in the Inspectors opinion, hazardous.

This report does not include violations of state and/or local codes, including building, electrical, plumbing, fire and health codes, unless, in the Inspectors opinion, the violation constitutes a safety hazard.

This inspection is not intended to address the possible presence of, or danger from, asbestos, radon gas, lead paint, ureaformaldehyde, toxic or flammable chemicals. Similarly, water or airborne related illness or disease, and all other similar potentially harmful substances are not addressed. The Client should contact a specialist if information, identification or testing of these substances is desired.

This Inspection Company does NOT inspect the following: BURIED OR HIDDEN PLUMBING AND GAS LINES, CENTRAL VACUUM SYSTEMS, SOLAR HEATING, WATER SOFTENERS, ALARM SYSTEMS, INTERCOMS, LAUNDRY EQUIPMENT, AIR HUMIDIFIERS, WATER FILTERS.

The Inspector has the fundamental knowledge required to perform a competent inspection of this structure and the mechanical devices of such. The Inspector does not represent himself to be an expert or professional engineer in any area of this inspection. the Client is advised that the findings in this report are strictly the opinion of the Inspector and the client should seek professional opinions if any questions or doubts arise from this report. The Inspector has met the requirements to perform these inspections as set forth by the Texas Real Estate Commission.

WARRANTY
NO WARRANTY OR GUARANTEE IS EXPRESSED OR IMPLIED, AS TO SCOPE, THOROUGHNESS, OR ACCURACY OF THIS REPORT. THIS REPORT IS VALID ONLY FOR THE DAY OF INSPECTION. APPLIANCES AND BUILDING SYSTEMS CAN DEVELOP PROBLEMS AT ANY TIME AFTER THIS INSPECTION AND THE INSPECTOR HAS NO CONTROL OVER THIS, OR ANY WHO ENTER AND ALTER THIS BUILDING OR ITEMS WITHIN. CLIENT IS REMINDED THAT THERE IS NO REPRESENTATION OF WARRANTY OR GUARANTEE ON THE FUTURE LIFE OR ITEMS INSPECTED.

LIMITATION OF LIABILITY
A. The liability of this Company is strictly limited to the specific areas which are inspected. This inspection is performed in accordance with inspection standards mandated by the Texas Real Estate Commission.
B. Client agrees that this company shall have no liability for latent defects which could not be observed through normal inspection or determined by normal operational testing. This Company's liability is specifically limited to those situations where it can be conclusively shown that there was a failure to indicate a device inspected was not performed the function for which it was intended at the time of this inspection.
C. Client agrees this Company will have no liability for failing to detect a defect where such was coved up or concealed, whether intentional or otherwise.
D. Client agrees that this company shall have no liability for incidental or consequential damages.
E. Actual damages for any discrepancies, negligence or otherwise are limited to the amount of the fee charged for this inspection.

DISPUTES
A. In the event a dispute should develop, Client agrees to the following procedure:
Client shall notify this Company of the problem by telephone, or otherwise within two (2) business days and allow this Company five (5) business days to respond to the Client's call.
B. In the event a problem has not been resolved and the client desires to make a formal complaint, client shall initiate the complaint procedure by sending a written complaint to the Company by certified mail, return receipt requested, fully explaining the nature of the complaint.
C. CLIENT AGREES NOT TO DISTURB OR REPAIR ANYTHING WHICH MAY CONSTITUTE EVIDENCE RELATING TO THE COMPLAINT, EXCEPT IN THE CASE OF AN EMERGENCY.
D. Client agrees to allow this Company thirty (30) days from the date of written notice to examine the items involved and determine if further action should be taken.
E. IF THE DISPUTE CANNOT BE RESOLVED BY NEGOTIATION, THE DISPUTE SHALL BE SUBMITTED TO MEDIATION BEFORE RESORT TO LITIGATION. The cost of mediation services shall be shared equally by the parties to the dispute. If a lawsuit is filed by the client and this Company successfully defends such suit, Client agrees to pay this company's attorney's fees incurred in defending against such suit.

COMPANY RELATIONSHIPS/THIRD PARTY PROVIDERS
Beneficial Inspections, Inc. may have an affiliation with third-party service providers ("TPSP") in order to offer value-added services to clients. The company may also arrange for these TPSP to send literature or make post-inspection contact with the company's clients.

Date of Service: {inspection_date}, at {inspection_time}

CAUTION: This legal document consists of 2 pages. You are advised to read them and fully understand the contents of this report.

ACCEPTED AND AGREED TO BY:

{inspector_name} - {inspector_license}

{client_name}
"""


def get_agreement_text(client_name: str, inspection_address: str, fee_amount: str, 
                      inspection_date: str, inspection_time: str, inspector_name: str = "Brad Baker",
                      inspector_license: str = "TREC LIC. # 7522") -> str:
    """
    Generate agreement text with customer-specific data
    """
    return AGREEMENT_TEMPLATE.format(
        client_name=client_name,
        inspection_address=inspection_address,
        fee_amount=fee_amount,
        inspection_date=inspection_date,
        inspection_time=inspection_time,
        inspector_name=inspector_name,
        inspector_license=inspector_license
    )


def generate_agreement_pdf(
    client_name: str,
    inspection_address: str,
    fee_amount: str,
    inspection_date: str,
    inspection_time: str,
    signature_base64: str,
    inspector_name: str = "Brad Baker",
    inspector_license: str = "TREC LIC. # 7522"
) -> bytes:
    """
    Generate PDF with agreement text and customer signature
    Returns PDF as bytes
    """
    # Map inspector names to signature URLs
    INSPECTOR_SIGNATURES = {
        "Brad Baker": "https://customer-assets.emergentagent.com/job_scheduleplus-12/artifacts/fqhox4zb_BradSig.jpg",
        "Blake Gray": None  # TODO: Add Blake's signature URL when available
    }
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                           rightMargin=0.75*inch, leftMargin=0.75*inch,
                           topMargin=0.75*inch, bottomMargin=0.75*inch)
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Heading1'],
        fontSize=14,
        textColor='black',
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Times-Bold'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=10,
        textColor='black',
        spaceAfter=8,
        leading=14,
        alignment=TA_LEFT,
        fontName='Times-Roman'
    )
    
    bold_style = ParagraphStyle(
        'CustomBold',
        parent=styles['BodyText'],
        fontSize=10,
        textColor='black',
        spaceAfter=8,
        leading=14,
        fontName='Times-Bold'
    )
    
    # Build content
    story = []
    
    # Header
    story.append(Paragraph("Beneficial Inspections, Inc", header_style))
    story.append(Paragraph("24114 Alpine Lodge", body_style))
    story.append(Paragraph("San Antonio, TX 78258", body_style))
    story.append(Paragraph("(210) 562-0673", body_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Client info
    story.append(Paragraph(f"<b>Prepared For:</b> {client_name}", body_style))
    story.append(Paragraph(f"<b>Inspection Address:</b> {inspection_address}", body_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Split agreement text into paragraphs
    agreement_text = get_agreement_text(client_name, inspection_address, fee_amount, 
                                       inspection_date, inspection_time)
    
    # Process each paragraph
    for para in agreement_text.split('\n\n'):
        para = para.strip()
        if not para:
            continue
        
        # Skip header info (already added)
        if para.startswith('Beneficial Inspections') or para.startswith('Prepared For'):
            continue
            
        # Bold sections
        if para.startswith('WARRANTY') or para.startswith('LIMITATION OF LIABILITY') or \
           para.startswith('DISPUTES') or para.startswith('COMPANY RELATIONSHIPS') or \
           para.startswith('THIS REPORT IS MADE') or para.startswith('CAUTION'):
            story.append(Paragraph(para, bold_style))
        else:
            # Replace newlines with <br/> tags for proper rendering
            para = para.replace('\n', '<br/>')
            story.append(Paragraph(para, body_style))
        
        story.append(Spacer(1, 0.1*inch))
    
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("<b>ACCEPTED AND AGREED TO BY:</b>", body_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Add Brad Baker's signature
    try:
        import requests
        brad_sig_url = "https://customer-assets.emergentagent.com/job_scheduleplus-12/artifacts/fqhox4zb_BradSig.jpg"
        brad_sig_response = requests.get(brad_sig_url)
        brad_sig_bytes = io.BytesIO(brad_sig_response.content)
        
        # Add Brad's signature
        brad_sig_img = RLImage(brad_sig_bytes, width=2*inch, height=0.8*inch)
        story.append(brad_sig_img)
    except Exception as e:
        logger.error(f"Error adding Brad's signature to PDF: {e}")
        story.append(Paragraph("[Brad Baker Signature]", body_style))
    
    story.append(Paragraph("Bradley Baker - TREC LIC. # 7522", body_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Add customer signature
    story.append(Paragraph("<b>Customer Signature:</b>", body_style))
    story.append(Spacer(1, 0.1*inch))
    
    # Add signature image
    try:
        # Decode base64 signature
        signature_data = signature_base64.split(',')[1] if ',' in signature_base64 else signature_base64
        signature_bytes = base64.b64decode(signature_data)
        
        # Convert to PIL Image and then to ReportLab Image
        signature_img = PILImage.open(io.BytesIO(signature_bytes))
        
        # Save to temporary buffer
        img_buffer = io.BytesIO()
        signature_img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        # Add to PDF (scaled to fit)
        img = RLImage(img_buffer, width=3*inch, height=1*inch)
        story.append(img)
    except Exception as e:
        logger.error(f"Error adding signature to PDF: {e}")
        story.append(Paragraph("[Signature]", body_style))
    
    story.append(Spacer(1, 0.1*inch))
    story.append(Paragraph(f"<b>{client_name}</b>", body_style))
    story.append(Paragraph(f"Signed on: {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p')}", body_style))
    
    # Build PDF
    doc.build(story)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes


def send_agreement_email(
    to_email: str,
    recipient_name: str,
    property_address: str,
    pdf_bytes: bytes
):
    """
    Send signed agreement PDF via email
    """
    from email_service import GMAIL_USER, GMAIL_APP_PASSWORD, SMTP_SERVER, SMTP_PORT
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.base import MIMEBase
    from email import encoders
    
    subject = f"Signed Pre-Inspection Agreement - {property_address}"
    
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #007AFF; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }}
        .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Pre-Inspection Agreement Signed</h1>
        </div>
        <div class="content">
            <p>Dear {recipient_name},</p>
            
            <p>The Pre-Inspection Agreement for <strong>{property_address}</strong> has been signed and is attached to this email.</p>
            
            <p>Please keep this document for your records.</p>
            
            <p>Thank you for choosing Beneficial Inspections!</p>
        </div>
        <div class="footer">
            <p><strong>Beneficial Inspections, Inc.</strong></p>
            <p>24114 Alpine Lodge, San Antonio, TX 78258</p>
            <p>Phone: (210) 562-0673</p>
        </div>
    </div>
</body>
</html>
"""
    
    try:
        msg = MIMEMultipart()
        msg['From'] = f"Beneficial Inspections <{GMAIL_USER}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(html_body, 'html'))
        
        # Attach PDF
        pdf_attachment = MIMEBase('application', 'pdf')
        pdf_attachment.set_payload(pdf_bytes)
        encoders.encode_base64(pdf_attachment)
        pdf_attachment.add_header('Content-Disposition', f'attachment; filename="Pre-Inspection-Agreement-{property_address.replace(" ", "-")}.pdf"')
        msg.attach(pdf_attachment)
        
        # Send email
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        clean_password = GMAIL_APP_PASSWORD.replace(" ", "")
        server.login(GMAIL_USER, clean_password)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Signed agreement PDF sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send agreement PDF to {to_email}: {str(e)}")
        return False
