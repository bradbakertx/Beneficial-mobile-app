import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_owner():
    # Connect to MongoDB
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client.beneficial_inspections
    
    # Check if owner already exists
    existing = await db.users.find_one({"email": "bradbakertx@gmail.com"})
    if existing:
        print("✅ Owner account already exists!")
        print(f"Email: {existing['email']}")
        print(f"Name: {existing['name']}")
        print(f"Role: {existing['role']}")
        return
    
    # Create owner account
    owner = {
        "id": str(uuid.uuid4()),
        "email": "bradbakertx@gmail.com",
        "password": pwd_context.hash("Beneficial1!"),
        "name": "Brad Baker",
        "phone": "(210) 562-0673",
        "role": "owner",
        "license_number": "7522",
        "has_accepted_terms": True,
        "has_accepted_privacy": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.users.insert_one(owner)
    print("✅ Owner account created successfully!")
    print(f"Email: {owner['email']}")
    print(f"Name: {owner['name']}")
    print(f"Role: {owner['role']}")
    print(f"License: {owner['license_number']}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_owner())
