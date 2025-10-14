import boto3
import logging
import os
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# AWS S3 Configuration
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_S3_BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION", "us-east-2")

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)


def upload_agreement_to_s3(inspection_id: str, pdf_bytes: bytes) -> dict:
    """
    Upload a pre-inspection agreement PDF to S3
    
    Args:
        inspection_id: Unique inspection ID
        pdf_bytes: PDF file content as bytes
    
    Returns:
        dict with 's3_key' and 's3_url' if successful, raises exception otherwise
    """
    try:
        # Create S3 key (path) for the agreement
        s3_key = f"agreements/inspection-{inspection_id}-agreement.pdf"
        
        # Upload to S3
        s3_client.put_object(
            Bucket=AWS_S3_BUCKET_NAME,
            Key=s3_key,
            Body=pdf_bytes,
            ContentType='application/pdf',
            # Make it private - only accessible with signed URLs
            ACL='private'
        )
        
        logger.info(f"Successfully uploaded agreement to S3: {s3_key}")
        
        # Generate the S3 URL (not directly accessible, will need signed URL)
        s3_url = f"https://{AWS_S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
        
        return {
            "s3_key": s3_key,
            "s3_url": s3_url,
            "bucket": AWS_S3_BUCKET_NAME
        }
        
    except ClientError as e:
        logger.error(f"Failed to upload agreement to S3: {str(e)}")
        raise Exception(f"S3 upload failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error uploading to S3: {str(e)}")
        raise


def get_agreement_download_url(s3_key: str, expiration: int = 3600) -> str:
    """
    Generate a pre-signed URL for downloading an agreement from S3
    
    Args:
        s3_key: S3 key (path) of the agreement file
        expiration: URL expiration time in seconds (default 1 hour)
    
    Returns:
        Pre-signed URL string that can be used to download the file
    """
    try:
        # Generate pre-signed URL
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': AWS_S3_BUCKET_NAME,
                'Key': s3_key
            },
            ExpiresIn=expiration
        )
        
        logger.info(f"Generated pre-signed URL for {s3_key}")
        return url
        
    except ClientError as e:
        logger.error(f"Failed to generate pre-signed URL: {str(e)}")
        raise Exception(f"Failed to generate download URL: {str(e)}")


def upload_report_to_s3(inspection_id: str, pdf_bytes: bytes, suffix: str = "") -> dict:
    """
    Upload an inspection report PDF to S3
    
    Args:
        inspection_id: Unique inspection ID
        pdf_bytes: PDF file content as bytes
        suffix: Optional suffix for filename (e.g., "-1", "-2" for multiple files)
    
    Returns:
        dict with 's3_key' and 's3_url' if successful, raises exception otherwise
    """
    try:
        # Create S3 key (path) for the report
        s3_key = f"reports/inspection-{inspection_id}-report{suffix}.pdf"
        
        # Upload to S3
        s3_client.put_object(
            Bucket=AWS_S3_BUCKET_NAME,
            Key=s3_key,
            Body=pdf_bytes,
            ContentType='application/pdf',
            ACL='private'
        )
        
        logger.info(f"Successfully uploaded report to S3: {s3_key}")
        
        s3_url = f"https://{AWS_S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
        
        return {
            "s3_key": s3_key,
            "s3_url": s3_url,
            "bucket": AWS_S3_BUCKET_NAME
        }
        
    except ClientError as e:
        logger.error(f"Failed to upload report to S3: {str(e)}")
        raise Exception(f"S3 upload failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error uploading report to S3: {str(e)}")
        raise


def get_report_download_url(s3_key: str, expiration: int = 3600) -> str:
    """
    Generate a pre-signed URL for downloading a report from S3
    
    Args:
        s3_key: S3 key (path) of the report file
        expiration: URL expiration time in seconds (default 1 hour)
    
    Returns:
        Pre-signed URL string that can be used to download the file
    """
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': AWS_S3_BUCKET_NAME,
                'Key': s3_key
            },
            ExpiresIn=expiration
        )
        
        logger.info(f"Generated pre-signed URL for report {s3_key}")
        return url
        
    except ClientError as e:
        logger.error(f"Failed to generate pre-signed URL for report: {str(e)}")
        raise Exception(f"Failed to generate download URL: {str(e)}")


def delete_file_from_s3(s3_key: str) -> bool:
    """
    Delete a file from S3
    
    Args:
        s3_key: S3 key (path) of the file to delete
    
    Returns:
        True if successful, raises exception otherwise
    """
    try:
        s3_client.delete_object(
            Bucket=AWS_S3_BUCKET_NAME,
            Key=s3_key
        )
        
        logger.info(f"Successfully deleted file from S3: {s3_key}")
        return True
        
    except ClientError as e:
        logger.error(f"Failed to delete file from S3: {str(e)}")
        raise Exception(f"S3 delete failed: {str(e)}")
