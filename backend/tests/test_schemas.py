"""Strict Pydantic schema validation tests."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.biometric import MobileBiometricHistoryEntry, UserProfileCreate
from app.schemas.core import SyncQueueCreate
from app.schemas.nutrition import FoodItemCreate
from app.schemas.nutrition_log import NutritionLogEntryCreate
from app.schemas.training import TrainingPlanCreate, WorkoutLogSetCreate


def test_user_profile_schema_rejects_stringified_numbers() -> None:
    with pytest.raises(ValidationError):
        UserProfileCreate(
            user_id=uuid4(),
            display_name="Ada",
            biological_sex="female",
            age_years="31",
            height_cm=165.0,
            weight_kg=62.0,
            fitness_level="intermediate",
            primary_goal="hypertrophy",
        )


def test_user_profile_schema_rejects_out_of_range_height() -> None:
    with pytest.raises(ValidationError):
        UserProfileCreate(
            user_id=uuid4(),
            display_name="Ada",
            biological_sex="female",
            age_years=31,
            height_cm=300.0,
            weight_kg=62.0,
            fitness_level="intermediate",
            primary_goal="hypertrophy",
        )


def test_training_plan_schema_requires_valid_sessions() -> None:
    with pytest.raises(ValidationError):
        user_id = uuid4()
        TrainingPlanCreate(
            user_id=user_id,
            plan_name="Upper Lower",
            frequency_days=4,
            sessions=[
                {
                    "user_id": user_id,
                    "day_number": 1,
                    "muscle_group_id": 1,
                    "prescribed_sets": 10,
                    "rir_target": 2,
                }
            ],
        )


def test_food_item_schema_rejects_impossible_nutrient_density() -> None:
    with pytest.raises(ValidationError):
        FoodItemCreate(
            name_es="Aceite imposible",
            calories_per_100g=1200.0,
            protein_g=0.0,
            carbs_g=0.0,
            fat_g=100.0,
        )


def test_nutrition_log_entry_schema_requires_user_id_and_positive_amount() -> None:
    with pytest.raises(ValidationError):
        NutritionLogEntryCreate(
            log_id=uuid4(),
            meal_slot="breakfast",
            amount_g=0.0,
            calories=10.0,
            protein_g=1.0,
            carbs_g=1.0,
            fat_g=1.0,
        )


def test_workout_log_set_schema_rejects_out_of_range_load() -> None:
    with pytest.raises(ValidationError):
        WorkoutLogSetCreate(
            user_id=uuid4(),
            log_session_id=uuid4(),
            set_number=1,
            reps_performed=8,
            weight_kg=701.0,
            rir_actual=2,
        )


def test_sync_queue_schema_rejects_unknown_operation() -> None:
    with pytest.raises(ValidationError):
        SyncQueueCreate(
            user_id=uuid4(),
            client_id="client-1",
            entity_type="nutrition_log",
            entity_id=uuid4(),
            operation="merge",
            payload={},
        )


def test_biometric_history_schema_is_strict_and_forbids_internal_fields() -> None:
    with pytest.raises(ValidationError):
        MobileBiometricHistoryEntry(
            recorded_at=datetime.now(timezone.utc),
            is_current=True,
            genero="mujer",
            ratio_simetria="1.08",
        )

    with pytest.raises(ValidationError):
        MobileBiometricHistoryEntry(
            recorded_at=datetime.now(timezone.utc),
            is_current=True,
            genero="mujer",
            user_id="not-allowed",
        )
