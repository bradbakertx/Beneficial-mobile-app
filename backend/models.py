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
    agent_review = "agent_review"  # New status: waiting for agent approval/decline
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
    phone: Optional[str] = None
    profile_picture: Optional[str] = None
    license_number: Optional[str] = None  # For inspectors


class UserCreate(UserBase):
    password: str
    # Privacy & Compliance consents (required for registration)
    terms_accepted: bool = False
    privacy_policy_accepted: bool = False
    marketing_consent: bool = False  # Optional


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class UserInDB(UserBase):
    id: str
    hashed_password: str
    push_token: Optional[str] = None
    google_calendar_credentials: Optional[dict] = None
    notification_preferences: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Privacy & Compliance fields
    terms_accepted: bool = False
    terms_accepted_at: Optional[datetime] = None
    privacy_policy_accepted: bool = False
    privacy_policy_accepted_at: Optional[datetime] = None
    marketing_consent: bool = False
    data_processing_consent: bool = False  # GDPR compliance
    ip_address_at_registration: Optional[str] = None  # For audit trail
    # Password Reset OTP fields
    otp_code: Optional[str] = None  # Hashed OTP code
    otp_expires_at: Optional[datetime] = None  # OTP expiration time (15 minutes)
    otp_created_at: Optional[datetime] = None  # When OTP was created
    otp_attempts: int = 0  # Rate limiting: track attempts
    otp_last_attempt_at: Optional[datetime] = None  # Track last attempt for rate limiting


class UserResponse(UserBase):
    id: str
    created_at: datetime
    # Privacy & Compliance status (for frontend to check)
    terms_accepted: bool = False
    privacy_policy_accepted: bool = False
    needs_consent: bool = False  # Helper field to indicate if user needs to accept terms


class TokenResponse(BaseModel):
    session_token: str
    user: UserResponse


class NotificationPreferences(BaseModel):
    new_quotes: bool = True
    scheduling_updates: bool = True
    chat_messages: bool = True
    report_uploads: bool = True


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
    # Additional fields
    wdi_report: Optional[bool] = None
    sprinkler_system: Optional[bool] = None
    detached_building: Optional[bool] = None
    detached_building_type: Optional[str] = None
    detached_building_sqft: Optional[str] = None


class QuoteCreate(QuoteBase):
    pass


class QuoteInDB(QuoteBase):
    id: str
    customer_id: str
    customer_email: str
    customer_name: str
    customer_phone: Optional[str] = None
    status: QuoteStatus = QuoteStatus.pending
    quote_amount: Optional[float] = None
    # Agent indicator - True if quote was created by an agent
    is_agent_quote: bool = False
    agent_name: Optional[str] = None
    agent_email: Optional[str] = None
    agent_phone: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class QuoteResponse(QuoteInDB):
    pass


# Inspection Models
class InspectionBase(BaseModel):
    quote_id: str
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None


class DirectScheduleRequest(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: str
    property_address: str
    property_city: str
    property_zip: str
    square_feet: Optional[int] = None
    year_built: Optional[int] = None
    foundation_type: Optional[str] = None
    property_type: str
    option_period_end: str
    preferred_days: str


class InspectionCreate(InspectionBase):
    pass


class SchedulingRequestCreate(BaseModel):
    quote_id: str
    option_period_end_date: Optional[str] = None  # Date when option period ends
    option_period_unsure: bool = False  # Checkbox if unsure
    preferred_days_of_week: list[str] = []  # ["Mon", "Tue", "Wed", etc.]


class InspectionInDB(InspectionBase):
    id: str
    customer_id: Optional[str] = None  # Optional for direct schedule before customer account exists
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
    payment_method: Optional[str] = None  # Payment method: Cash, Check, Card/Mobile Tap, Square
    # Additional information fields
    wdi_report: Optional[bool] = None
    sprinkler_system: Optional[bool] = None
    detached_building: Optional[bool] = None
    detached_building_type: Optional[str] = None
    detached_building_sqft: Optional[str] = None
    # Additional email recipients for report delivery
    additional_report_emails: Optional[str] = None  # Comma-separated email addresses
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
    customer_phone: str
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
