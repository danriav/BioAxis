"""Strict nutrition log entry schemas."""

from __future__ import annotations

from datetime import date, time
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class StrictSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, strict=True, extra="forbid")


class NutritionLogCreate(StrictSchema):
    user_id: UUID
    log_date: date
    notes: Annotated[str, Field(max_length=500)] | None = None


class NutritionLogEntryCreate(StrictSchema):
    user_id: UUID
    log_id: UUID
    food_item_id: UUID | None = None
    base_meal_id: UUID | None = None
    meal_slot: Annotated[str, Field(min_length=1, max_length=32)]
    amount_g: Annotated[float, Field(ge=0.1, le=10000)]
    entry_time: time | None = None
    calories: Annotated[float, Field(ge=0)]
    protein_g: Annotated[float, Field(ge=0)]
    carbs_g: Annotated[float, Field(ge=0)]
    fat_g: Annotated[float, Field(ge=0)]
