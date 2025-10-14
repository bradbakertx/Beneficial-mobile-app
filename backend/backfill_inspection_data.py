"""
Backfill existing inspections with property details from their associated quotes
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def backfill_inspection_data():
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DB_NAME", "test_database")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Get all inspections
    inspections = await db.inspections.find({}).to_list(1000)
    
    print(f"\nFound {len(inspections)} inspections to check")
    updated_count = 0
    
    for inspection in inspections:
        quote_id = inspection.get("quote_id")
        if not quote_id:
            print(f"  Skipping inspection {inspection['id']} - no quote_id")
            continue
        
        # Get the associated quote
        quote = await db.quotes.find_one({"id": quote_id})
        if not quote:
            print(f"  Skipping inspection {inspection['id']} - quote not found")
            continue
        
        # Check if inspection is missing property details
        needs_update = False
        update_fields = {}
        
        if not inspection.get("square_feet") and quote.get("square_feet"):
            update_fields["square_feet"] = quote["square_feet"]
            needs_update = True
        
        if not inspection.get("year_built") and quote.get("year_built"):
            update_fields["year_built"] = quote["year_built"]
            needs_update = True
        
        if not inspection.get("foundation_type") and quote.get("foundation_type"):
            update_fields["foundation_type"] = quote["foundation_type"]
            needs_update = True
        
        if not inspection.get("property_type") and quote.get("property_type"):
            update_fields["property_type"] = quote["property_type"]
            needs_update = True
        
        if not inspection.get("num_buildings") and quote.get("num_buildings"):
            update_fields["num_buildings"] = quote["num_buildings"]
            needs_update = True
        
        if not inspection.get("num_units") and quote.get("num_units"):
            update_fields["num_units"] = quote["num_units"]
            needs_update = True
        
        if needs_update:
            await db.inspections.update_one(
                {"id": inspection["id"]},
                {"$set": update_fields}
            )
            updated_count += 1
            print(f"  ✅ Updated inspection {inspection['id'][:8]}... with {list(update_fields.keys())}")
    
    print(f"\n✅ Backfill complete: Updated {updated_count} inspections")
    await client.close()

if __name__ == "__main__":
    asyncio.run(backfill_inspection_data())
