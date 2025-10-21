#!/usr/bin/env python3
"""
Database Cleanup Script - Clear Test Data
Deletes messages, inspections, quotes, and S3 reports while keeping users and profile pictures
"""

import asyncio
import os
import sys
import boto3
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

# MongoDB connection
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'test_database')

# AWS S3 configuration
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-2')
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME', 'beneficial-inspections-reports')

print("=" * 60)
print("DATABASE CLEANUP SCRIPT")
print("=" * 60)
print("\nThis will DELETE:")
print("  ✓ All chat messages")
print("  ✓ All inspections")
print("  ✓ All manual inspections")
print("  ✓ All quotes")
print("  ✓ All inspection reports from S3")
print("\nThis will KEEP:")
print("  ✓ All user accounts")
print("  ✓ All profile pictures in S3")
print("=" * 60)

async def cleanup_database():
    """Clean up MongoDB collections"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n📊 Connecting to MongoDB...")
    
    # Count before deletion
    messages_count = await db.messages.count_documents({})
    inspections_count = await db.inspections.count_documents({})
    quotes_count = await db.quotes.count_documents({})
    manual_inspections_count = await db.manual_inspections.count_documents({})
    users_count = await db.users.count_documents({})
    
    print(f"\n📈 Current Data:")
    print(f"  Messages: {messages_count}")
    print(f"  Inspections: {inspections_count}")
    print(f"  Manual Inspections: {manual_inspections_count}")
    print(f"  Quotes: {quotes_count}")
    print(f"  Users: {users_count} (will be kept)")
    
    # Delete collections
    print("\n🗑️  Deleting data...")
    
    print("  Deleting messages...")
    result = await db.messages.delete_many({})
    print(f"    ✓ Deleted {result.deleted_count} messages")
    
    print("  Deleting inspections...")
    result = await db.inspections.delete_many({})
    print(f"    ✓ Deleted {result.deleted_count} inspections")
    
    print("  Deleting manual inspections...")
    result = await db.manual_inspections.delete_many({})
    print(f"    ✓ Deleted {result.deleted_count} manual inspections")
    
    print("  Deleting quotes...")
    result = await db.quotes.delete_many({})
    print(f"    ✓ Deleted {result.deleted_count} quotes")
    
    client.close()
    print("\n✓ MongoDB cleanup complete!")

def cleanup_s3_reports():
    """Delete inspection reports from S3 (keep profile pictures)"""
    print("\n☁️  Cleaning up S3 reports...")
    
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
        print("  ⚠️  AWS credentials not configured, skipping S3 cleanup")
        return
    
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )
        
        # List all objects in the bucket
        response = s3_client.list_objects_v2(Bucket=S3_BUCKET)
        
        if 'Contents' not in response:
            print("  ✓ No files found in S3 bucket")
            return
        
        deleted_count = 0
        kept_count = 0
        
        for obj in response['Contents']:
            key = obj['Key']
            
            # Keep profile pictures, delete everything else (reports)
            if 'profile_pictures/' in key or key.startswith('profile-'):
                kept_count += 1
                print(f"    → Keeping profile picture: {key}")
            else:
                # Delete inspection reports
                s3_client.delete_object(Bucket=S3_BUCKET, Key=key)
                deleted_count += 1
                print(f"    ✗ Deleted report: {key}")
        
        print(f"\n  ✓ S3 cleanup complete!")
        print(f"    Deleted: {deleted_count} reports")
        print(f"    Kept: {kept_count} profile pictures")
        
    except Exception as e:
        print(f"  ✗ Error cleaning S3: {e}")

async def main():
    """Main cleanup function"""
    print("\n⚠️  WARNING: This action cannot be undone!")
    print("Press Ctrl+C now to cancel, or press Enter to continue...")
    
    try:
        input()
    except KeyboardInterrupt:
        print("\n\n❌ Cleanup cancelled by user")
        sys.exit(0)
    
    print("\n🚀 Starting cleanup...")
    
    # Clean MongoDB
    await cleanup_database()
    
    # Clean S3
    cleanup_s3_reports()
    
    print("\n" + "=" * 60)
    print("✅ CLEANUP COMPLETE!")
    print("=" * 60)
    print("\nYour database is now clean and ready for testing!")
    print("All users and profile pictures have been preserved.")
    print("\n")

if __name__ == "__main__":
    asyncio.run(main())
