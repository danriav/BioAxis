"""Liveness and readiness probes."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health", summary="Service liveness")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready", summary="Dependency readiness (extend with DB checks)")
async def ready() -> dict[str, str]:
    return {"status": "ready"}
