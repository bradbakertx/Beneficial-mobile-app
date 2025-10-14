import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def cleanup_owner_accounts():
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client.inspections_db
    
    # Find all owner accounts
    owners = await db.users.find({"role": "owner"}).to_list(100)
    
    print(f"\nFound {len(owners)} owner account(s):")
    for owner in owners:
        print(f"  - Email: {owner.get('email')} | Name: {owner.get('name')} | ID: {owner.get('id')}")
    
    # Keep only Brad's account
    brad_email = "bradbakertx@gmail.com"
    deleted_count = 0
    
    for owner in owners:
        if owner.get('email') != brad_email:
            print(f"\n❌ DELETING duplicate owner: {owner.get('email')} (ID: {owner.get('id')})")
            result = await db.users.delete_one({"id": owner.get('id')})
            deleted_count += result.deleted_count
            print(f"   Deleted: {result.deleted_count} document(s)")
    
    # Verify only Brad remains
    remaining = await db.users.find({"role": "owner"}).to_list(100)
    print(f"\n✅ After cleanup: {len(remaining)} owner account(s) remaining")
    print(f"   Total deleted: {deleted_count}")
    for owner in remaining:
        print(f"   - {owner.get('email')} | {owner.get('name')}")
    
    await client.close()

if __name__ == "__main__":
    asyncio.run(cleanup_owner_accounts())
