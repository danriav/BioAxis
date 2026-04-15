"""FastAPI application entrypoint."""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan hooks (startup/shutdown)."""
    yield


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.project_name,
        lifespan=lifespan,
    )
    application.include_router(api_router, prefix=settings.api_v1_prefix)
    return application


app = create_app()
