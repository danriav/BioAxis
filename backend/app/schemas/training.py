"""Strict training Pydantic schemas."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class StrictSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, strict=True, extra="forbid")


class TrainingSessionCreate(StrictSchema):
    user_id: UUID
    day_number: Annotated[int, Field(ge=1, le=7)]
    muscle_group_id: Annotated[int, Field(ge=1)]
    prescribed_sets: Annotated[int, Field(ge=1, le=8)]
    rir_target: Annotated[int, Field(ge=0, le=4)]
    session_label: Annotated[str, Field(min_length=1, max_length=80)] | None = None


class TrainingPlanCreate(StrictSchema):
    user_id: UUID
    plan_name: Annotated[str, Field(min_length=1, max_length=140)]
    frequency_days: Annotated[int, Field(ge=3, le=6)]
    duration_weeks: Annotated[int, Field(ge=4, le=24)] = 8
    sessions: list[TrainingSessionCreate]


class SessionExerciseCreate(StrictSchema):
    user_id: UUID
    session_id: UUID
    exercise_id: UUID | None = None
    variant_id: UUID | None = None
    exercise_order: Annotated[int, Field(ge=1, le=50)]
    prescribed_sets: Annotated[int, Field(ge=1, le=8)]
    rep_range_min: Annotated[int, Field(ge=1, le=100)] | None = None
    rep_range_max: Annotated[int, Field(ge=1, le=100)] | None = None
    rir_target: Annotated[int, Field(ge=0, le=4)] | None = None
    rest_seconds: Annotated[int, Field(ge=30, le=600)] = 120
    weekly_set_contribution: Annotated[int, Field(ge=0, le=8)] = 1


class WeeklyVolumeCapCreate(StrictSchema):
    user_id: UUID
    plan_id: UUID
    muscle_group_id: Annotated[int, Field(ge=1)]
    week_number: Annotated[int, Field(ge=1, le=52)]
    total_sets: Annotated[int, Field(ge=0, le=20)] = 0
    cap_sets: Annotated[int, Field(ge=1, le=20)] = 20


class WorkoutLogSetCreate(StrictSchema):
    user_id: UUID
    log_session_id: UUID
    exercise_id: UUID | None = None
    variant_id: UUID | None = None
    set_number: Annotated[int, Field(ge=1, le=20)]
    reps_performed: Annotated[int, Field(ge=1, le=100)]
    weight_kg: Annotated[float, Field(ge=0, le=700)]
    rir_actual: Annotated[int, Field(ge=0, le=10)]
    rpe_actual: Annotated[float, Field(ge=1, le=10)] | None = None
    technique_rating: Annotated[int, Field(ge=1, le=5)] | None = None
    pain_flag: bool = False
