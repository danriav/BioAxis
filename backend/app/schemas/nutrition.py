"""Strict nutrition Pydantic schemas."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class StrictSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, strict=True, extra="forbid")


class NutritionTargetRead(StrictSchema):
    user_id: UUID
    effective_date: date
    calories_target: Annotated[int, Field(ge=900, le=7000)]
    protein_g_target: Annotated[float, Field(ge=20, le=400)]
    carbs_g_target: Annotated[float, Field(ge=0, le=900)]
    fat_g_target: Annotated[float, Field(ge=20, le=250)]


class FoodItemCreate(StrictSchema):
    user_id: UUID | None = None
    source: Literal["custom", "open_food_facts", "usda"] = "custom"
    external_id: Annotated[str, Field(max_length=120)] | None = None
    name_es: Annotated[str, Field(min_length=1, max_length=180)]
    name_en: Annotated[str, Field(max_length=180)] | None = None
    brand: Annotated[str, Field(max_length=120)] | None = None
    calories_per_100g: Annotated[float, Field(ge=0, le=1000)]
    protein_g: Annotated[float, Field(ge=0, le=100)]
    carbs_g: Annotated[float, Field(ge=0, le=100)]
    fat_g: Annotated[float, Field(ge=0, le=100)]


class BaseMealCreate(StrictSchema):
    user_id: UUID
    meal_name: Annotated[str, Field(min_length=1, max_length=120)]
    meal_slot: Literal[
        "breakfast",
        "mid_morning",
        "lunch",
        "snack",
        "dinner",
        "post_workout",
        "pre_workout",
    ] | None = None


class BaseMealItemCreate(StrictSchema):
    user_id: UUID
    base_meal_id: UUID
    food_item_id: UUID | None = None
    amount_g: Annotated[float, Field(gt=0, le=10000)]
