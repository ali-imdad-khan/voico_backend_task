import logging
import uuid
from typing import Optional
import json
from datetime import datetime

from openai import AsyncOpenAI
from app.core.config import settings
from app.modules.calls.schema import CallLabel, WebhookCallPayload

from fastapi import HTTPException, status


from app.modules.calls.repository import CallRepository
from app.modules.calls.schema import (
    CallCounts,
    CallResponse,
    CallStatus,
    PaginatedCallsResponse,
    SortingOrder,
    SortCallsBy,
    CallLabel
    )


logger = logging.getLogger(__name__)


class CallService:
    def __init__(self, repository: CallRepository) -> None:
        self.repository = repository

    async def list_calls(
        self,
        status: Optional[CallStatus],
        page: int,
        page_size: int,
        caller_name: Optional[str],    #TASK 2: added fields  for filtering
        phone_number: Optional[str],
        label: Optional[CallLabel],
        min_duration: Optional[int],
        max_duration: Optional[int],
        sort_by: Optional[SortCallsBy],
        sort_order: Optional[SortingOrder]
    ) -> PaginatedCallsResponse:
        calls, total, total_pages, counts = await self.repository.list_calls(
            status,
            caller_name, #TASK 2: added fields  for filtering
            phone_number,
            label,
            min_duration,
            max_duration,
            sort_by,
            sort_order,
            page,
            page_size
        )
        return PaginatedCallsResponse(
            data=[CallResponse.model_validate(c, from_attributes=True) for c in calls],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            counts=CallCounts(
                in_progress=counts.get("in_progress", 0),
                success=counts.get("success", 0),
                failed=counts.get("failed", 0),
            ),
        )

    async def get_call(self, call_id: uuid.UUID) -> CallResponse:
        call = await self.repository.get_by_id(call_id)
        if call is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")
        return CallResponse.model_validate(call, from_attributes=True)
    
    async def update_call_notes(
            self,
            call_id: uuid.UUID,
            notes: str) -> CallResponse:
        # Get call using the id parameter
        call = await self.repository.get_by_id(call_id)

        # If call is not found, return not found 
        if not call:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")
        
        call.notes = notes

        # update the call with the new notes
        updated_call = await self.repository.update(call)
        response = CallResponse.model_validate(
            updated_call,
            from_attributes=True
        )
        return response
    
    #Task 4 Open AI intergration 
    async def webhook_call(self, payload: WebhookCallPayload) -> CallResponse:
       
        # get the call record to be updated
        call = await self.repository.get_by_id(payload.call_id)

        #check if call exists, if not return not found
        if not call: 
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")
        
        # update call fields from payload

        call.status = payload.status
        call.duration_seconds = payload.duration_seconds
        call.raw_transcript = payload.raw_transcript
        call.ended_at = payload.ended_at
        call.updated_at = datetime.utcnow()

        #Only enrich if call has a raw transcript

        if payload.status in [CallStatus.success, CallStatus.failed] and payload.raw_transcript:
            try:
                # enrich the call with openai
                summary, label = await self.enrich_call_with_openai(payload.raw_transcript)
                call.summary = summary
                call.label = label
            except Exception as e:
                logger.exception(f"Failed to enrich call {payload.call_id} with OpenAI: {e}")

        updated_call = await self.repository.update(call)

        return CallResponse.model_validate(updated_call, from_attributes=True)
    

    async def enrich_call_with_openai(self, raw_transcript: str) -> tuple[str, CallLabel]:
        
        #ccreate async OpenAI client
        client = AsyncOpenAI(
            api_key=settings.openai_api_key
        )

        # These are the only labels the model is allowed to return
        allowed_labels = [label.value for label in CallLabel]

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Summarize phone calls and classify them. "
                        "Return only valid JSON with keys summary and label."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Summarize this call in 2-3 sentences and classify it "
                        f"as exactly one of these labels: {allowed_labels}.\n\n"
                        f"Transcript:\n{raw_transcript}"
                    ),
                },
            ],
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content
        data = json.loads(content or "{}")

        summary = data.get("summary")
        label = data.get("label")

        if not summary or label not in allowed_labels:
            raise ValueError("OpenAI returned invalid summary or label")

        return summary, CallLabel(label)