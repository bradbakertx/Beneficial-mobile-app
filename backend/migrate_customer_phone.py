"""
Migration script to add customer_phone to existing inspections
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def migrate_customer_phone():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.beneficial_inspections
    
    # Get all inspections
    inspections = await db.inspections.find({}).to_list(1000)
    
    print(f"\n✅ Found {len(inspections)} inspections")
    
    updated_count = 0
    for inspection in inspections:
        # If customer_phone is missing or None, try to get it from the user
        if not inspection.get("customer_phone"):
            customer_id = inspection.get("customer_id")
            
            # Skip manual entries
            if customer_id == "manual-entry":
                continue
            
            # Get customer user account
            customer = await db.users.find_one({"id": customer_id})
            if customer and customer.get("phone"):
                # Update inspection with customer phone
                await db.inspections.update_one(
                    {"id": inspection["id"]},
                    {"$set": {"customer_phone": customer["phone"]}}
                )
                print(f"  Updated inspection {inspection['id'][:8]}... with phone: {customer['phone']}")
                updated_count += 1
    
    print(f"\n✅ Updated {updated_count} inspections with customer phone numbers")

asyncio.run(migrate_customer_phone())
