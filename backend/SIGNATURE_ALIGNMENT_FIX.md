# Customer Signature Alignment Investigation - Summary

## Issue
Customer signature in the Pre-Inspection Agreement PDF was appearing centered instead of left-aligned, despite previous attempts to fix it using Table and TableStyle alignment properties.

## Root Cause Analysis
The issue was caused by insufficient alignment constraints in the PDF generation:
1. The image itself didn't have explicit horizontal alignment set
2. The table column width was too narrow (only 2 inches), allowing ReportLab to center it within the available page width
3. Default table cell padding might have been contributing to centering behavior

## Solution Implemented
Applied a comprehensive fix to `/app/backend/agreement_service.py` with three key improvements:

### 1. Explicit Image Alignment
```python
img = RLImage(img_buffer, width=2*inch, height=0.67*inch, hAlign='LEFT')
```
Added `hAlign='LEFT'` parameter directly to the RLImage object.

### 2. Full-Width Table Column
```python
page_width = letter[0] - 1.5*inch  # Full width minus margins
signature_table = Table([[img]], colWidths=[page_width])
```
Changed from fixed 2-inch width to full page width (minus margins), ensuring the table spans the entire available width.

### 3. Zero Padding in Table Style
```python
signature_table.setStyle(TableStyle([
    ('ALIGN', (0, 0), (0, 0), 'LEFT'),
    ('VALIGN', (0, 0), (0, 0), 'TOP'),
    ('LEFTPADDING', (0, 0), (0, 0), 0),
    ('RIGHTPADDING', (0, 0), (0, 0), 0),
]))
```
Added explicit LEFTPADDING and RIGHTPADDING set to 0, and used TableStyle constructor for proper formatting.

## Testing
Created test script `/app/backend/test_signature_alignment.py` that:
- Generates a sample signature image with blue line and text
- Creates a full Pre-Inspection Agreement PDF
- Saves output to `/app/backend/test_agreement_signature.pdf`
- Successfully generated 28,177 byte PDF

## Verification Steps
To verify the fix works correctly:

1. **Via Mobile App:**
   - Login as a customer
   - Navigate to an inspection with status 'scheduled'
   - Tap "Sign Agreement" button
   - Sign the agreement and submit
   - Check the emailed PDF to verify signature is left-aligned

2. **Via Test Script:**
   - The generated test PDF at `/app/backend/test_agreement_signature.pdf` can be downloaded
   - Open the PDF and verify the customer signature appears on the left side of the page
   - It should align with the "Customer Signature:" label above it

3. **Expected Result:**
   - Customer signature should be flush left (not centered)
   - Should align with other left-aligned text elements
   - Should match the alignment of the inspector's signature above it

## Files Modified
- `/app/backend/agreement_service.py` (lines 258-267)
- `/app/backend/test_signature_alignment.py` (new test file)
- `/app/test_result.md` (documentation updated)

## Status
✅ Fix implemented and backend restarted
⏳ Awaiting user verification that signature alignment is correct in generated PDFs
