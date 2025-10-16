#!/usr/bin/env python3
"""
Database Reset Script - Clean Slate for New Architecture
Deletes all users and related data, then creates Owner account
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime
import uuid
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.beneficial_inspections

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def reset_database():
    """Clean database and create fresh owner account"""
    
    print("🗑️  Starting database reset...")
    
    # 1. Delete all users
    users_result = await db.users.delete_many({})
    print(f"   ✅ Deleted {users_result.deleted_count} users")
    
    # 2. Delete all quotes
    quotes_result = await db.quotes.delete_many({})
    print(f"   ✅ Deleted {quotes_result.deleted_count} quotes")
    
    # 3. Delete all inspections
    inspections_result = await db.inspections.delete_many({})
    print(f"   ✅ Deleted {inspections_result.deleted_count} inspections")
    
    # 4. Delete all manual inspections
    manual_result = await db.manual_inspections.delete_many({})
    print(f"   ✅ Deleted {manual_result.deleted_count} manual inspections")
    
    # 5. Delete all messages
    messages_result = await db.messages.delete_many({})
    print(f"   ✅ Deleted {messages_result.deleted_count} messages")
    
    print("\n👤 Creating Owner account...")
    
    # 6. Create Owner account
    owner_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash("Beneficial1!")
    
    owner = {
        "id": owner_id,
        "email": "bradbakertx@gmail.com",
        "name": "Brad Baker",
        "role": "owner",
        "hashed_password": hashed_password,
        "phone": None,
        "profile_picture": None,
        "push_token": None,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(owner)
    print(f"   ✅ Created Owner: Brad Baker (bradbakertx@gmail.com)")
    print(f"   🔑 Owner ID: {owner_id}")
    
    # 7. Create unique index on email
    await db.users.create_index("email", unique=True)
    print("   ✅ Created unique index on email")
    
    # 8. Create unique index on role=owner (ensure only one owner)
    # Note: Can't create unique index on role="owner" directly in MongoDB
    # Will enforce in application code
    
    print("\n✅ Database reset complete!")
    print("\n📋 Summary:")
    print(f"   - Owner Account: bradbakertx@gmail.com / Beneficial1!")
    print(f"   - Owner ID: {owner_id}")
    print(f"   - All old data removed")
    print(f"   - Ready for new reference-based architecture")

if __name__ == "__main__":
    asyncio.run(reset_database())
