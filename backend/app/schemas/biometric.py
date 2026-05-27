"""Strict biometric Pydantic schemas."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


HeightCm = Annotated[float, Field(ge=90, le=250)]
WeightKg = Annotated[float, Field(ge=25, le=350)]
BodyFatPct = Annotated[float, Field(ge=3, le=70)]


class StrictSchema(BaseModel):
    """Base schema with strict type validation and ORM reads enabled."""

    model_config = ConfigDict(from_attributes=True, strict=True, extra="forbid")


class UserProfileCreate(StrictSchema):
    user_id: UUID
    display_name: Annotated[str, Field(min_length=1, max_length=120)]
    biological_sex: Literal["male", "female", "other"]
    age_years: Annotated[int, Field(ge=13, le=100)]
    height_cm: HeightCm
    weight_kg: WeightKg
    body_fat_pct: BodyFatPct | None = None
    fitness_level: Literal["beginner", "intermediate", "advanced", "elite"]
    primary_goal: Literal["hypertrophy", "strength", "fat_loss", "maintenance"]
    training_days_per_week: Annotated[int, Field(ge=1, le=7)] = 3


class UserProfileRead(UserProfileCreate):
    id: UUID


class AnthropometricMeasurementCreate(StrictSchema):
    user_id: UUID
    measured_on: date
    weight_kg: WeightKg
    body_fat_pct: BodyFatPct | None = None
    waist_cm: Annotated[float, Field(ge=35, le=220)] | None = None
    hip_cm: Annotated[float, Field(ge=45, le=220)] | None = None
    chest_cm: Annotated[float, Field(ge=45, le=220)] | None = None
    arm_cm: Annotated[float, Field(ge=15, le=80)] | None = None
    thigh_cm: Annotated[float, Field(ge=25, le=120)] | None = None
