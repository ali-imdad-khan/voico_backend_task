import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import async_session
from app.core.decorators import session_manager
from app.modules.calls.repository import CallRepository
from app.modules.calls.schema import (
    CallResponse,
    CallStatus,
    PaginatedCallsResponse,
    WebhookCallPayload,
    CallLabel,
    SortCallsBy,
    SortingOrder
)
from app.modules.calls.service import CallService

router = APIRouter()


async def get_session():
    async with async_session() as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_call_service(session: SessionDep) -> CallService:
    return CallService(CallRepository(session))

#TASK 2, This listing is to be updated, so users can filter the calls and sort
@router.get("/calls", response_model=PaginatedCallsResponse)
async def list_calls(
    session: SessionDep,
    service: Annotated[CallService, Depends(get_call_service)],
    status: Optional[CallStatus] = Query(default=None),
    caller_name: Optional[str] = Query(default=None), #TASK 2: added fields  for filtering
    phone_number: Optional[str] = Query(default=None),
    label: Optional[CallLabel] = Query(default=None),
    min_duration: Optional[int] = Query(default=None, ge=0),
    max_duration: Optional[int] = Query(default=None, ge=0),
    sort_by: Optional[SortCallsBy] = Query(default=None),
    sort_order: Optional[SortingOrder] = Query(default=SortingOrder.asc),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> PaginatedCallsResponse:
    return await service.list_calls(
        status=status,
        caller_name=caller_name,
        phone_number=phone_number,
        label=label,
        min_duration=min_duration,
        max_duration=max_duration,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size
    )


@router.get("/calls/{call_id}", response_model=CallResponse)
async def get_call(
    call_id: uuid.UUID,
    session: SessionDep,
    service: Annotated[CallService, Depends(get_call_service)],
) -> CallResponse:
    return await service.get_call(call_id)


@router.patch("/calls/{call_id}/notes", response_model=CallResponse)
@session_manager
async def update_call_notes(
    call_id: uuid.UUID,
    payload: dict,
    session: SessionDep ) -> CallResponse:
    
    # Get service instance to get update_call_notes
    service = CallService(CallRepository(session))

    # Fetch the call and update the notes field with notes in JSON payload
    updated_call = await service.update_call_notes(
        call_id,
          payload.get("notes"))
    
    return updated_call

@router.post("/webhook/call", response_model=CallResponse)
@session_manager
async def webhook_call(
    payload: WebhookCallPayload,
    session: SessionDep,
) -> CallResponse:
    service = CallService(CallRepository(session))
    updated_call = await service.webhook_call(payload)
    return updated_call



