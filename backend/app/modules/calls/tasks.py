"""Background tasks for the calls module."""


import asyncio
import logging
from datetime import datetime, timedelta

from app.core.config import settings
from app.core.db import async_session
from app.modules.calls.repository import CallRepository

logger = logging.getLogger(__name__)


async def expire_stale_in_progress_calls_loop() -> None:
    logger.info("Starting background task to expire stale in progress calls...")
    while True:
        try:
            # Gettin the threseholf for calling job to expire failed in progess calls
            threshold = timedelta(minutes=settings.stale_call_threshold_minutes)
            cutoff_time = datetime.utcnow() - threshold

            async with async_session() as session:
                repository = CallRepository(session)

                # Mark stal calls as failed
                expired_count = await repository.check_stale_calls(cutoff_time)

                await session.commit()

            # og the number of expired calls
            logger.info(f"Expired {expired_count} stale in-progress calls")

        except Exception as e:
            # if some error occurs, then log it and continue
            logger.exception(f"Failed to expire stale calls : {e}")
        
        #wait until next stale call check
        await asyncio.sleep(settings.stale_call_threshold_seconds)