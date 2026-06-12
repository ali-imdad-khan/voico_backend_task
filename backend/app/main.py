from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.modules.calls.router import router as calls_router
import asyncio
from app.modules.calls.tasks import expire_stale_in_progress_calls_loop

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title=settings.app_name,
    description="Backend API for the Voico Calls Dashboard",
    version="0.1.0",
)
# on startup, we will start the background task to expire stale in progress calls
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     task = asyncio.create_task(expire_stale_in_progress_calls_loop())
#     yield   
#     #when add shuts down, clean up
#     task.cancel()
@app.on_event("startup")
async def startup_event():  
    asyncio.create_task(expire_stale_in_progress_calls_loop())

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(calls_router, prefix="/api")


@app.get("/health")
async def health_check() -> dict:
    return {"status": "ok", "service": settings.app_name}
