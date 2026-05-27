"""Pydantic contracts for authenticated nutrition API routes."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


JsonDate = Annotated[date, Field(strict=False)]


class StrictSchema(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")


class FlexibleResponse(BaseModel):
    model_config = ConfigDict(extra="allow")


class FoodSearchItem(FlexibleResponse):
    id: str | None = None
    name_es: str | None = None
    protein_per_g: float | None = None
    carbs_per_g: float | None = None
    fat_per_g: float | None = None
    fiber_per_g: float | None = None
    sugar_per_g: float | None = None
    sodium_per_mg: float | None = None
    is_premium: bool | None = None
    calories_per_g: float | None = None
    variant: str | None = None
    default_portion_grams: float | None = None
    potassium_mg_per_g: float | None = None
    vitamin_c_mg_per_g: float | None = None
    category: str | None = None


class SyncNutritionDayRequest(StrictSchema):
    source_date: JsonDate
    target_date: JsonDate


class SyncNutritionDayResponse(StrictSchema):
    status: Literal["success"]
    copied_items: int


class MealLogRequest(StrictSchema):
    food_id: str
    meal_slot: Annotated[str, Field(min_length=1, max_length=32)]
    quantity_g: Annotated[float, Field(gt=0, le=10000)]
    target_date: JsonDate


class MealLogResponse(FlexibleResponse):
    user_id: str
    food_id: str | None = None
    meal_slot: str | None = None
    quantity_g: float | None = None
    consumed_at: date | str | None = None


class NutritionTargetsResponse(StrictSchema):
    kcal: int
    protein: int
    carbs: int
    fat: int
