import math
import uuid
from typing import Optional
from datetime import datetime
from sqlmodel import update

from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.modules.calls.schema import Call, CallStatus,CallLabel, SortCallsBy, SortingOrder


class CallRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, call_id: uuid.UUID) -> Optional[Call]:
        result = await self.session.exec(select(Call).where(Call.id == call_id))
        return result.first()

    async def list_calls(
        self,
        status: Optional[CallStatus],
        caller_name: Optional[str], #TASK 2: added fields  for filtering
        phone_number: Optional[str],
        label: Optional[CallLabel],
        min_duration: Optional[int],
        max_duration: Optional[int],
        sort_by: Optional[SortCallsBy],
        sort_order: Optional[SortingOrder],
        page: int,
        page_size: int,
    ) -> tuple[list[Call], int, int, dict[str, int]]:
        query = select(Call)
        count_query = select(func.count()).select_from(Call)
        
        # filters to be used for filtering the calls based on the provided query parameters in TASK 2
        filters = []

        if status is not None: # btw shorter code can work here, like if status:
            query = query.where(Call.status == status)
            count_query = count_query.where(Call.status == status)
        
        # Filtering logic based on TASK 2
        if caller_name:
            filters.append(Call.caller_name.ilike(f"%{caller_name}%"))
        if phone_number:
            filters.append(Call.phone_number.ilike(f"%{phone_number}%"))
        if label:
            filters.append(Call.label == label)
        if min_duration:
            filters.append(Call.duration_seconds >= min_duration)
        if max_duration:
            filters.append(Call.duration_seconds <= max_duration)

        # Apply all filters to the main query
        for filter in filters:
            query = query.where(filter)
            count_query = count_query.where(filter)

        count_result = await self.session.exec(count_query)
        total = count_result.one()

        counts: dict[str, int] = {}
        for s in CallStatus:
            c = (
                await self.session.exec(
                    select(func.count()).select_from(Call).where(Call.status == s)
                )
            ).one()
            counts[s.value] = c
        
        # Sort the calls based on the provider filters in TASK 2
        sort_by = sort_by or SortCallsBy.created_at # i'll put some defautl cases here, incase no input from frontend regarding sorting
        sort_order = sort_order or SortingOrder.desc

        sort_column = getattr(Call, sort_by.value)
        # depending on the sorting order selected, sort asecnding or descending
        if sort_order == SortingOrder.desc:
            #sort descending
            sort_column = sort_column.desc()
            query = query.order_by(sort_column) 
        else:
            #sort ascending
            sort_column = sort_column.asc()
            query = query.order_by(sort_column)


        offset = (page - 1) * page_size
        # Have to remove this because this would override the sorting logic above, but i wont delete it for now, just changing it out 
        #query = query.order_by(Call.created_at.desc()).offset(offset).limit(page_size)  # type: ignore[attr-defined]
        query = query.offset(offset).limit(page_size)
        result = await self.session.exec(query)
        calls = list(result.all())

        total_pages = math.ceil(total / page_size) if total > 0 else 1
        return calls, total, total_pages, counts

    async def update(self, call: Call) -> Call:
        self.session.add(call)
        await self.session.flush()
        await self.session.refresh(call)
        return call
    
    async def check_stale_calls(self, threshold_time:datetime) -> int:
        # Mark in progress calls as failed if they are stale

        statement = (
            update(Call)
            .where(Call.status == CallStatus.in_progress)
            .where(Call.created_at < threshold_time)
            .values(status=CallStatus.failed)
        )
        result = await self.session.exec(statement)
        await self.session.flush()
        return result.rowcount or 0