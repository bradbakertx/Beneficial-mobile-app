from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    customer = "customer"
    agent = "agent"
    owner = "owner"


class QuoteStatus(str, Enum):
    pending = "pending"
    quoted = "quoted"
    accepted = "accepted"
    rejected = "rejected"


class InspectionStatus(str, Enum):
    pending_scheduling = "pending_scheduling"
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"


# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.customer


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserInDB(UserBase):
    id: str
    hashed_password: str
    push_token: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserResponse(UserBase):
    id: str
    created_at: datetime


class TokenResponse(BaseModel):
    session_token: str
    user: UserResponse


# Quote Models
class QuoteBase(BaseModel):
    property_address: str
    property_type: str
    property_size: Optional[int] = None
    additional_notes: Optional[str] = None


class QuoteCreate(QuoteBase):
    pass


class QuoteInDB(QuoteBase):
    id: str
    customer_id: str
    customer_email: str
    customer_name: str
    status: QuoteStatus = QuoteStatus.pending
    quote_amount: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class QuoteResponse(QuoteInDB):
    pass


# Inspection Models
class InspectionBase(BaseModel):
    quote_id: str
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None


class InspectionCreate(InspectionBase):
    pass


class InspectionInDB(InspectionBase):
    id: str
    customer_id: str
    customer_email: str
    customer_name: str
    property_address: str
    status: InspectionStatus = InspectionStatus.pending_scheduling
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class InspectionResponse(InspectionInDB):
    pass


# Admin Update Models
class QuotePriceUpdate(BaseModel):
    quote_amount: float


class InspectionDateTimeUpdate(BaseModel):
    scheduled_date: str
    scheduled_time: str


# Chat/Message Models
class MessageCreate(BaseModel):
    inspection_id: str
    message_text: str


class MessageInDB(BaseModel):
    id: str
    inspection_id: str
    sender_id: str
    sender_name: str
    sender_role: UserRole
    message_text: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MessageResponse(MessageInDB):
    pass


class ConversationSummary(BaseModel):
    inspection_id: str
    property_address: str
    customer_name: str
    customer_id: str
    agent_name: Optional[str] = None
    agent_id: Optional[str] = None
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int = 0
