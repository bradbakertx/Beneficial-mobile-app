from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    customer = "customer"
    agent = "agent"
    owner = "owner"
    inspector = "inspector"


class QuoteStatus(str, Enum):
    pending = "pending"
    quoted = "quoted"
    accepted = "accepted"
    rejected = "rejected"


class InspectionStatus(str, Enum):
    pending_scheduling = "pending_scheduling"
    awaiting_customer_selection = "awaiting_customer_selection"
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"
    finalized = "finalized"


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
    property_city: Optional[str] = None
    property_zip: Optional[str] = None
    property_type: str
    square_feet: Optional[int] = None
    year_built: Optional[int] = None
    foundation_type: Optional[str] = None
    num_buildings: Optional[int] = None
    num_units: Optional[int] = None
    additional_notes: Optional[str] = None
    # Keep property_size for backwards compatibility
    property_size: Optional[int] = None


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


class SchedulingRequestCreate(BaseModel):
    quote_id: str
    option_period_end_date: Optional[str] = None  # Date when option period ends
    option_period_unsure: bool = False  # Checkbox if unsure
    preferred_days_of_week: list[str] = []  # ["Mon", "Tue", "Wed", etc.]


class InspectionInDB(InspectionBase):
    id: str
    customer_id: str
    customer_email: str
    customer_name: str
    customer_phone: Optional[str] = None
    property_address: str
    square_feet: Optional[int] = None
    year_built: Optional[int] = None
    foundation_type: Optional[str] = None
    property_type: Optional[str] = None
    num_buildings: Optional[int] = None
    num_units: Optional[int] = None
    status: InspectionStatus = InspectionStatus.pending_scheduling
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    # Scheduling request fields
    option_period_end_date: Optional[str] = None
    option_period_unsure: bool = False
    preferred_days_of_week: list[str] = []
    # Owner's offered time slots
    offered_time_slots: Optional[list[dict]] = None  # [{"date": "2025-10-15", "times": ["8am", "11am"]}]
    # Inspector information
    inspector_id: Optional[str] = None
    inspector_name: Optional[str] = None
    inspector_email: Optional[str] = None
    inspector_license: Optional[str] = None
    inspector_phone: Optional[str] = None
    # Agent information (optional)
    agent_name: Optional[str] = None
    agent_email: Optional[str] = None
    agent_phone: Optional[str] = None
    # Pre-Inspection Agreement
    agreement_signed: bool = False
    agreement_signed_date: Optional[datetime] = None
    agreement_signature_data: Optional[str] = None  # Base64 signature image
    agreement_s3_key: Optional[str] = None  # S3 path to agreement PDF
    agreement_s3_url: Optional[str] = None  # S3 URL for agreement PDF
    # Inspection Report
    report_s3_key: Optional[str] = None  # DEPRECATED - use report_files
    report_s3_url: Optional[str] = None  # DEPRECATED - use report_files
    report_files: Optional[List[dict]] = None  # List of report files: [{"s3_key": "...", "s3_url": "...", "filename": "...", "uploaded_at": "..."}]
    report_uploaded_at: Optional[datetime] = None  # When report was last uploaded
    quote_id: Optional[str] = None  # Link to quote for fee amount
    fee_amount: Optional[float] = None  # Inspection fee from accepted quote
    # Finalization fields
    finalized: bool = False  # True when owner finalizes the inspection
    finalized_at: Optional[datetime] = None  # When inspection was finalized
    # Payment information
    payment_completed: bool = False  # True when payment is received
    payment_date: Optional[datetime] = None  # When payment was completed
    payment_transaction_id: Optional[str] = None  # Square transaction ID
    payment_amount: Optional[float] = None  # Amount paid
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


# Manual Inspection Entry Model
class ManualInspectionCreate(BaseModel):
    client_name: str
    client_phone: str
    client_email: EmailStr
    agent_name: Optional[str] = None
    agent_phone: Optional[str] = None
    agent_email: Optional[EmailStr] = None
    property_address: str
    property_city: str
    property_zip: str
    square_feet: Optional[int] = None
    year_built: Optional[int] = None
    foundation_type: str
    property_type: str
    num_buildings: Optional[int] = None
    num_units: Optional[int] = None
    fee_amount: float
    inspection_date: str
    inspection_time: str


class ManualInspectionInDB(ManualInspectionCreate):
    id: str
    owner_id: str
    owner_name: str
    status: str = "scheduled"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ManualInspectionResponse(ManualInspectionInDB):
    pass


# Chat/Message Models
class MessageCreate(BaseModel):
    inspection_id: Optional[str] = None  # Optional - can be general owner chat
    recipient_id: Optional[str] = None  # Who should receive the message (owner or inspector)
    message_text: str


class MessageInDB(BaseModel):
    id: str
    inspection_id: Optional[str] = None  # Optional for general owner chats
    sender_id: str
    sender_name: str
    sender_role: UserRole
    recipient_id: Optional[str] = None  # Owner or inspector user ID
    recipient_role: Optional[UserRole] = None  # owner or inspector
    message_text: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None  # 24 hours after inspection


class MessageResponse(MessageInDB):
    pass


class ConversationSummary(BaseModel):
    id: str  # conversation_id (inspection_id or customer_id for general chats)
    conversation_type: str  # "owner_chat" or "inspector_chat"
    inspection_id: Optional[str] = None
    property_address: Optional[str] = None
    customer_name: str
    customer_id: str
    customer_phone: Optional[str] = None
    agent_name: Optional[str] = None
    agent_id: Optional[str] = None
    inspector_name: Optional[str] = None
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int = 0
    expires_at: Optional[datetime] = None
    inspection_date: Optional[str] = None
    inspection_time: Optional[str] = None
