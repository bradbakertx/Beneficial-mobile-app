from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List
import uuid
from datetime import datetime

from models import (
    UserCreate, UserLogin, UserResponse, TokenResponse, UserInDB, UserRole,
    QuoteCreate, QuoteResponse, QuoteInDB, QuoteStatus,
    InspectionCreate, InspectionResponse, InspectionInDB, InspectionStatus,
    QuotePriceUpdate, InspectionDateTimeUpdate,
    MessageCreate, MessageResponse, MessageInDB, ConversationSummary,
    ManualInspectionCreate, ManualInspectionResponse, ManualInspectionInDB
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    decode_token, require_role
)

security = HTTPBearer()


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'inspection_app')]

# Create the main app without a prefix
app = FastAPI(title="Inspection App API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Dependency to get current user
async def get_current_user_from_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserInDB:
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user_dict = await db.users.find_one({"id": user_id})
    if user_dict is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return UserInDB(**user_dict)


# ============= AUTHENTICATION ENDPOINTS =============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    """Register a new user"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    user_in_db = UserInDB(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        hashed_password=hashed_password,
        created_at=datetime.utcnow()
    )
    
    await db.users.insert_one(user_in_db.dict())
    
    # Create access token
    access_token = create_access_token({"sub": user_id, "role": user_data.role.value})
    
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        created_at=user_in_db.created_at
    )
    
    return TokenResponse(session_token=access_token, user=user_response)


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login user"""
    user_dict = await db.users.find_one({"email": credentials.email})
    if not user_dict:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = UserInDB(**user_dict)
    
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create access token
    access_token = create_access_token({"sub": user.id, "role": user.role.value})
    
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        created_at=user.created_at
    )
    
    return TokenResponse(session_token=access_token, user=user_response)


@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: UserInDB = Depends(get_current_user_from_token)):
    """Get current user info"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        created_at=current_user.created_at
    )


@api_router.post("/auth/register-push-token")
async def register_push_token(
    push_token: str,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Register push notification token for user"""
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"push_token": push_token}}
    )
    return {"success": True, "message": "Push token registered"}


# ============= QUOTE ENDPOINTS =============

@api_router.post("/quotes", response_model=QuoteResponse)
async def create_quote(
    quote_data: QuoteCreate,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Create a new quote request (Customer only)"""
    from push_notification_service import send_push_notification
    
    if current_user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="Only customers can request quotes")
    
    quote_id = str(uuid.uuid4())
    quote = QuoteInDB(
        id=quote_id,
        customer_id=current_user.id,
        customer_email=current_user.email,
        customer_name=current_user.name,
        property_address=quote_data.property_address,
        property_type=quote_data.property_type,
        property_size=quote_data.property_size,
        additional_notes=quote_data.additional_notes,
        status=QuoteStatus.pending,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    await db.quotes.insert_one(quote.dict())
    
    # Send push notification to all owners
    owners = await db.users.find({"role": UserRole.owner.value}).to_list(100)
    for owner in owners:
        if owner.get("push_token"):
            send_push_notification(
                push_token=owner["push_token"],
                title="New Quote Request",
                body=f"New quote request from {current_user.name} for {quote_data.property_address}",
                data={"type": "new_quote", "quote_id": quote_id}
            )
    
    return QuoteResponse(**quote.dict())


@api_router.get("/quotes", response_model=List[QuoteResponse])
async def get_my_quotes(
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get quotes for current customer"""
    if current_user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="Only customers can view their quotes")
    
    quotes = await db.quotes.find({"customer_id": current_user.id}).to_list(1000)
    return [QuoteResponse(**quote) for quote in quotes]


@api_router.get("/quotes/{quote_id}", response_model=QuoteResponse)
async def get_quote(
    quote_id: str,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get a specific quote"""
    quote = await db.quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Check permissions
    if current_user.role == UserRole.customer and quote["customer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this quote")
    
    return QuoteResponse(**quote)


# ============= ADMIN QUOTE ENDPOINTS =============

@api_router.get("/admin/quotes", response_model=List[QuoteResponse])
async def get_all_quotes(
    status: QuoteStatus = None,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get all quotes (Owner only)"""
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can view all quotes")
    
    query = {}
    if status:
        query["status"] = status.value
    
    quotes = await db.quotes.find(query).to_list(1000)
    return [QuoteResponse(**quote) for quote in quotes]


@api_router.patch("/admin/quotes/{quote_id}/price")
async def set_quote_price(
    quote_id: str,
    quote_amount: float = Query(..., description="Quote amount"),
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Set price for a quote (Owner only)"""
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can set quote prices")
    
    quote = await db.quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Update quote
    await db.quotes.update_one(
        {"id": quote_id},
        {
            "$set": {
                "quote_amount": quote_amount,
                "status": QuoteStatus.quoted.value,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    updated_quote = await db.quotes.find_one({"id": quote_id})
    return QuoteResponse(**updated_quote)


# ============= INSPECTION ENDPOINTS =============

@api_router.post("/inspections", response_model=InspectionResponse)
async def schedule_inspection(
    quote_id: str = Query(...),
    preferred_date: str = Query(None),
    preferred_time: str = Query(None),
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Schedule an inspection (Customer only)"""
    from push_notification_service import send_push_notification
    
    if current_user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="Only customers can schedule inspections")
    
    # Verify quote exists and belongs to customer
    quote = await db.quotes.find_one({"id": quote_id, "customer_id": current_user.id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found or not authorized")
    
    if quote["status"] != QuoteStatus.quoted.value:
        raise HTTPException(status_code=400, detail="Quote must be quoted before scheduling inspection")
    
    inspection_id = str(uuid.uuid4())
    inspection = InspectionInDB(
        id=inspection_id,
        quote_id=quote_id,
        customer_id=current_user.id,
        customer_email=current_user.email,
        customer_name=current_user.name,
        property_address=quote["property_address"],
        preferred_date=preferred_date,
        preferred_time=preferred_time,
        status=InspectionStatus.pending_scheduling,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    await db.inspections.insert_one(inspection.dict())
    
    # Send push notification to all owners
    owners = await db.users.find({"role": UserRole.owner.value}).to_list(100)
    for owner in owners:
        if owner.get("push_token"):
            send_push_notification(
                push_token=owner["push_token"],
                title="New Scheduling Request",
                body=f"New inspection scheduling request from {current_user.name} for {quote['property_address']}",
                data={"type": "new_inspection", "inspection_id": inspection_id}
            )
    
    return InspectionResponse(**inspection.dict())


@api_router.get("/inspections", response_model=List[InspectionResponse])
async def get_my_inspections(
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get inspections for current customer"""
    if current_user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="Only customers can view their inspections")
    
    inspections = await db.inspections.find({"customer_id": current_user.id}).to_list(1000)
    return [InspectionResponse(**inspection) for inspection in inspections]


@api_router.get("/inspections/{inspection_id}", response_model=InspectionResponse)
async def get_inspection(
    inspection_id: str,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get a specific inspection"""
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Check permissions
    if current_user.role == UserRole.customer and inspection["customer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this inspection")
    
    return InspectionResponse(**inspection)


# ============= ADMIN INSPECTION ENDPOINTS =============

@api_router.get("/admin/inspections/pending-scheduling", response_model=List[InspectionResponse])
async def get_pending_inspections(
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get all pending scheduling inspections (Owner only)"""
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can view all inspections")
    
    inspections = await db.inspections.find(
        {"status": InspectionStatus.pending_scheduling.value}
    ).to_list(1000)
    return [InspectionResponse(**inspection) for inspection in inspections]


@api_router.get("/admin/inspections/confirmed", response_model=List[InspectionResponse])
async def get_confirmed_inspections(
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get all confirmed/scheduled inspections (Owner only)"""
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can view all inspections")
    
    inspections = await db.inspections.find(
        {"status": InspectionStatus.scheduled.value}
    ).to_list(1000)
    return [InspectionResponse(**inspection) for inspection in inspections]


@api_router.patch("/admin/inspections/{inspection_id}/set-datetime")
async def set_inspection_datetime(
    inspection_id: str,
    scheduled_date: str = Query(...),
    scheduled_time: str = Query(...),
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Set date and time for an inspection (Owner only)"""
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can set inspection datetime")
    
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Update inspection
    await db.inspections.update_one(
        {"id": inspection_id},
        {
            "$set": {
                "scheduled_date": scheduled_date,
                "scheduled_time": scheduled_time,
                "status": InspectionStatus.scheduled.value,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    updated_inspection = await db.inspections.find_one({"id": inspection_id})
    return InspectionResponse(**updated_inspection)


@api_router.post("/admin/manual-inspection", response_model=ManualInspectionResponse)
async def create_manual_inspection(
    inspection_data: ManualInspectionCreate,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Create manual inspection entry (Owner only)"""
    from email_service import send_inspection_calendar_invite
    
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can create manual inspections")
    
    inspection_id = str(uuid.uuid4())
    
    # Create manual inspection record
    manual_inspection = ManualInspectionInDB(
        id=inspection_id,
        owner_id=current_user.id,
        owner_name=current_user.name,
        client_name=inspection_data.client_name,
        client_phone=inspection_data.client_phone,
        client_email=inspection_data.client_email,
        agent_name=inspection_data.agent_name,
        agent_phone=inspection_data.agent_phone,
        agent_email=inspection_data.agent_email,
        property_address=inspection_data.property_address,
        property_city=inspection_data.property_city,
        property_zip=inspection_data.property_zip,
        square_feet=inspection_data.square_feet,
        year_built=inspection_data.year_built,
        foundation_type=inspection_data.foundation_type,
        property_type=inspection_data.property_type,
        num_buildings=inspection_data.num_buildings,
        num_units=inspection_data.num_units,
        fee_amount=inspection_data.fee_amount,
        inspection_date=inspection_data.inspection_date,
        inspection_time=inspection_data.inspection_time,
        status="scheduled",
        created_at=datetime.utcnow()
    )
    
    # Save to manual inspections collection
    await db.manual_inspections.insert_one(manual_inspection.dict())
    
    # Also create an active inspection for the Active Inspections view
    full_address = f"{inspection_data.property_address}, {inspection_data.property_city}, TX {inspection_data.property_zip}"
    active_inspection = InspectionInDB(
        id=inspection_id,
        quote_id="manual-entry",
        customer_id="manual-entry",
        customer_email=inspection_data.client_email,
        customer_name=inspection_data.client_name,
        property_address=full_address,
        preferred_date=inspection_data.inspection_date,
        preferred_time=inspection_data.inspection_time,
        status=InspectionStatus.scheduled,
        scheduled_date=inspection_data.inspection_date,
        scheduled_time=inspection_data.inspection_time,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    await db.inspections.insert_one(active_inspection.dict())
    
    # Send calendar invites to all parties
    owner = await db.users.find_one({"id": current_user.id})
    
    # Send to client
    send_inspection_calendar_invite(
        to_email=inspection_data.client_email,
        recipient_name=inspection_data.client_name,
        property_address=full_address,
        inspection_date=inspection_data.inspection_date,
        inspection_time=inspection_data.inspection_time,
        is_owner=False
    )
    
    # Send to owner
    if owner and owner.get("email"):
        send_inspection_calendar_invite(
            to_email=owner["email"],
            recipient_name=owner["name"],
            property_address=full_address,
            inspection_date=inspection_data.inspection_date,
            inspection_time=inspection_data.inspection_time,
            is_owner=True
        )
    
    # Send to agent if provided
    if inspection_data.agent_email:
        send_inspection_calendar_invite(
            to_email=inspection_data.agent_email,
            recipient_name=inspection_data.agent_name or "Agent",
            property_address=full_address,
            inspection_date=inspection_data.inspection_date,
            inspection_time=inspection_data.inspection_time,
            is_owner=False
        )
    
    return ManualInspectionResponse(**manual_inspection.dict())


@api_router.get("/admin/manual-inspection/{inspection_id}", response_model=ManualInspectionResponse)
async def get_manual_inspection(
    inspection_id: str,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get manual inspection by ID (Owner only)"""
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can view manual inspections")
    
    manual_inspection = await db.manual_inspections.find_one({"id": inspection_id})
    if not manual_inspection:
        raise HTTPException(status_code=404, detail="Manual inspection not found")
    
    return ManualInspectionResponse(**manual_inspection)


@api_router.patch("/admin/manual-inspection/{inspection_id}", response_model=ManualInspectionResponse)
async def update_manual_inspection(
    inspection_id: str,
    update_data: dict,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Update manual inspection (Owner only) - supports partial updates"""
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can update manual inspections")
    
    manual_inspection = await db.manual_inspections.find_one({"id": inspection_id})
    if not manual_inspection:
        raise HTTPException(status_code=404, detail="Manual inspection not found")
    
    # Filter out None values for partial update (but allow empty strings)
    update_fields = {k: v for k, v in update_data.items() if v is not None}
    
    if update_fields:
        # Update manual inspection first
        await db.manual_inspections.update_one(
            {"id": inspection_id},
            {"$set": update_fields}
        )
        
        # Get the updated manual inspection to sync to active inspections
        updated_manual = await db.manual_inspections.find_one({"id": inspection_id})
        
        # Build comprehensive sync to active inspection
        # Reconstruct full address from updated fields
        full_address = f"{updated_manual['property_address']}, {updated_manual['property_city']}, TX {updated_manual['property_zip']}"
        
        # Prepare update for inspections collection - sync ALL displayable fields
        active_update = {
            "property_address": full_address,
            "customer_name": updated_manual['client_name'],
            "customer_email": updated_manual['client_email'],
            "scheduled_date": updated_manual['inspection_date'],
            "scheduled_time": updated_manual['inspection_time'],
            "preferred_date": updated_manual['inspection_date'],  # Sync to preferred as well
            "preferred_time": updated_manual['inspection_time'],  # Sync to preferred as well
            "updated_at": datetime.utcnow()
        }
        
        # Update the corresponding inspection record
        result = await db.inspections.update_one(
            {"id": inspection_id},
            {"$set": active_update}
        )
        
        print(f"Synced manual inspection {inspection_id} to inspections collection. Matched: {result.matched_count}, Modified: {result.modified_count}")
    
    updated_inspection = await db.manual_inspections.find_one({"id": inspection_id})
    return ManualInspectionResponse(**updated_inspection)


@api_router.delete("/admin/inspections/{inspection_id}/cancel")
async def cancel_inspection(
    inspection_id: str,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Cancel an inspection (Owner only)"""
    from email_service import send_inspection_cancellation_email
    
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can cancel inspections")
    
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Get customer and owner info for notifications
    customer = await db.users.find_one({"id": inspection["customer_id"]})
    owner = await db.users.find_one({"id": current_user.id})
    
    cancellation_info = {
        "property_address": inspection["property_address"],
        "scheduled_date": inspection.get("scheduled_date"),
        "scheduled_time": inspection.get("scheduled_time"),
        "customer_email": inspection["customer_email"],
        "customer_name": inspection["customer_name"],
        "owner_email": owner["email"] if owner else None,
        "owner_name": owner["name"] if owner else None,
    }
    
    # Send email notifications
    customer_email_sent = send_inspection_cancellation_email(
        to_email=cancellation_info["customer_email"],
        recipient_name=cancellation_info["customer_name"],
        property_address=cancellation_info["property_address"],
        scheduled_date=cancellation_info.get("scheduled_date"),
        scheduled_time=cancellation_info.get("scheduled_time"),
        is_owner=False
    )
    
    owner_email_sent = send_inspection_cancellation_email(
        to_email=cancellation_info["owner_email"],
        recipient_name=cancellation_info["owner_name"],
        property_address=cancellation_info["property_address"],
        scheduled_date=cancellation_info.get("scheduled_date"),
        scheduled_time=cancellation_info.get("scheduled_time"),
        is_owner=True
    )
    
    # Delete the inspection
    await db.inspections.delete_one({"id": inspection_id})
    
    return {
        "success": True,
        "message": "Inspection cancelled successfully",
        "notifications_sent": {
            "customer": cancellation_info["customer_email"],
            "owner": cancellation_info["owner_email"]
        },
        "emails_sent": {
            "customer": customer_email_sent,
            "owner": owner_email_sent
        }
    }


# ============= CHAT/MESSAGE ENDPOINTS =============

@api_router.post("/messages", response_model=MessageResponse)
async def send_message(
    message_data: MessageCreate,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Send a message in an inspection conversation"""
    from push_notification_service import send_push_notification
    
    # Verify user has access to this inspection
    inspection = await db.inspections.find_one({"id": message_data.inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Check permissions
    if current_user.role == UserRole.customer and inspection["customer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    message_id = str(uuid.uuid4())
    message = MessageInDB(
        id=message_id,
        inspection_id=message_data.inspection_id,
        sender_id=current_user.id,
        sender_name=current_user.name,
        sender_role=current_user.role,
        message_text=message_data.message_text,
        is_read=False,
        created_at=datetime.utcnow()
    )
    
    await db.messages.insert_one(message.dict())
    
    # Send push notifications to other participants
    # If customer sends message, notify owner
    if current_user.role == UserRole.customer:
        owners = await db.users.find({"role": UserRole.owner.value}).to_list(100)
        for owner in owners:
            if owner.get("push_token"):
                send_push_notification(
                    push_token=owner["push_token"],
                    title=f"New message from {current_user.name}",
                    body=message_data.message_text[:100],
                    data={"type": "new_message", "inspection_id": message_data.inspection_id}
                )
    # If owner sends message, notify customer
    elif current_user.role == UserRole.owner:
        customer = await db.users.find_one({"id": inspection["customer_id"]})
        if customer and customer.get("push_token"):
            send_push_notification(
                push_token=customer["push_token"],
                title=f"New message from {current_user.name}",
                body=message_data.message_text[:100],
                data={"type": "new_message", "inspection_id": message_data.inspection_id}
            )
    
    return MessageResponse(**message.dict())


@api_router.get("/messages/{inspection_id}", response_model=List[MessageResponse])
async def get_messages(
    inspection_id: str,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get all messages for an inspection"""
    # Verify user has access to this inspection
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Check permissions
    if current_user.role == UserRole.customer and inspection["customer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Mark messages as read for current user
    await db.messages.update_many(
        {
            "inspection_id": inspection_id,
            "sender_id": {"$ne": current_user.id},
            "is_read": False
        },
        {"$set": {"is_read": True}}
    )
    
    messages = await db.messages.find({"inspection_id": inspection_id}).sort("created_at", 1).to_list(1000)
    return [MessageResponse(**msg) for msg in messages]


@api_router.get("/conversations", response_model=List[ConversationSummary])
async def get_conversations(
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get all conversations for current user"""
    # Get inspections based on role
    if current_user.role == UserRole.owner:
        # Owner sees all inspections
        inspections = await db.inspections.find().to_list(1000)
    elif current_user.role == UserRole.customer:
        # Customer sees their inspections
        inspections = await db.inspections.find({"customer_id": current_user.id}).to_list(1000)
    else:
        # Agent sees inspections they're involved in (TODO: add agent_id to inspections)
        inspections = []
    
    conversations = []
    for inspection in inspections:
        # Get last message
        last_message_doc = await db.messages.find_one(
            {"inspection_id": inspection["id"]},
            sort=[("created_at", -1)]
        )
        
        # Count unread messages (not sent by current user)
        unread_count = await db.messages.count_documents({
            "inspection_id": inspection["id"],
            "sender_id": {"$ne": current_user.id},
            "is_read": False
        })
        
        conversation = ConversationSummary(
            inspection_id=inspection["id"],
            property_address=inspection["property_address"],
            customer_name=inspection["customer_name"],
            customer_id=inspection["customer_id"],
            last_message=last_message_doc["message_text"] if last_message_doc else None,
            last_message_time=last_message_doc["created_at"] if last_message_doc else None,
            unread_count=unread_count
        )
        conversations.append(conversation)
    
    # Sort by last message time
    conversations.sort(key=lambda x: x.last_message_time or datetime.min, reverse=True)
    
    return conversations


@api_router.get("/conversations/unread-count")
async def get_unread_count(
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get total unread message count"""
    # Count all unread messages not sent by current user
    unread_count = await db.messages.count_documents({
        "sender_id": {"$ne": current_user.id},
        "is_read": False
    })
    
    return {"unread_count": unread_count}


# ============= GOOGLE CALENDAR ENDPOINTS =============

from google_calendar_service import get_google_auth_url, exchange_code_for_token, get_calendar_events
from fastapi.responses import RedirectResponse

@api_router.get("/auth/google/login")
async def google_login(
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Initiate Google OAuth flow"""
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can connect Google Calendar")
    
    auth_url, state = get_google_auth_url(state=current_user.id)
    return {"auth_url": auth_url, "state": state}


@api_router.get("/auth/google/callback")
async def google_callback(code: str, state: str):
    """Handle Google OAuth callback"""
    try:
        # Exchange code for tokens
        credentials = exchange_code_for_token(code)
        
        # Store credentials in database for this user
        await db.users.update_one(
            {"id": state},
            {"$set": {"google_calendar_credentials": credentials}}
        )
        
        # Redirect to frontend
        return RedirectResponse(url="https://inspecto-mobile.preview.emergentagent.com/(tabs)")
    except Exception as e:
        print(f"Google callback error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to authenticate with Google: {str(e)}")


@api_router.get("/calendar/events")
async def get_calendar(
    start_date: str = None,
    end_date: str = None,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get Google Calendar events for owner"""
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can view calendar")
    
    # Check if user has connected Google Calendar
    user_dict = await db.users.find_one({"id": current_user.id})
    credentials = user_dict.get("google_calendar_credentials")
    
    if not credentials:
        raise HTTPException(status_code=401, detail="Google Calendar not connected. Please connect your calendar first.")
    
    # Parse dates
    start = datetime.fromisoformat(start_date.replace('Z', '')) if start_date else None
    end = datetime.fromisoformat(end_date.replace('Z', '')) if end_date else None
    
    # Fetch events
    events = get_calendar_events(credentials, start, end)
    
    return {"events": events}


@api_router.get("/calendar/status")
async def calendar_status(
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Check if user has connected Google Calendar"""
    user_dict = await db.users.find_one({"id": current_user.id})
    credentials = user_dict.get("google_calendar_credentials")
    
    return {
        "connected": bool(credentials),
        "user_id": current_user.id
    }


# ============= DASHBOARD STATS ENDPOINTS =============

@api_router.get("/admin/dashboard/stats")
async def get_dashboard_stats(
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get dashboard statistics (Owner only)"""
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can view dashboard stats")
    
    pending_quotes_count = await db.quotes.count_documents({"status": QuoteStatus.pending.value})
    pending_scheduling_count = await db.inspections.count_documents(
        {"status": InspectionStatus.pending_scheduling.value}
    )
    active_inspections_count = await db.inspections.count_documents(
        {"status": InspectionStatus.scheduled.value}
    )
    
    return {
        "pending_quotes": pending_quotes_count,
        "pending_scheduling": pending_scheduling_count,
        "active_inspections": active_inspections_count
    }


# ============= LEGACY ENDPOINTS (for compatibility) =============

@api_router.get("/")
async def root():
    return {"message": "Beneficial Inspections API", "version": "1.0.0"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
