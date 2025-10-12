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
    MessageCreate, MessageResponse, MessageInDB, ConversationSummary
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


# ============= QUOTE ENDPOINTS =============

@api_router.post("/quotes", response_model=QuoteResponse)
async def create_quote(
    quote_data: QuoteCreate,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Create a new quote request (Customer only)"""
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
