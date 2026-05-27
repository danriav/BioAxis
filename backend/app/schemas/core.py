"""Strict core persistence schemas."""

from __future__ import annotations

from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class StrictSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, strict=True, extra="forbid")


class SyncQueueCreate(StrictSchema):
    user_id: UUID
    client_id: Annotated[str, Field(min_length=1, max_length=120)]
    entity_type: Annotated[str, Field(min_length=1, max_length=80)]
    entity_id: UUID
    operation: Literal["create", "update", "delete"]
    payload: dict[str, Any]
