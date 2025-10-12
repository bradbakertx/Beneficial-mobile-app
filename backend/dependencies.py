from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import os
from models import UserInDB
from auth import decode_token, HTTPException

security = HTTPBearer()


async def get_db():
    """Get database connection"""
    from server import db
    return db


async def get_current_user_dep(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_db)
) -> UserInDB:
    """Dependency to get current user from JWT token"""
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    # Fetch user from database
    user_dict = await db.users.find_one({"id": user_id})
    if user_dict is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return UserInDB(**user_dict)
