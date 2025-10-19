from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, Body, File, UploadFile
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
    UserProfileUpdate, NotificationPreferences,
    QuoteCreate, QuoteResponse, QuoteInDB, QuoteStatus,
    InspectionCreate, InspectionResponse, InspectionInDB, InspectionStatus,
    SchedulingRequestCreate,
    QuotePriceUpdate, InspectionDateTimeUpdate,
    MessageCreate, MessageResponse, MessageInDB, ConversationSummary,
    ManualInspectionCreate, ManualInspectionResponse, ManualInspectionInDB
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    decode_token, require_role
)

security = HTTPBearer()


# Helper function to normalize time formats for comparison
def normalize_time_format(time_str: str) -> str:
    """
    Normalize time format to 24-hour HH:MM for consistent comparison.
    Handles various formats: '08:00 AM', '8:00 AM', '8am', '8:00am', '08:00', etc.
    """
    if not time_str:
        return ""
    
    # Remove spaces and convert to lowercase
    time_str = time_str.strip().lower().replace(" ", "")
    
    # Extract hour, minute, and am/pm
    hour = 0
    minute = 0
    is_pm = False
    
    # Check for am/pm
    if 'pm' in time_str:
        is_pm = True
        time_str = time_str.replace('pm', '')
    elif 'am' in time_str:
        time_str = time_str.replace('am', '')
    
    # Parse time components
    if ':' in time_str:
        parts = time_str.split(':')
        hour = int(parts[0])
        if len(parts) > 1:
            minute = int(parts[1])
    else:
        # Just hour, no minutes (e.g., "8")
        hour = int(time_str) if time_str.isdigit() else 0
    
    # Convert to 24-hour format
    if is_pm and hour != 12:
        hour += 12
    elif not is_pm and hour == 12:
        hour = 0
    
    # Return normalized format HH:MM
    return f"{hour:02d}:{minute:02d}"


ROOT_DIR = Path(__file__).parent
from fastapi.responses import HTMLResponse

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
    # CRITICAL: Prevent creation of new owner accounts
    if user_data.role == UserRole.owner:
        raise HTTPException(
            status_code=403, 
            detail="Owner account registration is not allowed. Only customer, agent, and inspector accounts can be created."
        )
    
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
        phone=user_data.phone,
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
        phone=user_data.phone,
        profile_picture=None,  # New users don't have profile picture yet
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
    
    # Generate presigned URL for profile picture if exists
    profile_picture_url = None
    if user.profile_picture:
        if not user.profile_picture.startswith('http'):
            # It's an S3 key, generate presigned URL
            try:
                from s3_service import s3_client, AWS_S3_BUCKET_NAME
                profile_picture_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': AWS_S3_BUCKET_NAME,
                        'Key': user.profile_picture
                    },
                    ExpiresIn=604800  # 7 days
                )
            except Exception as e:
                logging.error(f"Error generating presigned URL for profile picture on login: {e}")
                profile_picture_url = None
        else:
            profile_picture_url = user.profile_picture
    
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        phone=user.phone,
        profile_picture=profile_picture_url,
        created_at=user.created_at
    )
    
    return TokenResponse(session_token=access_token, user=user_response)


@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: UserInDB = Depends(get_current_user_from_token)):
    """Get current user info"""
    from s3_service import s3_client, AWS_S3_BUCKET_NAME
    
    # If user has a profile picture (stored as S3 key), generate a presigned URL
    profile_picture_url = None
    if current_user.profile_picture:
        # Check if it's already a full URL (old format) or just an S3 key (new format)
        if current_user.profile_picture.startswith('http'):
            # Old format - full URL (may not work if private)
            profile_picture_url = current_user.profile_picture
        else:
            # New format - S3 key, generate presigned URL
            try:
                profile_picture_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': AWS_S3_BUCKET_NAME,
                        'Key': current_user.profile_picture
                    },
                    ExpiresIn=604800  # 7 days
                )
            except Exception as e:
                logging.error(f"Error generating presigned URL for profile picture: {e}")
                profile_picture_url = None
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        phone=current_user.phone,
        profile_picture=profile_picture_url,
        created_at=current_user.created_at
    )


@api_router.post("/users/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Upload and update user profile picture"""
    try:
        # Read file content
        file_content = await file.read()
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        s3_key = f"profile-pictures/{current_user.id}.{file_extension}"
        
        # Upload to S3 using s3_client from s3_service
        from s3_service import s3_client, AWS_S3_BUCKET_NAME
        
        # Upload without ACL - bucket policy will handle access
        s3_client.put_object(
            Bucket=AWS_S3_BUCKET_NAME,
            Key=s3_key,
            Body=file_content,
            ContentType=f"image/{file_extension}"
        )
        
        # Generate a long-lived presigned URL (7 days) for the profile picture
        profile_picture_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': AWS_S3_BUCKET_NAME,
                'Key': s3_key
            },
            ExpiresIn=604800  # 7 days in seconds
        )
        
        # Store the S3 key in database instead of the presigned URL
        # We'll generate a new presigned URL each time the user data is fetched
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {"profile_picture": s3_key}}  # Store S3 key, not URL
        )
        
        logging.info(f"Profile picture uploaded for user {current_user.id}: {s3_key}")
        
        return {
            "success": True,
            "message": "Profile picture uploaded successfully",
            "profile_picture_url": profile_picture_url  # Return presigned URL to frontend
        }
        
    except Exception as e:
        logging.error(f"Error uploading profile picture: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload profile picture: {str(e)}")


@api_router.put("/users/profile")
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Update user profile information (name, email, phone)"""
    try:
        update_data = {}
        
        if profile_data.name:
            update_data["name"] = profile_data.name.strip()
        
        if profile_data.email:
            # Check if email is already taken by another user
            existing_user = await db.users.find_one({
                "email": profile_data.email.strip(),
                "id": {"$ne": current_user.id}  # Exclude current user
            })
            if existing_user:
                raise HTTPException(status_code=400, detail="Email already in use")
            update_data["email"] = profile_data.email.strip()
        
        if profile_data.phone is not None:  # Allow empty string to clear phone
            update_data["phone"] = profile_data.phone.strip() if profile_data.phone.strip() else None
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update user in database
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
        
        # Fetch updated user data
        updated_user = await db.users.find_one({"id": current_user.id})
        
        # Generate presigned URL for profile picture if exists
        profile_picture_url = None
        if updated_user.get("profile_picture"):
            try:
                from s3_service import s3_client, AWS_S3_BUCKET_NAME
                profile_picture_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': AWS_S3_BUCKET_NAME,
                        'Key': updated_user["profile_picture"]
                    },
                    ExpiresIn=604800  # 7 days
                )
            except Exception as e:
                logger.error(f"Error generating presigned URL: {e}")
        
        logger.info(f"Profile updated for user {current_user.id}: {list(update_data.keys())}")
        
        # Return updated user data
        return {
            "id": updated_user["id"],
            "name": updated_user["name"],
            "email": updated_user["email"],
            "phone": updated_user.get("phone"),
            "role": updated_user["role"],
            "profile_picture": profile_picture_url,
            "created_at": updated_user.get("created_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")


@api_router.put("/users/change-password")
async def change_password(
    old_password: str,
    new_password: str,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Change user password"""
    try:
        # Verify old password
        if not verify_password(old_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Validate new password
        if len(new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
        
        if old_password == new_password:
            raise HTTPException(status_code=400, detail="New password must be different from current password")
        
        # Hash new password
        new_hashed_password = get_password_hash(new_password)
        
        # Update password in database
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {"hashed_password": new_hashed_password}}
        )
        
        logger.info(f"Password changed for user {current_user.id}")
        
        return {"success": True, "message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")


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


@api_router.get("/users/notification-preferences")
async def get_notification_preferences(
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get user's notification preferences"""
    try:
        user = await db.users.find_one({"id": current_user.id})
        
        # Return preferences or defaults
        preferences = user.get("notification_preferences", {
            "new_quotes": True,
            "scheduling_updates": True,
            "chat_messages": True,
            "report_uploads": True
        })
        
        return preferences
        
    except Exception as e:
        logger.error(f"Error fetching notification preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch notification preferences")


@api_router.put("/users/notification-preferences")
async def update_notification_preferences(
    preferences: NotificationPreferences,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Update user's notification preferences"""
    try:
        # Convert preferences to dict
        preferences_dict = preferences.model_dump()
        
        # Update in database
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {"notification_preferences": preferences_dict}}
        )
        
        logger.info(f"Notification preferences updated for user {current_user.id}")
        
        return preferences_dict
        
    except Exception as e:
        logger.error(f"Error updating notification preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to update notification preferences")


# ============= USER ENDPOINTS =============

# ============= USER HELPER FUNCTIONS =============

async def get_user_details(user_id: str, include_profile_picture: bool = True):
    """
    Central function to fetch user details by ID - Single Source of Truth
    This is the "file" in the filing cabinet - all user data comes from here
    
    Returns: {id, name, email, phone, role, profile_picture_url} or None if not found
    """
    if not user_id:
        return None
        
    user = await db.users.find_one({"id": user_id})
    if not user:
        logger.warning(f"User not found: {user_id}")
        return None
    
    result = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "phone": user.get("phone"),
        "role": user["role"]
    }
    
    if include_profile_picture and user.get("profile_picture"):
        try:
            from s3_service import generate_presigned_url
            result["profile_picture"] = generate_presigned_url(user["profile_picture"])
        except Exception as e:
            logger.error(f"Error generating presigned URL for profile picture: {e}")
            result["profile_picture"] = None
    else:
        result["profile_picture"] = None
    
    return result


@api_router.get("/users/inspectors")
async def get_inspectors(
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get list of all inspectors (Owner only)"""
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can view inspectors")
    
    # Fetch all users with role inspector or owner (owners can also be inspectors)
    inspectors = await db.users.find({
        "role": {"$in": [UserRole.inspector.value, UserRole.owner.value]}
    }).to_list(100)
    
    # Return simplified inspector info
    inspector_list = [
        {
            "id": insp["id"],
            "name": insp["name"],
            "email": insp["email"],
            "role": insp["role"]
        }
        for insp in inspectors
    ]
    
    return {"inspectors": inspector_list}


@api_router.get("/users/owner")
async def get_owner_info(
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get owner information for chat display (accessible to all authenticated users)"""
    owner = await db.users.find_one({"role": UserRole.owner.value})
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    
    # Generate presigned URL for profile picture if exists
    profile_picture_url = None
    if owner.get("profile_picture"):
        try:
            from s3_service import s3_client, AWS_S3_BUCKET_NAME
            profile_picture_url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': AWS_S3_BUCKET_NAME,
                    'Key': owner["profile_picture"]
                },
                ExpiresIn=604800  # 7 days
            )
        except Exception as e:
            logger.error(f"Error generating presigned URL for owner profile picture: {e}")
    
    return {
        "id": owner["id"],
        "name": owner["name"],
        "email": owner["email"],
        "role": owner["role"],
        "profile_picture": profile_picture_url
    }


@api_router.get("/users/{user_id}")
async def get_user_by_id(
    user_id: str,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get user details by ID (for chat profile display)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate presigned URL for profile picture if exists
    profile_picture_url = None
    if user.get("profile_picture"):
        try:
            from s3_service import s3_client, AWS_S3_BUCKET_NAME
            profile_picture_url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': AWS_S3_BUCKET_NAME,
                    'Key': user["profile_picture"]
                },
                ExpiresIn=604800  # 7 days
            )
        except Exception as e:
            logger.error(f"Error generating presigned URL for profile picture: {e}")
    
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "profile_picture": profile_picture_url
    }


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
        property_city=quote_data.property_city,
        property_zip=quote_data.property_zip,
        property_type=quote_data.property_type,
        square_feet=quote_data.square_feet,
        year_built=quote_data.year_built,
        foundation_type=quote_data.foundation_type,
        num_buildings=quote_data.num_buildings,
        num_units=quote_data.num_units,
        property_size=quote_data.property_size,  # Keep for backwards compatibility
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


@api_router.delete("/quotes/{quote_id}")
async def decline_quote(
    quote_id: str,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Decline a quote (Customer only) - deletes the quote"""
    from push_notification_service import send_push_notification
    
    if current_user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="Only customers can decline quotes")
    
    quote = await db.quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Check if customer owns this quote
    if quote["customer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to decline this quote")
    
    # Send push notification to all owners
    owners = await db.users.find({"role": UserRole.owner.value}).to_list(100)
    for owner in owners:
        if owner.get("push_token"):
            send_push_notification(
                push_token=owner["push_token"],
                title="Quote Declined",
                body=f"{current_user.name} declined the quote for {quote['property_address']}",
                data={"type": "quote_declined", "quote_id": quote_id}
            )
    
    logging.info(f"Quote {quote_id} declined by customer {current_user.name}. Push notifications sent to owners.")
    
    # Delete the quote
    await db.quotes.delete_one({"id": quote_id})
    
    return {"message": "Quote declined successfully"}


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
    from push_notification_service import send_push_notification
    
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
    
    # Send push notification to customer
    customer = await db.users.find_one({"id": quote["customer_id"]})
    if customer and customer.get("push_token"):
        property_addr = quote.get("property_address", "your property")
        send_push_notification(
            push_token=customer["push_token"],
            title="Quote Received",
            body=f"You received a quote of ${quote_amount:.2f} for {property_addr}",
            data={"type": "quote_received", "quote_id": quote_id, "amount": quote_amount}
        )
    
    # Send email notification to customer
    from email_service import send_email
    customer_email = quote.get("customer_email")
    if customer_email:
        email_body = f"""
        Hello {quote.get('customer_name', 'Customer')},
        
        You have received a quote for your inspection request at {quote.get('property_address', 'your property')}.
        
        Quote Amount: ${quote_amount:.2f}
        
        Please log in to your account to review and accept the quote.
        
        Best regards,
        Beneficial Inspections
        """
        try:
            send_email(
                to_email=customer_email,
                subject=f"Inspection Quote - ${quote_amount:.2f}",
                body=email_body
            )
        except Exception as e:
            print(f"Failed to send email to customer: {e}")
    
    updated_quote = await db.quotes.find_one({"id": quote_id})
    return QuoteResponse(**updated_quote)


# ============= INSPECTION ENDPOINTS =============

@api_router.post("/inspections", response_model=InspectionResponse)
async def schedule_inspection(
    scheduling_data: SchedulingRequestCreate,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Schedule an inspection (Customer only) - with scheduling preferences"""
    from push_notification_service import send_push_notification
    
    if current_user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="Only customers can schedule inspections")
    
    # Verify quote exists and belongs to customer
    quote = await db.quotes.find_one({"id": scheduling_data.quote_id, "customer_id": current_user.id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found or not authorized")
    
    if quote["status"] != QuoteStatus.quoted.value:
        raise HTTPException(status_code=400, detail="Quote must be quoted before scheduling inspection")
    
    inspection_id = str(uuid.uuid4())
    
    # Build full property address
    property_address = quote.get("property_address", "")
    if quote.get("property_city"):
        property_address = f"{property_address}, {quote['property_city']}, TX {quote.get('property_zip', '')}"
    
    # Copy fee amount from quote to inspection
    fee_amount = None
    if quote.get("quote_amount"):
        fee_amount = float(quote["quote_amount"])
        logging.info(f"Copying fee_amount {fee_amount} from quote {scheduling_data.quote_id} to new inspection")
    
    inspection = InspectionInDB(
        id=inspection_id,
        quote_id=scheduling_data.quote_id,
        customer_id=current_user.id,
        customer_email=current_user.email,
        customer_name=current_user.name,
        customer_phone=getattr(current_user, 'phone', None),  # Safely get phone if it exists
        property_address=property_address,
        square_feet=quote.get("square_feet"),
        year_built=quote.get("year_built"),
        foundation_type=quote.get("foundation_type"),
        property_type=quote.get("property_type"),
        num_buildings=quote.get("num_buildings"),
        num_units=quote.get("num_units"),
        fee_amount=fee_amount,  # Store fee amount on inspection
        preferred_date=None,
        preferred_time=None,
        option_period_end_date=scheduling_data.option_period_end_date,
        option_period_unsure=scheduling_data.option_period_unsure,
        preferred_days_of_week=scheduling_data.preferred_days_of_week,
        status=InspectionStatus.pending_scheduling,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    await db.inspections.insert_one(inspection.dict())
    
    # Update quote status to "accepted" so it no longer shows in customer's pending quotes
    await db.quotes.update_one(
        {"id": scheduling_data.quote_id},
        {
            "$set": {
                "status": "accepted",  # New status for quotes that have moved to scheduling
                "updated_at": datetime.utcnow()
            }
        }
    )
    
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
    """Get inspections for current customer, agent, or inspector"""
    if current_user.role == UserRole.customer:
        # Customers see their own inspections
        inspections = await db.inspections.find({"customer_id": current_user.id}).to_list(1000)
    elif current_user.role == UserRole.agent:
        # Agents see inspections where they're listed as the agent
        inspections = await db.inspections.find({"agent_email": current_user.email}).to_list(1000)
    elif current_user.role == UserRole.inspector:
        # Inspectors see inspections assigned to them
        inspections = await db.inspections.find({
            "$or": [
                {"inspector_id": current_user.id},
                {"inspector_email": current_user.email}
            ]
        }).to_list(1000)
    else:
        raise HTTPException(status_code=403, detail="Only customers, agents, and inspectors can view their inspections")
    
    # Add fee_amount from linked quote
    for inspection in inspections:
        quote_id = inspection.get("quote_id")
        logging.info(f"Processing inspection {inspection.get('id')}, quote_id: {quote_id}")
        if quote_id:
            quote = await db.quotes.find_one({"id": quote_id})
            logging.info(f"Quote found: {quote is not None}, quote_amount: {quote.get('quote_amount') if quote else 'N/A'}")
            if quote and quote.get("quote_amount"):
                inspection["fee_amount"] = float(quote["quote_amount"])
                logging.info(f"Added fee_amount: {inspection['fee_amount']}")
        else:
            logging.info(f"Inspection {inspection.get('id')} has no quote_id")
    
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


@api_router.patch("/inspections/{inspection_id}/confirm-time", response_model=InspectionResponse)
async def confirm_time_slot(
    inspection_id: str,
    request_body: dict = Body(...),
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Customer confirms a selected time slot"""
    from push_notification_service import send_push_notification
    from email_service import send_inspection_calendar_invite
    
    if current_user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="Only customers can confirm time slots")
    
    # Get the inspection
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Verify the inspection belongs to the customer
    if inspection["customer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this inspection")
    
    # Verify inspection is in the correct status
    if inspection["status"] != InspectionStatus.awaiting_customer_selection.value:
        raise HTTPException(status_code=400, detail="Inspection is not awaiting customer selection")
    
    scheduled_date = request_body.get("scheduled_date")
    scheduled_time = request_body.get("scheduled_time")
    
    if not scheduled_date or not scheduled_time:
        raise HTTPException(status_code=400, detail="scheduled_date and scheduled_time are required")
    
    # Check for double-booking with same inspector
    inspector_name = inspection.get("inspector_name")
    if inspector_name:
        # Get all scheduled inspections for the same date
        potential_conflicts = await db.inspections.find({
            "id": {"$ne": inspection_id},  # Exclude current inspection
            "status": InspectionStatus.scheduled.value,
            "scheduled_date": scheduled_date,
            "inspector_name": inspector_name
        }).to_list(100)
        
        # Normalize the requested time
        normalized_requested_time = normalize_time_format(scheduled_time)
        
        # Check if any existing inspection has a conflicting time
        for existing in potential_conflicts:
            existing_time = existing.get("scheduled_time", "")
            normalized_existing_time = normalize_time_format(existing_time)
            
            if normalized_requested_time == normalized_existing_time:
                raise HTTPException(
                    status_code=409, 
                    detail=f"Inspector {inspector_name} is already scheduled for another inspection at {scheduled_date} {scheduled_time}. Please select a different time slot or assign a different inspector."
                )
    
    # Update inspection to scheduled status
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
    
    # Get all owners
    owners = await db.users.find({"role": UserRole.owner.value}).to_list(100)
    
    # Get quote information for inspection fee
    quote = None
    inspection_fee = None
    if inspection.get("quote_id"):
        quote = await db.quotes.find_one({"id": inspection["quote_id"]})
        if quote and quote.get("quote_amount"):
            inspection_fee = str(quote["quote_amount"])
    
    # Prepare calendar invite details
    customer_name = inspection.get("customer_name") or current_user.name
    customer_email = inspection.get("customer_email") or current_user.email
    customer_phone = inspection.get("customer_phone")
    inspector_name = inspection.get("inspector_name", "Brad Baker")
    inspector_phone = inspection.get("inspector_phone")
    inspector_license = inspection.get("inspector_license")
    
    # Send push notifications and calendar invites to all owners
    for owner in owners:
        if owner.get("push_token"):
            send_push_notification(
                push_token=owner["push_token"],
                title="Inspection Confirmed",
                body=f"{current_user.name} confirmed inspection for {inspection['property_address']} on {scheduled_date} at {scheduled_time}",
                data={"type": "inspection_confirmed", "inspection_id": inspection_id}
            )
        
        # Send calendar invite to owner with full details
        send_inspection_calendar_invite(
            to_email=owner["email"],
            recipient_name=owner["name"],
            property_address=inspection["property_address"],
            inspection_date=scheduled_date,
            inspection_time=scheduled_time,
            is_owner=True,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            inspection_fee=inspection_fee,
            inspector_name=inspector_name,
            inspector_phone=inspector_phone
        )
    
    # Send calendar invite to customer with full details
    send_inspection_calendar_invite(
        to_email=current_user.email,
        recipient_name=current_user.name,
        property_address=inspection["property_address"],
        inspection_date=scheduled_date,
        inspection_time=scheduled_time,
        is_owner=False,
        customer_name=customer_name,
        customer_email=customer_email,
        customer_phone=customer_phone,
        inspection_fee=inspection_fee,
        inspector_name=inspector_name,
        inspector_phone=inspector_phone
    )
    
    # Send calendar invite to agent if agent email exists
    if inspection.get("agent_email"):
        send_inspection_calendar_invite(
            to_email=inspection["agent_email"],
            recipient_name=inspection.get("agent_name", "Agent"),
            property_address=inspection["property_address"],
            inspection_date=scheduled_date,
            inspection_time=scheduled_time,
            is_owner=False,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            inspection_fee=inspection_fee,
            inspector_name=inspector_name,
            inspector_phone=inspector_phone
        )
        logging.info(f"Calendar invite sent to agent: {inspection['agent_email']}")
    
    # Return updated inspection
    updated_inspection = await db.inspections.find_one({"id": inspection_id})
    return InspectionResponse(**updated_inspection)


@api_router.patch("/inspections/{inspection_id}/decline-offered-times")
async def decline_offered_times(
    inspection_id: str,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Customer declines offered time slots - keeps inspection, allows owner to resubmit"""
    from push_notification_service import send_push_notification
    
    if current_user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="Only customers can decline offered times")
    
    # Get the inspection
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Verify the inspection belongs to the customer
    if inspection["customer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this inspection")
    
    # Update inspection status back to pending_scheduling to allow owner to resubmit
    await db.inspections.update_one(
        {"id": inspection_id},
        {
            "$set": {
                "status": InspectionStatus.pending_scheduling.value,
                "offered_time_slots": None,  # Clear the offered slots
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Send push notification to all owners
    owners = await db.users.find({"role": UserRole.owner.value}).to_list(100)
    for owner in owners:
        if owner.get("push_token"):
            send_push_notification(
                push_token=owner["push_token"],
                title="Offered Times Rejected",
                body=f"{current_user.name} rejected the offered time slots for {inspection['property_address']}. Please offer new dates.",
                data={"type": "times_rejected", "inspection_id": inspection_id}
            )
    
    logging.info(f"Customer {current_user.name} declined offered times for inspection {inspection_id}. Push notifications sent to owners.")
    
    # Return updated inspection
    updated_inspection = await db.inspections.find_one({"id": inspection_id})
    return InspectionResponse(**updated_inspection)


@api_router.patch("/inspections/{inspection_id}/agent-info")
async def update_agent_info(
    inspection_id: str,
    agent_data: dict,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Customer adds agent information after signing agreement"""
    if current_user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="Only customers can add agent information")
    
    # Get the inspection
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Verify the inspection belongs to the customer
    if inspection["customer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this inspection")
    
    # Update inspection with agent information
    await db.inspections.update_one(
        {"id": inspection_id},
        {
            "$set": {
                "agent_name": agent_data.get("agent_name"),
                "agent_email": agent_data.get("agent_email"),
                "agent_phone": agent_data.get("agent_phone"),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    logging.info(f"Agent info added to inspection {inspection_id}: {agent_data.get('agent_name')} ({agent_data.get('agent_email')})")
    
    # Return updated inspection
    updated_inspection = await db.inspections.find_one({"id": inspection_id})
    return InspectionResponse(**updated_inspection)


@api_router.delete("/inspections/{inspection_id}")
async def decline_inspection(
    inspection_id: str,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Customer cancels/declines an inspection completely - deletes it"""
    from push_notification_service import send_push_notification
    from email_service import send_inspection_calendar_cancellation
    
    if current_user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="Only customers can cancel inspections")
    
    # Get the inspection
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Verify the inspection belongs to the customer
    if inspection["customer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this inspection")
    
    scheduled_date = inspection.get("scheduled_date")
    scheduled_time = inspection.get("scheduled_time")
    
    # Track emails sent for calendar cancellations
    cancellations_sent = {}
    emails_sent = set()
    
    # Send calendar cancellation to customer
    if scheduled_date and scheduled_time:
        customer_email = inspection["customer_email"]
        send_inspection_calendar_cancellation(
            to_email=customer_email,
            recipient_name=inspection["customer_name"],
            property_address=inspection["property_address"],
            inspection_date=scheduled_date,
            inspection_time=scheduled_time,
            is_owner=False
        )
        emails_sent.add(customer_email.lower())
        cancellations_sent["customer"] = customer_email
        logging.info(f"Calendar cancellation sent to customer: {customer_email}")
    
    # Send calendar cancellation to owner
    owners = await db.users.find({"role": UserRole.owner.value}).to_list(100)
    for owner in owners:
        if scheduled_date and scheduled_time:
            owner_email = owner["email"]
            if owner_email.lower() not in emails_sent:
                send_inspection_calendar_cancellation(
                    to_email=owner_email,
                    recipient_name=owner["name"],
                    property_address=inspection["property_address"],
                    inspection_date=scheduled_date,
                    inspection_time=scheduled_time,
                    is_owner=True
                )
                emails_sent.add(owner_email.lower())
                cancellations_sent["owner"] = owner_email
                logging.info(f"Calendar cancellation sent to owner: {owner_email}")
        
        # Send push notification
        if owner.get("expo_push_token"):
            send_push_notification(
                expo_token=owner["expo_push_token"],
                title="Inspection Canceled",
                body=f"{current_user.name} canceled the inspection for {inspection['property_address']}",
                data={"type": "inspection_canceled", "inspection_id": inspection_id}
            )
    
    # Send calendar cancellation to inspector (if different from owner)
    inspector_email = None
    if inspection.get("inspector_name") and scheduled_date and scheduled_time:
        inspector_emails = {
            "Brad Baker": "bradbakertx@gmail.com",
            "Blake Gray": None
        }
        inspector_email = inspector_emails.get(inspection.get("inspector_name"))
        
        if inspector_email and inspector_email.lower() not in emails_sent:
            send_inspection_calendar_cancellation(
                to_email=inspector_email,
                recipient_name=inspection.get("inspector_name"),
                property_address=inspection["property_address"],
                inspection_date=scheduled_date,
                inspection_time=scheduled_time,
                is_owner=False
            )
            emails_sent.add(inspector_email.lower())
            cancellations_sent["inspector"] = inspector_email
            logging.info(f"Calendar cancellation sent to inspector: {inspector_email}")
            
            # Send push notification to inspector if they have a user account
            inspector_user = await db.users.find_one({"email": inspector_email})
            if inspector_user and inspector_user.get("expo_push_token"):
                send_push_notification(
                    expo_token=inspector_user["expo_push_token"],
                    title="Inspection Canceled",
                    body=f"Inspection at {inspection['property_address']} has been canceled by the customer",
                    data={"type": "inspection_canceled", "inspection_id": inspection_id}
                )
    
    # Send calendar cancellation to agent if agent email exists
    if inspection.get("agent_email") and scheduled_date and scheduled_time:
        agent_email = inspection["agent_email"]
        if agent_email.lower() not in emails_sent:
            send_inspection_calendar_cancellation(
                to_email=agent_email,
                recipient_name=inspection.get("agent_name", "Agent"),
                property_address=inspection["property_address"],
                inspection_date=scheduled_date,
                inspection_time=scheduled_time,
                is_owner=False
            )
            emails_sent.add(agent_email.lower())
            cancellations_sent["agent"] = agent_email
            logging.info(f"Calendar cancellation sent to agent: {agent_email}")
    
    logging.info(f"Customer {current_user.name} canceled inspection {inspection_id}. Calendar cancellations and push notifications sent.")
    
    # Delete the inspection
    await db.inspections.delete_one({"id": inspection_id})
    
    # Also update the quote status back to "quoted" so customer can re-schedule if they change their mind
    if inspection.get("quote_id"):
        await db.quotes.update_one(
            {"id": inspection["quote_id"]},
            {
                "$set": {
                    "status": QuoteStatus.quoted.value,
                    "updated_at": datetime.utcnow()
                }
            }
        )
    
    return {
        "success": True,
        "message": "Inspection canceled successfully. Calendar cancellations have been sent.",
        "calendar_cancellations_sent": cancellations_sent
    }


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
    """Get all confirmed/scheduled inspections including finalized (Owner only)"""
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can view all inspections")
    
    # Get both scheduled and finalized inspections
    inspections = await db.inspections.find(
        {"status": {"$in": [InspectionStatus.scheduled.value, "finalized"]}}
    ).to_list(1000)
    
    logging.info(f"Fetched {len(inspections)} inspections for owner")
    
    # Add fee_amount from linked quote for backward compatibility with existing data
    for inspection in inspections:
        if not inspection.get("fee_amount") and inspection.get("quote_id"):
            quote = await db.quotes.find_one({"id": inspection["quote_id"]})
            if quote and quote.get("quote_amount"):
                inspection["fee_amount"] = float(quote["quote_amount"])
        
        # Log status of each inspection for debugging
        if inspection.get("finalized") or inspection.get("status") == "finalized":
            logging.info(f"Inspection {inspection['id']}: status={inspection.get('status')}, finalized={inspection.get('finalized')}, property={inspection.get('property_address')}")
    
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


@api_router.patch("/admin/inspections/{inspection_id}/offer-times")
async def offer_time_slots(
    inspection_id: str,
    request_body: dict = Body(...),
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Offer time slots and assign inspector to customer (Owner only)"""
    from push_notification_service import send_push_notification
    
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can offer time slots")
    
    offered_time_slots = request_body.get("offered_time_slots", [])
    inspector_name = request_body.get("inspector_name")
    inspector_license = request_body.get("inspector_license")
    inspector_phone = request_body.get("inspector_phone")
    
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Update inspection with offered time slots and inspector info
    update_data = {
        "offered_time_slots": offered_time_slots,
        "status": "awaiting_customer_selection",  # New status
        "updated_at": datetime.utcnow()
    }
    
    if inspector_name:
        update_data["inspector_name"] = inspector_name
    if inspector_license:
        update_data["inspector_license"] = inspector_license
    if inspector_phone:
        update_data["inspector_phone"] = inspector_phone
    
    await db.inspections.update_one(
        {"id": inspection_id},
        {"$set": update_data}
    )
    
    # Send push notification to customer
    customer = await db.users.find_one({"id": inspection["customer_id"]})
    if customer and customer.get("push_token"):
        inspector_info = f" with {inspector_name}" if inspector_name else ""
        send_push_notification(
            push_token=customer["push_token"],
            title="Inspection Times Available",
            body=f"The inspector{inspector_info} has offered {len(offered_time_slots)} date(s) for your inspection at {inspection['property_address']}",
            data={"type": "time_slots_offered", "inspection_id": inspection_id}
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
        customer_phone=inspection_data.customer_phone,
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
        customer_phone=inspection_data.customer_phone,
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
            "agent_name": updated_manual.get('agent_name'),
            "agent_email": updated_manual.get('agent_email'),
            "agent_phone": updated_manual.get('agent_phone'),
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


@api_router.patch("/admin/inspections/{inspection_id}/update", response_model=InspectionResponse)
async def update_regular_inspection(
    inspection_id: str,
    update_data: dict,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Update regular inspection details (Owner only) - for inspections created through normal flow"""
    from push_notification_service import send_push_notification
    
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can update inspections")
    
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Filter out None values for partial update
    update_fields = {k: v for k, v in update_data.items() if v is not None}
    
    # Check if inspector is being changed
    old_inspector_id = inspection.get("inspector_id")
    new_inspector_id = update_fields.get("inspector_id")
    new_inspector_email = update_fields.get("inspector_email")
    inspector_changed = new_inspector_id and (old_inspector_id != new_inspector_id)
    
    # If inspector is being changed, fetch and set the inspector_name
    if inspector_changed and new_inspector_email:
        inspector_user = await db.users.find_one({"email": new_inspector_email})
        if inspector_user:
            update_fields["inspector_name"] = inspector_user.get("name", "")
    
    # Map client_ fields to customer_ fields for inspections collection
    field_mapping = {
        'client_name': 'customer_name',
        'client_email': 'customer_email',
        'customer_phone': 'customer_phone',
    }
    
    mapped_updates = {}
    for key, value in update_fields.items():
        mapped_key = field_mapping.get(key, key)
        mapped_updates[mapped_key] = value
    
    mapped_updates['updated_at'] = datetime.utcnow()
    
    if mapped_updates:
        await db.inspections.update_one(
            {"id": inspection_id},
            {"$set": mapped_updates}
        )
        
        logging.info(f"Regular inspection {inspection_id} updated with fields: {list(mapped_updates.keys())}")
    
    # Send calendar invites/cancellations and push notification if inspector was changed
    if inspector_changed and new_inspector_email:
        from email_service import send_inspection_calendar_invite, send_inspection_calendar_cancellation
        
        property_address = inspection.get("property_address", "Unknown address")
        scheduled_date = inspection.get("scheduled_date")
        scheduled_time = inspection.get("scheduled_time")
        customer_name = inspection.get("customer_name")
        customer_email = inspection.get("customer_email")
        customer_phone = inspection.get("customer_phone")
        
        # Get old inspector info for cancellation
        old_inspector_email = inspection.get("inspector_email")
        old_inspector_name = inspection.get("inspector_name", "Inspector")
        
        # Send calendar cancellation to OLD inspector (if exists)
        if old_inspector_email and scheduled_date and scheduled_time:
            try:
                send_inspection_calendar_cancellation(
                    to_email=old_inspector_email,
                    recipient_name=old_inspector_name,
                    property_address=property_address,
                    inspection_date=scheduled_date,
                    inspection_time=scheduled_time,
                    is_owner=True
                )
                logging.info(f"Calendar cancellation sent to old inspector {old_inspector_email}")
            except Exception as e:
                logging.error(f"Failed to send calendar cancellation to old inspector: {e}")
        
        # Find the new inspector by email for invite and push notification
        inspector_user = await db.users.find_one({"email": new_inspector_email})
        if inspector_user:
            new_inspector_name = inspector_user.get("name", "Inspector")
            
            # Send calendar invite to NEW inspector
            if scheduled_date and scheduled_time:
                try:
                    send_inspection_calendar_invite(
                        to_email=new_inspector_email,
                        recipient_name=new_inspector_name,
                        property_address=property_address,
                        inspection_date=scheduled_date,
                        inspection_time=scheduled_time,
                        is_owner=True,
                        customer_name=customer_name,
                        customer_email=customer_email,
                        customer_phone=customer_phone,
                        inspector_name=new_inspector_name
                    )
                    logging.info(f"Calendar invite sent to new inspector {new_inspector_email}")
                except Exception as e:
                    logging.error(f"Failed to send calendar invite to new inspector: {e}")
            
            # Send push notification to new inspector
            if inspector_user.get("push_token"):
                send_push_notification(
                    push_token=inspector_user["push_token"],
                    title="New Inspection Assigned",
                    body=f"You've been assigned an inspection at {property_address} on {scheduled_date} at {scheduled_time}",
                    data={
                        "type": "inspector_assigned",
                        "inspection_id": inspection_id,
                        "property_address": property_address
                    }
                )
                logging.info(f"Push notification sent to new inspector {new_inspector_email}")
    
    updated_inspection = await db.inspections.find_one({"id": inspection_id})
    return InspectionResponse(**updated_inspection)


@api_router.delete("/admin/inspections/{inspection_id}/cancel")
async def cancel_inspection(
    inspection_id: str,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Cancel an inspection (Owner only)"""
    from email_service import send_inspection_calendar_cancellation
    
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can cancel inspections")
    
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Get customer and owner info for notifications
    customer = await db.users.find_one({"id": inspection["customer_id"]}) if inspection.get("customer_id") != "manual-entry" else None
    owner = await db.users.find_one({"id": current_user.id})
    
    scheduled_date = inspection.get("scheduled_date")
    scheduled_time = inspection.get("scheduled_time")
    
    # Track emails sent for calendar cancellations
    cancellations_sent = {}
    emails_sent = set()  # To avoid sending duplicate emails
    
    # Send calendar cancellation to customer
    if scheduled_date and scheduled_time:
        customer_email = inspection["customer_email"]
        send_inspection_calendar_cancellation(
            to_email=customer_email,
            recipient_name=inspection["customer_name"],
            property_address=inspection["property_address"],
            inspection_date=scheduled_date,
            inspection_time=scheduled_time,
            is_owner=False
        )
        emails_sent.add(customer_email.lower())
        cancellations_sent["customer"] = customer_email
        logging.info(f"Calendar cancellation sent to customer: {customer_email}")
    
    # Send calendar cancellation to owner
    if owner and scheduled_date and scheduled_time:
        owner_email = owner["email"]
        send_inspection_calendar_cancellation(
            to_email=owner_email,
            recipient_name=owner["name"],
            property_address=inspection["property_address"],
            inspection_date=scheduled_date,
            inspection_time=scheduled_time,
            is_owner=True
        )
        emails_sent.add(owner_email.lower())
        cancellations_sent["owner"] = owner_email
        logging.info(f"Calendar cancellation sent to owner: {owner_email}")
    
    # Send calendar cancellation to inspector (if different from owner)
    inspector_email = None
    if inspection.get("inspector_name") and scheduled_date and scheduled_time:
        # Map inspector name to email
        inspector_emails = {
            "Brad Baker": "bradbakertx@gmail.com",
            "Blake Gray": None  # TODO: Add Blake's email when available
        }
        inspector_email = inspector_emails.get(inspection.get("inspector_name"))
        
        # Only send if inspector email exists and is different from emails already sent
        if inspector_email and inspector_email.lower() not in emails_sent:
            send_inspection_calendar_cancellation(
                to_email=inspector_email,
                recipient_name=inspection.get("inspector_name"),
                property_address=inspection["property_address"],
                inspection_date=scheduled_date,
                inspection_time=scheduled_time,
                is_owner=False
            )
            emails_sent.add(inspector_email.lower())
            cancellations_sent["inspector"] = inspector_email
            logging.info(f"Calendar cancellation sent to inspector: {inspector_email}")
    
    # Send calendar cancellation to agent if agent email exists and different from already sent
    if inspection.get("agent_email") and scheduled_date and scheduled_time:
        agent_email = inspection["agent_email"]
        if agent_email.lower() not in emails_sent:
            send_inspection_calendar_cancellation(
                to_email=agent_email,
                recipient_name=inspection.get("agent_name", "Agent"),
                property_address=inspection["property_address"],
                inspection_date=scheduled_date,
                inspection_time=scheduled_time,
                is_owner=False
            )
            emails_sent.add(agent_email.lower())
            cancellations_sent["agent"] = agent_email
            logging.info(f"Calendar cancellation sent to agent: {agent_email}")
    
    # Delete the inspection
    await db.inspections.delete_one({"id": inspection_id})
    
    return {
        "success": True,
        "message": "Inspection cancelled successfully. Calendar cancellations have been sent.",
        "calendar_cancellations_sent": cancellations_sent
    }

@api_router.patch("/admin/inspections/{inspection_id}/reschedule")
async def reschedule_inspection(
    inspection_id: str,
    scheduled_date: str = Body(...),
    scheduled_time: str = Body(...),
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Reschedule an inspection (Owner only)"""
    from email_service import send_inspection_calendar_invite
    
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can reschedule inspections")
    
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    if inspection["status"] != "scheduled":
        raise HTTPException(status_code=400, detail="Only scheduled inspections can be rescheduled")
    
    # Check for double-booking with same inspector
    inspector_name = inspection.get("inspector_name")
    if inspector_name:
        # Get all scheduled inspections for the same date
        potential_conflicts = await db.inspections.find({
            "id": {"$ne": inspection_id},  # Exclude current inspection
            "status": InspectionStatus.scheduled.value,
            "scheduled_date": scheduled_date,
            "inspector_name": inspector_name
        }).to_list(100)
        
        # Normalize the requested time
        normalized_requested_time = normalize_time_format(scheduled_time)
        
        # Check if any existing inspection has a conflicting time
        for existing in potential_conflicts:
            existing_time = existing.get("scheduled_time", "")
            normalized_existing_time = normalize_time_format(existing_time)
            
            if normalized_requested_time == normalized_existing_time:
                raise HTTPException(
                    status_code=409, 
                    detail=f"Inspector {inspector_name} is already scheduled for another inspection at {scheduled_date} {scheduled_time}. Please select a different time slot or assign a different inspector."
                )
    
    # Update the inspection with new date/time
    await db.inspections.update_one(
        {"id": inspection_id},
        {"$set": {
            "scheduled_date": scheduled_date,
            "scheduled_time": scheduled_time,
            "updated_at": datetime.utcnow().isoformat()
        }}
    )
    
    # Also update manual_inspections if this is a manual entry
    if inspection.get("customer_id") == "manual-entry":
        await db.manual_inspections.update_one(
            {"id": inspection_id},
            {"$set": {
                "inspection_date": scheduled_date,
                "inspection_time": scheduled_time,
                "updated_at": datetime.utcnow().isoformat()
            }}
        )
    
    # Get updated inspection
    updated_inspection = await db.inspections.find_one({"id": inspection_id})
    
    # Track emails sent for calendar invites
    invites_sent = {}
    emails_sent = set()
    
    # Prepare email details
    property_address = updated_inspection["property_address"]
    customer_email = updated_inspection["customer_email"]
    customer_name = updated_inspection["customer_name"]
    agent_email = updated_inspection.get("agent_email")
    agent_name = updated_inspection.get("agent_name", "Agent")
    
    # Send calendar invite to customer
    send_inspection_calendar_invite(
        to_email=customer_email,
        recipient_name=customer_name,
        property_address=property_address,
        inspection_date=scheduled_date,
        inspection_time=scheduled_time,
        is_owner=False
    )
    emails_sent.add(customer_email.lower())
    invites_sent["customer"] = customer_email
    logging.info(f"Calendar invite (rescheduled) sent to customer: {customer_email}")
    
    # Send push notification to customer
    customer = await db.users.find_one({"email": customer_email})
    if customer and customer.get("expo_push_token"):
        send_push_notification(
            expo_token=customer["expo_push_token"],
            title="Inspection Rescheduled",
            body=f"Your inspection at {property_address} has been rescheduled to {scheduled_date} at {scheduled_time}",
            data={"type": "inspection_rescheduled", "inspection_id": inspection_id}
        )
    
    # Send calendar invite to owner
    owner = await db.users.find_one({"id": current_user.id})
    if owner:
        owner_email = owner["email"]
        send_inspection_calendar_invite(
            to_email=owner_email,
            recipient_name=owner["name"],
            property_address=property_address,
            inspection_date=scheduled_date,
            inspection_time=scheduled_time,
            is_owner=True
        )
        emails_sent.add(owner_email.lower())
        invites_sent["owner"] = owner_email
        logging.info(f"Calendar invite (rescheduled) sent to owner: {owner_email}")
    
    # Send calendar invite to inspector (if different from owner)
    inspector_email = None
    if updated_inspection.get("inspector_name"):
        inspector_emails = {
            "Brad Baker": "bradbakertx@gmail.com",
            "Blake Gray": None
        }
        inspector_email = inspector_emails.get(updated_inspection.get("inspector_name"))
        
        if inspector_email and inspector_email.lower() not in emails_sent:
            send_inspection_calendar_invite(
                to_email=inspector_email,
                recipient_name=updated_inspection.get("inspector_name"),
                property_address=property_address,
                inspection_date=scheduled_date,
                inspection_time=scheduled_time,
                is_owner=False
            )
            emails_sent.add(inspector_email.lower())
            invites_sent["inspector"] = inspector_email
            logging.info(f"Calendar invite (rescheduled) sent to inspector: {inspector_email}")
            
            # Send push notification to inspector if they have a user account
            inspector_user = await db.users.find_one({"email": inspector_email})
            if inspector_user and inspector_user.get("expo_push_token"):
                send_push_notification(
                    expo_token=inspector_user["expo_push_token"],
                    title="Inspection Rescheduled",
                    body=f"Inspection at {property_address} has been rescheduled to {scheduled_date} at {scheduled_time}",
                    data={"type": "inspection_rescheduled", "inspection_id": inspection_id}
                )
    
    # Send calendar invite to agent (if applicable and different from already sent)
    if agent_email and agent_email.lower() not in emails_sent:
        send_inspection_calendar_invite(
            to_email=agent_email,
            recipient_name=agent_name,
            property_address=property_address,
            inspection_date=scheduled_date,
            inspection_time=scheduled_time,
            is_owner=False
        )
        emails_sent.add(agent_email.lower())
        invites_sent["agent"] = agent_email
        logging.info(f"Calendar invite (rescheduled) sent to agent: {agent_email}")
    
    # Send push notifications to all owners
    owners = await db.users.find({"role": UserRole.owner.value}).to_list(100)
    for owner_user in owners:
        if owner_user.get("expo_push_token"):
            send_push_notification(
                expo_token=owner_user["expo_push_token"],
                title="Inspection Rescheduled",
                body=f"Inspection at {property_address} rescheduled to {scheduled_date} at {scheduled_time}",
                data={"type": "inspection_rescheduled", "inspection_id": inspection_id}
            )
    
    return {
        "success": True,
        "message": "Inspection rescheduled successfully",
        "inspection": {
            "id": inspection_id,
            "scheduled_date": scheduled_date,
            "scheduled_time": scheduled_time
        },
        "calendar_invites_sent": invites_sent
    }

# ============= PRE-INSPECTION AGREEMENT ENDPOINTS =============

@api_router.get("/inspections/{inspection_id}/agreement")
async def get_agreement(
    inspection_id: str,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get pre-inspection agreement for customer"""
    from agreement_service import get_agreement_text
    
    if current_user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="Only customers can view agreement")
    
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Verify customer owns this inspection
    if inspection["customer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get quote for fee amount
    fee_amount = "425.00"  # Default
    if inspection.get("quote_id"):
        quote = await db.quotes.find_one({"id": inspection["quote_id"]})
        if quote and quote.get("quote_amount"):
            # Format to always have 2 decimal places
            fee_amount = f"{float(quote['quote_amount']):.2f}"
    
    # Generate agreement text with inspector info
    agreement_text = get_agreement_text(
        client_name=inspection["customer_name"],
        inspection_address=inspection["property_address"],
        fee_amount=fee_amount,
        inspection_date=inspection.get("scheduled_date", "TBD"),
        inspection_time=inspection.get("scheduled_time", "TBD"),
        inspector_name=inspection.get("inspector_name", "Brad Baker"),
        inspector_license=inspection.get("inspector_license", "TREC LIC. # 7522")
    )
    
    return {
        "agreement_text": agreement_text,
        "already_signed": inspection.get("agreement_signed", False),
        "signed_date": inspection.get("agreement_signed_date")
    }


@api_router.post("/inspections/{inspection_id}/sign-agreement")
async def sign_agreement(
    inspection_id: str,
    request_body: dict = Body(...),
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Sign pre-inspection agreement and generate PDF"""
    from agreement_service import generate_agreement_pdf, send_agreement_email
    
    if current_user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="Only customers can sign agreement")
    
    signature_data = request_body.get("signature")
    if not signature_data:
        raise HTTPException(status_code=400, detail="Signature is required")
    
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Verify customer owns this inspection
    if inspection["customer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get quote for fee amount
    fee_amount = "425.00"  # Default
    if inspection.get("quote_id"):
        quote = await db.quotes.find_one({"id": inspection["quote_id"]})
        if quote and quote.get("quote_amount"):
            # Format to always have 2 decimal places
            fee_amount = f"{float(quote['quote_amount']):.2f}"
    
    # Generate PDF with inspector info
    try:
        pdf_bytes = generate_agreement_pdf(
            client_name=inspection["customer_name"],
            inspection_address=inspection["property_address"],
            fee_amount=fee_amount,
            inspection_date=inspection.get("scheduled_date", "TBD"),
            inspection_time=inspection.get("scheduled_time", "TBD"),
            signature_base64=signature_data,
            inspector_name=inspection.get("inspector_name", "Brad Baker"),
            inspector_license=inspection.get("inspector_license", "TREC LIC. # 7522")
        )
    except Exception as e:
        logging.error(f"Error generating PDF: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF")
    
    # Upload PDF to S3
    from s3_service import upload_agreement_to_s3
    
    try:
        s3_result = upload_agreement_to_s3(inspection_id, pdf_bytes)
        logging.info(f"Agreement PDF uploaded to S3: {s3_result['s3_key']}")
    except Exception as e:
        logging.error(f"Failed to upload agreement to S3: {e}")
        # Don't fail the whole request if S3 upload fails
        s3_result = {"s3_key": None, "s3_url": None}
    
    # Update inspection with signature and S3 info
    await db.inspections.update_one(
        {"id": inspection_id},
        {
            "$set": {
                "agreement_signed": True,
                "agreement_signed_date": datetime.utcnow(),
                "agreement_signature_data": signature_data,
                "agreement_s3_key": s3_result.get("s3_key"),
                "agreement_s3_url": s3_result.get("s3_url"),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Send PDF to customer
    send_agreement_email(
        to_email=current_user.email,
        recipient_name=current_user.name,
        property_address=inspection["property_address"],
        pdf_bytes=pdf_bytes
    )
    
    # Track emails sent to avoid duplicates
    emails_sent = {current_user.email}
    
    # Send PDF to inspector (if they have an email and different from customer)
    inspector_email = None
    if inspection.get("inspector_name"):
        # Map inspector name to email (you can expand this mapping later)
        inspector_emails = {
            "Brad Baker": "bradbakertx@gmail.com",
            "Blake Gray": None  # TODO: Add Blake's email when available
        }
        inspector_email = inspector_emails.get(inspection.get("inspector_name"))
        
        if inspector_email and inspector_email not in emails_sent:
            send_agreement_email(
                to_email=inspector_email,
                recipient_name=inspection.get("inspector_name"),
                property_address=inspection["property_address"],
                pdf_bytes=pdf_bytes
            )
            emails_sent.add(inspector_email)
    
    # Send PDF to all owners (if different from inspector and customer)
    owners = await db.users.find({"role": UserRole.owner.value}).to_list(100)
    for owner in owners:
        if owner["email"] not in emails_sent:
            send_agreement_email(
                to_email=owner["email"],
                recipient_name=owner["name"],
                property_address=inspection["property_address"],
                pdf_bytes=pdf_bytes
            )
            emails_sent.add(owner["email"])
    
    logging.info(f"Agreement signed for inspection {inspection_id} by customer {current_user.name}")
    logging.info(f"PDFs sent to: {', '.join(emails_sent)}")
    
    return {
        "success": True,
        "message": "Agreement signed successfully. PDFs have been emailed to you, the inspector, and the owner."
    }


@api_router.get("/inspections/{inspection_id}/agreement/download")
async def download_agreement(
    inspection_id: str,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get a download URL for the signed agreement PDF"""
    from s3_service import get_agreement_download_url
    
    # Get inspection
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Check permissions
    if current_user.role == UserRole.customer and inspection["customer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if agreement is signed
    if not inspection.get("agreement_signed"):
        raise HTTPException(status_code=404, detail="Agreement not signed yet")
    
    # Check if S3 key exists
    s3_key = inspection.get("agreement_s3_key")
    if not s3_key:
        raise HTTPException(status_code=404, detail="Agreement PDF not found in storage")
    
    # Generate pre-signed download URL (valid for 1 hour)
    try:
        download_url = get_agreement_download_url(s3_key, expiration=3600)
        return {
            "download_url": download_url,
            "expires_in": 3600  # seconds
        }
    except Exception as e:
        logging.error(f"Failed to generate download URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate download URL")


@api_router.post("/inspections/{inspection_id}/report/upload")
async def upload_inspection_report(
    inspection_id: str,
    files: List[UploadFile] = File(...),
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Upload multiple inspection report PDFs to S3 (Owner only)"""
    from s3_service import upload_report_to_s3
    from push_notification_service import send_push_notification
    
    # Only owners can upload reports
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can upload reports")
    
    # Get inspection
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Validate all files are PDFs
    for file in files:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail=f"Only PDF files are allowed: {file.filename}")
    
    # Upload all files
    uploaded_files = []
    try:
        for idx, file in enumerate(files):
            pdf_content = await file.read()
            
            # Create unique S3 key for each file
            # If single file, use standard naming; if multiple, add index
            if len(files) == 1:
                s3_key_suffix = ""
            else:
                s3_key_suffix = f"-{idx + 1}"
            
            # Upload to S3 with modified filename
            s3_result = upload_report_to_s3(inspection_id, pdf_content, suffix=s3_key_suffix)
            logging.info(f"Report uploaded to S3: {s3_result['s3_key']}")
            
            uploaded_files.append({
                "s3_key": s3_result["s3_key"],
                "s3_url": s3_result["s3_url"],
                "filename": file.filename,
                "uploaded_at": datetime.utcnow().isoformat()
            })
        
        # Get existing report files
        existing_files = inspection.get("report_files", [])
        if existing_files is None:
            existing_files = []
        
        # Append new files to existing
        all_files = existing_files + uploaded_files
        
        # Update inspection with all report files
        await db.inspections.update_one(
            {"id": inspection_id},
            {
                "$set": {
                    "report_files": all_files,
                    "report_uploaded_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Send push notification to customer
        customer = await db.users.find_one({"id": inspection["customer_id"]})
        if customer and customer.get("push_token"):
            property_address = inspection.get("property_address", "your property")
            file_count = len(uploaded_files)
            file_word = "file" if file_count == 1 else "files"
            send_push_notification(
                push_token=customer["push_token"],
                title="Inspection Report Available",
                body=f"{file_count} report {file_word} for {property_address} uploaded",
                data={
                    "type": "report_uploaded",
                    "inspection_id": inspection_id
                }
            )
            logging.info(f"Push notification sent to customer for report upload")
        
        # Send push notification to agent if exists
        if inspection.get("agent_email"):
            agent = await db.users.find_one({"email": inspection["agent_email"]})
            if agent and agent.get("push_token"):
                property_address = inspection.get("property_address", "the property")
                file_count = len(uploaded_files)
                file_word = "file" if file_count == 1 else "files"
                send_push_notification(
                    push_token=agent["push_token"],
                    title="Inspection Report Available",
                    body=f"{file_count} report {file_word} for {property_address} uploaded",
                    data={
                        "type": "report_uploaded",
                        "inspection_id": inspection_id
                    }
                )
                logging.info(f"Push notification sent to agent for report upload")
        
        return {
            "success": True,
            "message": f"{len(uploaded_files)} report(s) uploaded successfully",
            "uploaded_files": uploaded_files
        }
        
    except Exception as e:
        logging.error(f"Failed to upload report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload report: {str(e)}")


@api_router.get("/inspections/{inspection_id}/report/download")
async def download_inspection_report(
    inspection_id: str,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get a download URL for the inspection report PDF - with UUID-based authorization"""
    from s3_service import get_report_download_url
    
    # Get inspection
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # UUID-based authorization: Check if user is authorized to access this report
    is_authorized = False
    
    if current_user.role == UserRole.owner:
        # Owner has access to all reports
        is_authorized = True
    elif current_user.role == UserRole.customer:
        # Customer can access if their UUID matches
        is_authorized = inspection.get("customer_id") == current_user.id
    elif current_user.role == UserRole.agent:
        # Agent can access if their email or UUID matches (for historical records)
        is_authorized = (
            inspection.get("agent_email") == current_user.email or
            inspection.get("agent_id") == current_user.id
        )
    elif current_user.role == UserRole.inspector:
        # Inspector can access if their email or UUID matches (for historical records)
        is_authorized = (
            inspection.get("inspector_email") == current_user.email or
            inspection.get("inspector_id") == current_user.id
        )
    
    if not is_authorized:
        logging.warning(f"Unauthorized report access attempt by {current_user.email} (role: {current_user.role}) for inspection {inspection_id}")
        raise HTTPException(status_code=403, detail="Not authorized to access this report")
    
    # Check if report exists
    s3_key = inspection.get("report_s3_key")
    if not s3_key:
        raise HTTPException(status_code=404, detail="Report not uploaded yet")
    
    # Generate pre-signed download URL (valid for 1 hour)
    try:
        download_url = get_report_download_url(s3_key, expiration=3600)
        logging.info(f"Report download URL generated for {current_user.email} (role: {current_user.role}) - inspection {inspection_id}")
        return {
            "download_url": download_url,
            "expires_in": 3600  # seconds
        }
    except Exception as e:
        logging.error(f"Failed to generate download URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate download URL")


# ============= PAYMENT ENDPOINTS =============

@app.get("/payment", response_class=HTMLResponse)
async def serve_payment_form(
    id: str,
    amount: str,
    address: str,
    appId: str,
    locationId: str
):
    """Serve Square payment form via HTTPS"""
    html_path = ROOT_DIR / "payment_form.html"
    with open(html_path, 'r') as f:
        html_content = f.read()
    return html_content


@api_router.post("/inspections/{inspection_id}/create-payment")
async def create_square_payment(
    inspection_id: str,
    payment_data: dict,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Create Square payment for inspection"""
    from square.client import Client
    import os
    from push_notification_service import send_push_notification
    
    # Get inspection
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Check if already paid
    if inspection.get("payment_completed"):
        raise HTTPException(status_code=400, detail="Inspection already paid")
    
    # Get fee amount
    fee_amount = inspection.get("fee_amount")
    if not fee_amount:
        raise HTTPException(status_code=400, detail="No fee amount set for this inspection")
    
    try:
        # Initialize Square client
        client = Client(
            access_token=os.getenv("SQUARE_ACCESS_TOKEN"),
            environment='production' if os.getenv("SQUARE_ENVIRONMENT") == "production" else 'sandbox'
        )
        
        # Convert amount to cents (Square uses cents)
        amount_cents = int(float(fee_amount) * 100)
        
        # Create payment
        result = client.payments.create_payment(
            body={
                "source_id": payment_data.get("source_id"),
                "idempotency_key": payment_data.get("idempotency_key"),
                "amount_money": {
                    "amount": amount_cents,
                    "currency": "USD"
                },
                "location_id": os.getenv("SQUARE_LOCATION_ID"),
                "note": f"Inspection payment for {inspection.get('property_address')}"
            }
        )
        
        if result.is_success():
            payment_response = result.body
            transaction_id = payment_response['payment']['id']
            
            # Update inspection with payment info
            await db.inspections.update_one(
                {"id": inspection_id},
                {
                    "$set": {
                        "payment_completed": True,
                        "payment_date": datetime.utcnow(),
                        "payment_transaction_id": transaction_id,
                        "payment_amount": fee_amount,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Check if inspection is also finalized - if both, send notifications
            if inspection.get("finalized"):
                # Send notifications to customer and agent
                customer = await db.users.find_one({"id": inspection["customer_id"]})
                if customer and customer.get("push_token"):
                    send_push_notification(
                        push_token=customer["push_token"],
                        title="Reports Unlocked!",
                        body=f"Payment received and reports are now available for {inspection.get('property_address')}",
                        data={"type": "reports_unlocked", "inspection_id": inspection_id}
                    )
                
                if inspection.get("agent_email"):
                    agent = await db.users.find_one({"email": inspection["agent_email"]})
                    if agent and agent.get("push_token"):
                        send_push_notification(
                            push_token=agent["push_token"],
                            title="Reports Unlocked!",
                            body=f"Payment received and reports are now available for {inspection.get('property_address')}",
                            data={"type": "reports_unlocked", "inspection_id": inspection_id}
                        )
            
            return {
                "success": True,
                "message": "Payment successful",
                "transaction_id": transaction_id,
                "reports_unlocked": inspection.get("finalized", False)
            }
        
        elif result.is_error():
            error_message = result.errors[0]['detail'] if result.errors else "Payment failed"
            logging.error(f"Square payment error: {error_message}")
            raise HTTPException(status_code=400, detail=error_message)
            
    except Exception as e:
        logging.error(f"Payment processing error: {e}")
        raise HTTPException(status_code=500, detail=f"Payment processing failed: {str(e)}")


@api_router.post("/inspections/{inspection_id}/finalize")
async def finalize_inspection(
    inspection_id: str,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Finalize inspection - send notifications and emails with reports (Owner/Inspector only)"""
    from push_notification_service import send_push_notification
    from s3_service import get_report_download_url
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.application import MIMEApplication
    import os
    import requests
    
    # Only owners or inspectors can finalize
    if current_user.role not in [UserRole.owner, UserRole.inspector]:
        raise HTTPException(status_code=403, detail="Only owners or inspectors can finalize inspections")
    
    # Get inspection
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Check if already finalized
    if inspection.get("finalized"):
        raise HTTPException(status_code=400, detail="Inspection already finalized")
    
    # Check if reports exist
    report_files = inspection.get("report_files", [])
    if not report_files:
        raise HTTPException(status_code=400, detail="No reports uploaded yet")
    
    try:
        # Update inspection as finalized
        update_result = await db.inspections.update_one(
            {"id": inspection_id},
            {
                "$set": {
                    "finalized": True,
                    "finalized_at": datetime.utcnow(),
                    "status": "finalized",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logging.info(f"Finalized inspection {inspection_id}, matched: {update_result.matched_count}, modified: {update_result.modified_count}")
        
        if update_result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Inspection not found during update")
        
        # Fetch updated inspection to verify
        inspection = await db.inspections.find_one({"id": inspection_id})
        logging.info(f"Updated inspection status: {inspection.get('status')}, finalized: {inspection.get('finalized')}")
        
        property_address = inspection.get("property_address", "the property")
        inspector_name = inspection.get("inspector_name", "Brad Baker")
        inspector_phone = inspection.get("inspector_phone", "(210) 562-0673")
        
        # Check if payment is completed
        payment_completed = inspection.get("payment_completed", False)
        
        # Send push notifications (non-blocking - don't fail finalization if this fails)
        try:
            customer = await db.users.find_one({"id": inspection["customer_id"]})
            if customer and customer.get("push_token"):
                if payment_completed:
                    # Both finalized AND paid - reports unlocked!
                    send_push_notification(
                        push_token=customer["push_token"],
                        title="Reports Unlocked!",
                        body=f"Your inspection reports for {property_address} are now available to view!",
                        data={
                            "type": "reports_unlocked",
                            "inspection_id": inspection_id
                        }
                    )
                    logging.info(f"Reports unlocked notification sent to customer")
                else:
                    # Finalized but not paid - reports pending payment
                    send_push_notification(
                        push_token=customer["push_token"],
                        title="Inspection Reports Ready",
                        body=f"Reports for {property_address} are ready. Payment required to view.",
                        data={
                            "type": "inspection_finalized",
                            "inspection_id": inspection_id
                        }
                    )
                    logging.info(f"Finalization notification sent to customer (pending payment)")
            
            if inspection.get("agent_email"):
                agent = await db.users.find_one({"email": inspection["agent_email"]})
                if agent and agent.get("push_token"):
                    if payment_completed:
                        send_push_notification(
                            push_token=agent["push_token"],
                            title="Reports Unlocked!",
                            body=f"Inspection reports for {property_address} are now available!",
                            data={
                                "type": "reports_unlocked",
                                "inspection_id": inspection_id
                            }
                        )
                        logging.info(f"Reports unlocked notification sent to agent")
                    else:
                        send_push_notification(
                            push_token=agent["push_token"],
                            title="Inspection Reports Ready",
                            body=f"Reports for {property_address} are ready (pending payment).",
                            data={
                                "type": "inspection_finalized",
                                "inspection_id": inspection_id
                            }
                        )
                        logging.info(f"Finalization notification sent to agent (pending payment)")
        except Exception as e:
            logging.error(f"Failed to send push notifications (non-critical): {e}")
        
        # Send emails with report attachments (non-blocking - don't fail finalization if this fails)
        try:
            gmail_user = os.getenv("GMAIL_USER")
            gmail_password = os.getenv("GMAIL_APP_PASSWORD")
            
            # Email to customer
            if customer:
                msg = MIMEMultipart()
                msg['From'] = gmail_user
                msg['To'] = customer["email"]
                msg['Subject'] = f'{property_address} Inspection Reports'
                
                # Email body
                body = f"""Thank you for trusting Beneficial Inspections with your inspection.

Here are your report files. Please read over them and if you have any questions or concerns, do not hesitate to contact us any time.

You can reach {inspector_name} directly at {inspector_phone} voice or text.

Thanks again!

Brad Baker
TREC Lic #7522
San Antonio
(210) 562-0673
www.beneficialinspects.com"""
                
                msg.attach(MIMEText(body, 'plain'))
                
                # Attach all report files
                for report_file in report_files:
                    try:
                        # Get file from S3
                        download_url = get_report_download_url(report_file["s3_key"], expiration=300)
                        response = requests.get(download_url)
                        if response.status_code == 200:
                            part = MIMEApplication(response.content, Name=report_file["filename"])
                            part['Content-Disposition'] = f'attachment; filename="{report_file["filename"]}"'
                            msg.attach(part)
                    except Exception as e:
                        logging.error(f"Failed to attach report file {report_file['filename']}: {e}")
                
                # Send email
                try:
                    server = smtplib.SMTP('smtp.gmail.com', 587)
                    server.starttls()
                    server.login(gmail_user, gmail_password)
                    server.send_message(msg)
                    server.quit()
                    logging.info(f"Email sent to customer {customer['email']}")
                except Exception as e:
                    logging.error(f"Failed to send email to customer: {e}")
            
            # Email to agent (if exists)
            if inspection.get("agent_email"):
                agent = await db.users.find_one({"email": inspection["agent_email"]})
                if agent:
                    msg = MIMEMultipart()
                    msg['From'] = gmail_user
                    msg['To'] = agent["email"]
                    msg['Subject'] = f'{property_address} Inspection Reports'
                    
                    body = f"""Thank you for trusting Beneficial Inspections with your inspection.

Here are your report files. Please read over them and if you have any questions or concerns, do not hesitate to contact us any time.

You can reach {inspector_name} directly at {inspector_phone} voice or text.

Thanks again!

Brad Baker
TREC Lic #7522
San Antonio
(210) 562-0673
www.beneficialinspects.com"""
                    
                    msg.attach(MIMEText(body, 'plain'))
                    
                    # Attach all report files
                    for report_file in report_files:
                        try:
                            download_url = get_report_download_url(report_file["s3_key"], expiration=300)
                            response = requests.get(download_url)
                            if response.status_code == 200:
                                part = MIMEApplication(response.content, Name=report_file["filename"])
                                part['Content-Disposition'] = f'attachment; filename="{report_file["filename"]}"'
                                msg.attach(part)
                        except Exception as e:
                            logging.error(f"Failed to attach report file {report_file['filename']}: {e}")
                    
                    try:
                        server = smtplib.SMTP('smtp.gmail.com', 587)
                        server.starttls()
                        server.login(gmail_user, gmail_password)
                        server.send_message(msg)
                        server.quit()
                        logging.info(f"Email sent to agent {agent['email']}")
                    except Exception as e:
                        logging.error(f"Failed to send email to agent: {e}")
        except Exception as e:
            logging.error(f"Failed to send emails (non-critical): {e}")
        
        return {
            "success": True,
            "message": "Inspection finalized successfully. Notifications and emails sent.",
            "inspection_id": inspection_id,
            "status": inspection.get("status"),
            "finalized": inspection.get("finalized")
        }
        
    except Exception as e:
        logging.error(f"Failed to finalize inspection: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to finalize inspection: {str(e)}")


@api_router.post("/inspections/{inspection_id}/mark-paid")
async def mark_inspection_paid(
    inspection_id: str,
    payment_method: str = Query(..., description="Payment method: Cash, Check, Card/Mobile Tap"),
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Mark inspection as paid (Owner only)"""
    from push_notification_service import send_push_notification
    
    # Only owners can mark as paid
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can mark inspections as paid")
    
    # Get inspection
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    # Check if already paid
    if inspection.get("is_paid"):
        raise HTTPException(status_code=400, detail="Inspection already marked as paid")
    
    # Validate payment method
    valid_methods = ["Cash", "Check", "Card/Mobile Tap"]
    if payment_method not in valid_methods:
        raise HTTPException(status_code=400, detail=f"Invalid payment method. Must be one of: {', '.join(valid_methods)}")
    
    try:
        # Update inspection as paid
        await db.inspections.update_one(
            {"id": inspection_id},
            {
                "$set": {
                    "is_paid": True,
                    "payment_completed": True,
                    "payment_method": payment_method,
                    "payment_date": datetime.utcnow(),
                    "payment_amount": inspection.get("fee_amount"),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logging.info(f"Inspection {inspection_id} marked as paid via {payment_method}")
        
        # Send push notification to customer
        customer_id = inspection.get("customer_id")
        if customer_id:
            customer = await db.users.find_one({"id": customer_id})
            if customer and customer.get("push_token"):
                send_push_notification(
                    push_token=customer["push_token"],
                    title="Payment Confirmed!",
                    body=f"Your payment for {inspection.get('property_address')} has been confirmed. Reports are now unlocked!",
                    data={
                        "type": "payment_confirmed",
                        "inspection_id": inspection_id
                    }
                )
                logging.info(f"Payment confirmation notification sent to customer")
        
        # Send push notification to agent if exists
        agent_email = inspection.get("agent_email")
        if agent_email:
            agent = await db.users.find_one({"email": agent_email})
            if agent and agent.get("push_token"):
                send_push_notification(
                    push_token=agent["push_token"],
                    title="Payment Confirmed",
                    body=f"Payment for {inspection.get('property_address')} confirmed. Reports unlocked!",
                    data={
                        "type": "payment_confirmed",
                        "inspection_id": inspection_id
                    }
                )
                logging.info(f"Payment confirmation notification sent to agent")
        
        return {
            "success": True,
            "message": f"Inspection marked as paid via {payment_method}",
            "payment_method": payment_method
        }
        
    except Exception as e:
        logging.error(f"Failed to mark inspection as paid: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to mark as paid: {str(e)}")


# ============= CHAT/MESSAGE ENDPOINTS =============

@api_router.post("/messages", response_model=MessageResponse)
async def send_message(
    message_data: MessageCreate,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Send a message - either to owner (general) or to inspector (inspection-specific)"""
    from push_notification_service import send_push_notification
    from datetime import timedelta
    
    recipient_id = message_data.recipient_id
    recipient_role = None
    expires_at = None
    
    # If inspection_id is provided, this is an inspector chat
    if message_data.inspection_id:
        inspection = await db.inspections.find_one({"id": message_data.inspection_id})
        if not inspection:
            raise HTTPException(status_code=404, detail="Inspection not found")
        
        # Check permissions
        if current_user.role == UserRole.customer and inspection["customer_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Calculate expiry: 24 hours after inspection
        if inspection.get("scheduled_date") and inspection.get("scheduled_time"):
            # Parse inspection datetime and add 24 hours
            try:
                from datetime import datetime as dt
                inspection_datetime = dt.fromisoformat(f"{inspection['scheduled_date']}T{inspection['scheduled_time'].replace(' ', '')}")
                expires_at = inspection_datetime + timedelta(hours=24)
            except:
                expires_at = datetime.utcnow() + timedelta(days=30)  # Fallback
        
        # Determine recipient (inspector from inspection or owner)
        if not recipient_id:
            # Try to get inspector email directly from inspection
            inspector_email = inspection.get("inspector_email")
            if inspector_email:
                inspector_user = await db.users.find_one({"email": inspector_email})
                if inspector_user:
                    recipient_id = inspector_user["id"]
                    recipient_role = UserRole.inspector
        
        if not recipient_id:
            # Default to owner if no inspector
            owner = await db.users.find_one({"role": UserRole.owner.value})
            if owner:
                recipient_id = owner["id"]
                recipient_role = UserRole.owner
    else:
        # General owner chat (no inspection)
        # If recipient_id is already provided (owner sending to customer/agent), preserve it
        if message_data.recipient_id:
            recipient_id = message_data.recipient_id
            # Determine recipient role by looking up the user
            recipient_user = await db.users.find_one({"id": recipient_id})
            if recipient_user:
                recipient_role = UserRole(recipient_user["role"])
        else:
            # If no recipient_id provided (customer/agent sending to owner), default to owner
            owner = await db.users.find_one({"role": UserRole.owner.value})
            if owner:
                recipient_id = owner["id"]
                recipient_role = UserRole.owner
        expires_at = datetime.utcnow() + timedelta(days=30)  # General chats last longer
    
    message_id = str(uuid.uuid4())
    message = MessageInDB(
        id=message_id,
        inspection_id=message_data.inspection_id,
        sender_id=current_user.id,
        sender_name=current_user.name,
        sender_role=current_user.role,
        recipient_id=recipient_id,
        recipient_role=recipient_role,
        message_text=message_data.message_text,
        is_read=False,
        created_at=datetime.utcnow(),
        expires_at=expires_at
    )
    
    await db.messages.insert_one(message.dict())
    
    # Send push notification to recipient
    if recipient_id:
        recipient_user = await db.users.find_one({"id": recipient_id})
        if recipient_user and recipient_user.get("expo_push_token"):
            send_push_notification(
                expo_token=recipient_user["expo_push_token"],
                title=f"New message from {current_user.name}",
                body=message_data.message_text[:100],
                data={
                    "type": "new_message",
                    "inspection_id": message_data.inspection_id or "general",
                    "conversation_type": "inspector_chat" if message_data.inspection_id else "owner_chat"
                }
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


@api_router.get("/messages/owner/chat", response_model=List[MessageResponse])
async def get_owner_chat_messages(
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get all messages for owner chat (no inspection_id)"""
    
    if current_user.role == UserRole.owner:
        # Owners see ALL owner chat messages (regardless of which specific owner ID)
        # Mark all unread owner chat messages as read
        await db.messages.update_many(
            {
                "inspection_id": None,
                "recipient_role": UserRole.owner.value,
                "is_read": False
            },
            {"$set": {"is_read": True}}
        )
        
        # Get all owner chat messages (no inspection_id, sent to or from any owner)
        messages = await db.messages.find({
            "inspection_id": None,
            "$or": [
                {"recipient_role": UserRole.owner.value},
                {"sender_role": UserRole.owner.value}
            ]
        }).sort("created_at", 1).to_list(1000)
    else:
        # Customers/others see messages between them and ANY owner
        # Mark messages as read for current user
        await db.messages.update_many(
            {
                "inspection_id": None,
                "sender_role": UserRole.owner.value,
                "recipient_id": current_user.id,
                "is_read": False
            },
            {"$set": {"is_read": True}}
        )
        
        # Get messages between current user and any owner (no inspection_id)
        messages = await db.messages.find({
            "inspection_id": None,
            "$or": [
                {"sender_id": current_user.id, "recipient_role": UserRole.owner.value},
                {"sender_role": UserRole.owner.value, "recipient_id": current_user.id}
            ]
        }).sort("created_at", 1).to_list(1000)
    
    return [MessageResponse(**msg) for msg in messages]


@api_router.get("/conversations", response_model=List[ConversationSummary])
async def get_conversations(
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Get all conversations for current user - both owner chats and inspector chats"""
    from datetime import datetime as dt
    
    conversations = []
    now = dt.utcnow()
    
    # Owner sees messages where they are the recipient
    # Inspector sees messages where they are the recipient
    # Customer sees their own sent messages (grouped by recipient)
    
    if current_user.role in [UserRole.owner, UserRole.inspector]:
        # Get all messages where current user is the recipient OR any owner is the recipient (for owner role)
        if current_user.role == UserRole.owner:
            # Owners see ALL messages sent to ANY owner OR sent to them as inspector
            messages = await db.messages.find({
                "$and": [
                    {
                        "$or": [
                            {"recipient_role": UserRole.owner.value},  # Messages to any owner
                            {"recipient_id": current_user.id},  # Messages to them as inspector
                        ]
                    },
                    {
                        "$or": [
                            {"expires_at": {"$gt": now}},
                            {"expires_at": None}
                        ]
                    }
                ]
            }).to_list(1000)
        else:
            # Inspectors see messages where they are the recipient OR inspections they are assigned to
            # First, get all inspection IDs where this inspector is assigned
            assigned_inspections = await db.inspections.find({
                "inspector_id": current_user.id
            }).to_list(1000)
            assigned_inspection_ids = [insp["id"] for insp in assigned_inspections]
            
            # Get messages where they are the recipient OR messages for their assigned inspections
            messages = await db.messages.find({
                "$and": [
                    {
                        "$or": [
                            {"recipient_id": current_user.id},  # Direct messages to them
                            {"inspection_id": {"$in": assigned_inspection_ids}}  # Messages for their assigned inspections
                        ]
                    },
                    {
                        "$or": [
                            {"expires_at": {"$gt": now}},
                            {"expires_at": None}
                        ]
                    }
                ]
            }).to_list(1000)
        
        # Group by sender (customer) and inspection_id
        conversation_map = {}
        for msg in messages:
            # Create unique conversation key
            if msg.get("inspection_id"):
                conv_key = f"inspector_{msg['inspection_id']}"
            else:
                # For owner chats, group by the CUSTOMER (non-owner participant)
                # If sender is not owner, use sender_id; if sender is owner, use recipient_id
                if msg.get("sender_role") != UserRole.owner.value:
                    customer_id = msg["sender_id"]
                else:
                    customer_id = msg.get("recipient_id")
                
                conv_key = f"owner_{customer_id}"
            
            if conv_key not in conversation_map:
                # For owner chat, set the customer as the "sender" for the conversation
                # For inspector chat, we'll get customer from inspection later
                sender_id = customer_id if not msg.get("inspection_id") else None
                
                conversation_map[conv_key] = {
                    "messages": [],
                    "inspection_id": msg.get("inspection_id"),
                    "sender_id": sender_id,
                    "conversation_type": "inspector_chat" if msg.get("inspection_id") else "owner_chat"
                }
            conversation_map[conv_key]["messages"].append(msg)
        
        # Build conversation summaries
        for conv_key, conv_data in conversation_map.items():
            messages_list = conv_data["messages"]
            messages_list.sort(key=lambda x: x["created_at"], reverse=True)
            last_msg = messages_list[0]
            
            # Get sender (customer) info
            # For inspector chats, get customer from inspection; for owner chats, use sender_id
            if conv_data["conversation_type"] == "inspector_chat" and conv_data["inspection_id"]:
                # Get customer from inspection
                inspection = await db.inspections.find_one({"id": conv_data["inspection_id"]})
                if not inspection:
                    continue
                customer_id = inspection.get("customer_id")
                sender = await db.users.find_one({"id": customer_id})
                if not sender:
                    continue
            else:
                # For owner chats, use the sender_id
                sender = await db.users.find_one({"id": conv_data["sender_id"]})
                if not sender:
                    continue
                
                # Skip if the "customer" is actually an owner (orphaned conversation)
                if sender.get("role") == UserRole.owner.value:
                    continue
            
            # Get inspection details if applicable
            inspection_details = {}
            if conv_data["inspection_id"]:
                inspection = await db.inspections.find_one({"id": conv_data["inspection_id"]})
                if inspection:
                    inspection_details = {
                        "property_address": inspection.get("property_address"),
                        "inspection_date": inspection.get("scheduled_date"),
                        "inspection_time": inspection.get("scheduled_time"),
                        "inspector_name": inspection.get("inspector_name")
                    }
            
            # Count unread
            unread = sum(1 for m in messages_list if not m.get("is_read", False))
            
            conversation = ConversationSummary(
                id=conv_key,
                conversation_type=conv_data["conversation_type"],
                inspection_id=conv_data["inspection_id"],
                property_address=inspection_details.get("property_address"),
                customer_name=sender["name"],
                customer_id=sender["id"],
                customer_phone=sender.get("phone"),
                inspector_name=inspection_details.get("inspector_name"),
                last_message=last_msg["message_text"],
                last_message_time=last_msg["created_at"],
                unread_count=unread,
                expires_at=last_msg.get("expires_at"),
                inspection_date=inspection_details.get("inspection_date"),
                inspection_time=inspection_details.get("inspection_time")
            )
            conversations.append(conversation)
    
    elif current_user.role == UserRole.customer:
        # Customers see:
        # 1. Messages they sent
        # 2. Messages for inspections where they are the customer
        
        # Get all inspections where customer is involved
        customer_inspections = await db.inspections.find({
            "customer_id": current_user.id
        }).to_list(1000)
        customer_inspection_ids = [insp["id"] for insp in customer_inspections]
        
        # Get messages where customer sent them OR messages for their inspections
        messages = await db.messages.find({
            "$and": [
                {
                    "$or": [
                        {"sender_id": current_user.id},  # Messages they sent
                        {"inspection_id": {"$in": customer_inspection_ids}}  # Messages for their inspections
                    ]
                },
                {
                    "$or": [
                        {"expires_at": {"$gt": now}},
                        {"expires_at": None}
                    ]
                }
            ]
        }).to_list(1000)
        
        # Group by inspection_id or recipient
        conversation_map = {}
        for msg in messages:
            if msg.get("inspection_id"):
                conv_key = f"inspector_{msg['inspection_id']}"
            else:
                conv_key = f"owner_{msg.get('recipient_id', 'general')}"
            
            if conv_key not in conversation_map:
                conversation_map[conv_key] = {
                    "messages": [],
                    "inspection_id": msg.get("inspection_id"),
                    "recipient_id": msg.get("recipient_id"),
                    "conversation_type": "inspector_chat" if msg.get("inspection_id") else "owner_chat"
                }
            conversation_map[conv_key]["messages"].append(msg)
        
        # Build summaries
        for conv_key, conv_data in conversation_map.items():
            messages_list = conv_data["messages"]
            messages_list.sort(key=lambda x: x["created_at"], reverse=True)
            last_msg = messages_list[0]
            
            # Get recipient info - for owner chat, always show the current active owner
            recipient_name = "Owner"
            if conv_data["conversation_type"] == "owner_chat":
                # For owner chats, always get the current active owner (not the deleted one)
                current_owner = await db.users.find_one({"role": UserRole.owner.value})
                if current_owner:
                    recipient_name = current_owner["name"]
            elif conv_data["recipient_id"]:
                # For inspector chats, use the specific recipient
                recipient = await db.users.find_one({"id": conv_data["recipient_id"]})
                if recipient:
                    recipient_name = recipient["name"]
            
            # Get inspection details
            inspection_details = {}
            if conv_data["inspection_id"]:
                inspection = await db.inspections.find_one({"id": conv_data["inspection_id"]})
                if inspection:
                    inspection_details = {
                        "property_address": inspection.get("property_address"),
                        "inspection_date": inspection.get("scheduled_date"),
                        "inspection_time": inspection.get("scheduled_time"),
                        "inspector_name": inspection.get("inspector_name")
                    }
            
            conversation = ConversationSummary(
                id=conv_key,
                conversation_type=conv_data["conversation_type"],
                inspection_id=conv_data["inspection_id"],
                property_address=inspection_details.get("property_address"),
                customer_name=recipient_name,  # For customer view, show recipient name
                customer_id=current_user.id,
                customer_phone=getattr(current_user, 'phone', None),
                inspector_name=inspection_details.get("inspector_name"),
                last_message=last_msg["message_text"],
                last_message_time=last_msg["created_at"],
                unread_count=0,  # Customer sees their own messages
                expires_at=last_msg.get("expires_at"),
                inspection_date=inspection_details.get("inspection_date"),
                inspection_time=inspection_details.get("inspection_time")
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


@api_router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: UserInDB = Depends(get_current_user_from_token)
):
    """Delete a conversation and all its messages (Owner only, owner_chat type only)"""
    # Only owners can delete conversations
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owners can delete conversations")
    
    try:
        # Parse the conversation_id format: "owner_{customer_id}" or "inspector_{inspection_id}"
        if conversation_id.startswith("owner_"):
            # Extract customer_id from the conversation_id
            customer_id = conversation_id.replace("owner_", "")
            
            # Delete all messages where:
            # - sender is the customer and recipient is owner, OR
            # - sender is owner and recipient is the customer
            delete_result = await db.messages.delete_many({
                "$or": [
                    {
                        "sender_id": customer_id,
                        "recipient_role": UserRole.owner.value,
                        "inspection_id": None  # Only delete owner chats, not inspection chats
                    },
                    {
                        "sender_role": UserRole.owner.value,
                        "recipient_id": customer_id,
                        "inspection_id": None  # Only delete owner chats, not inspection chats
                    }
                ]
            })
            
            logging.info(f"Deleted {delete_result.deleted_count} messages for owner chat with customer {customer_id}")
            
            return {
                "success": True,
                "message": "Conversation deleted successfully",
                "deleted_messages": delete_result.deleted_count
            }
        else:
            # Don't allow deletion of inspector chats
            raise HTTPException(
                status_code=400, 
                detail="Can only delete owner chat conversations. Inspector chats are auto-deleted when finalized."
            )
        
    except Exception as e:
        logging.error(f"Error deleting conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")


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
        logging.info(f"Google OAuth callback received for user state: {state}")
        
        # Exchange code for tokens
        credentials = exchange_code_for_token(code)
        
        logging.info(f"Credentials received: access_token present: {bool(credentials.get('access_token'))}, refresh_token present: {bool(credentials.get('refresh_token'))}")
        
        # Store credentials in database for this user
        result = await db.users.update_one(
            {"id": state},
            {"$set": {"google_calendar_credentials": credentials}}
        )
        
        logging.info(f"Database update result: matched={result.matched_count}, modified={result.modified_count}")
        
        # Redirect to frontend
        return RedirectResponse(url="https://profile-update-10.preview.emergentagent.com/(tabs)")
    except Exception as e:
        logging.error(f"Google callback error: {e}")
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
        # Return empty events instead of error - graceful degradation
        return {"events": [], "message": "Google Calendar not connected"}
    
    try:
        # Parse dates
        start = datetime.fromisoformat(start_date.replace('Z', '')) if start_date else None
        end = datetime.fromisoformat(end_date.replace('Z', '')) if end_date else None
        
        # Fetch events (this will auto-refresh token if needed)
        result = get_calendar_events(credentials, start, end)
        
        # Update credentials in database if they were refreshed
        if result.get('credentials'):
            await db.users.update_one(
                {"id": current_user.id},
                {"$set": {"google_calendar_credentials": result['credentials']}}
            )
            logging.info(f"Updated refreshed Google Calendar credentials for user {current_user.id}")
        
        return {"events": result['events']}
    except Exception as e:
        # Log error but return empty events for graceful degradation
        logging.error(f"Error fetching calendar events: {e}")
        return {"events": [], "message": "Calendar sync temporarily unavailable"}


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
