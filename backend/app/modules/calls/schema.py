import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import Column, DateTime, Field, SQLModel

class SortingOrder(str, Enum): # Sorting order for listing calls 
    asc = "asc"
    desc = "desc"

class SortCallsBy(str, Enum): # Filtering fields for listing calls
    phone_number = "phone_number"
    caller_name = "caller_name"
    duration_seconds = "duration_seconds"
    status = "status"
    label = "label"
    started_at = "started_at"
    created_at = "created_at"
class CallStatus(str, Enum):
    in_progress = "in_progress"
    success = "success"
    failed = "failed"


class CallLabel(str, Enum):
    sales_inquiry = "Sales inquiry"
    support = "Support"
    complaint = "Complaint"
    appointment = "Appointment"
    follow_up = "Follow-up"
    other = "Other"


class Call(SQLModel, table=True):
    __tablename__ = "calls"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
    )
    phone_number: str = Field(index=True)
    caller_name: Optional[str] = Field(default=None)
    duration_seconds: Optional[int] = Field(default=None)
    status: CallStatus = Field(default=CallStatus.in_progress, index=True)
    summary: Optional[str] = Field(default=None)
    label: Optional[CallLabel] = Field(default=None)
    notes: Optional[str] = Field(default=None) # TASK 1: added the notes field for annotation of the call
    started_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
    ended_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime, nullable=True),
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
    raw_transcript: Optional[str] = Field(default=None)


# --- Request / Response schemas ---


class WebhookCallPayload(SQLModel):
    call_id: uuid.UUID
    status: CallStatus
    duration_seconds: Optional[int] = None
    raw_transcript: Optional[str] = None
    ended_at: Optional[datetime] = None


class CallResponse(SQLModel):
    id: uuid.UUID
    phone_number: str
    caller_name: Optional[str]
    duration_seconds: Optional[int]
    status: CallStatus
    summary: Optional[str]
    label: Optional[CallLabel]
    notes: Optional[str] = None #TASK 1
    started_at: datetime
    ended_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    raw_transcript: Optional[str]
    


class CallCounts(SQLModel):
    in_progress: int = 0
    success: int = 0
    failed: int = 0


class PaginatedCallsResponse(SQLModel):
    data: list[CallResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    counts: CallCounts
