"""
Test script to verify customer signature alignment in PDF
"""

import base64
from PIL import Image, ImageDraw
from io import BytesIO
from agreement_service import generate_agreement_pdf

# Create a simple test signature image
def create_test_signature():
    """Create a simple test signature with text"""
    # Create a white image
    img = Image.new('RGB', (400, 100), color='white')
    draw = ImageDraw.Draw(img)
    
    # Draw a simple signature-like line
    draw.line([(10, 50), (100, 30), (200, 60), (300, 40), (390, 55)], fill='blue', width=3)
    draw.text((10, 70), "John Customer", fill='blue')
    
    # Convert to base64
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    img_bytes = buffer.getvalue()
    return f"data:image/png;base64,{base64.b64encode(img_bytes).decode()}"

# Generate test PDF
signature_base64 = create_test_signature()

pdf_bytes = generate_agreement_pdf(
    client_name="John Doe",
    inspection_address="123 Test Street, Austin, TX 78701",
    fee_amount="500",
    inspection_date="June 20, 2025",
    inspection_time="10:00 AM",
    signature_base64=signature_base64,
    inspector_name="Brad Baker",
    inspector_license="TREC LIC. # 7522"
)

# Save to file
output_path = "/app/backend/test_agreement_signature.pdf"
with open(output_path, 'wb') as f:
    f.write(pdf_bytes)

print(f"✅ Test PDF generated successfully: {output_path}")
print(f"📄 PDF size: {len(pdf_bytes)} bytes")
print("\nTo verify the signature alignment:")
print("1. Download the PDF from the backend")
print("2. Check that the customer signature is left-aligned (not centered)")
print("3. The signature should align with the 'Customer Signature:' label above it")
