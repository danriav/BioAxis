"""Pydantic schema exports for BioAxis."""

from app.schemas.ai import AIExtractionRequest, HealthNLPExtraction
from app.schemas.biometric import AnthropometricMeasurementCreate, UserProfileCreate, UserProfileRead
from app.schemas.core import SyncQueueCreate
from app.schemas.nutrition_log import NutritionLogCreate, NutritionLogEntryCreate
from app.schemas.nutrition import BaseMealCreate, BaseMealItemCreate, FoodItemCreate, NutritionTargetRead
from app.schemas.nutrition_api import (
    FoodSearchItem,
    MealLogRequest,
    MealLogResponse,
    NutritionTargetsResponse,
    SyncNutritionDayRequest,
    SyncNutritionDayResponse,
)
from app.schemas.training import (
    SessionExerciseCreate,
    TrainingPlanCreate,
    TrainingSessionCreate,
    WeeklyVolumeCapCreate,
    WorkoutLogSetCreate,
)

__all__ = [
    "AIExtractionRequest",
    "AnthropometricMeasurementCreate",
    "BaseMealCreate",
    "BaseMealItemCreate",
    "FoodItemCreate",
    "FoodSearchItem",
    "HealthNLPExtraction",
    "MealLogRequest",
    "MealLogResponse",
    "NutritionTargetsResponse",
    "NutritionTargetRead",
    "NutritionLogCreate",
    "NutritionLogEntryCreate",
    "SessionExerciseCreate",
    "SyncQueueCreate",
    "SyncNutritionDayRequest",
    "SyncNutritionDayResponse",
    "TrainingPlanCreate",
    "TrainingSessionCreate",
    "WeeklyVolumeCapCreate",
    "WorkoutLogSetCreate",
    "UserProfileCreate",
    "UserProfileRead",
]
