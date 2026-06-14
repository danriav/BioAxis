"""Pydantic contracts for authenticated nutrition API routes."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


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


class NutritionLogFoodItem(StrictSchema):
    id: str
    food_id: str | None = None
    food_name: str | None = None
    meal_slot: str
    quantity_g: float
    consumed_at: JsonDate
    kcal: float
    protein: float
    carbs: float
    fat: float


class NutritionDayTotals(StrictSchema):
    kcal: float
    protein: float
    carbs: float
    fat: float


class NutritionDayLogsResponse(StrictSchema):
    date: JsonDate
    items: list[NutritionLogFoodItem]
    totals: NutritionDayTotals
    meals: dict[str, list[NutritionLogFoodItem]]


class NutritionLogUpdateRequest(StrictSchema):
    meal_slot: Annotated[str, Field(min_length=1, max_length=32)] | None = None
    quantity_g: Annotated[float, Field(gt=0, le=10000)] | None = None
    target_date: JsonDate | None = None
    consumed_at: JsonDate | None = None

    @model_validator(mode="after")
    def validate_update_fields(self) -> "NutritionLogUpdateRequest":
        if (
            self.meal_slot is None
            and self.quantity_g is None
            and self.target_date is None
            and self.consumed_at is None
        ):
            raise ValueError("At least one editable field is required")
        if self.target_date is not None and self.consumed_at is not None:
            raise ValueError("Use either target_date or consumed_at, not both")
        return self


class NutritionLogMutationResponse(StrictSchema):
    id: str
    food_id: str | None = None
    meal_slot: str
    quantity_g: float
    consumed_at: JsonDate


class NutritionLogDeleteResponse(StrictSchema):
    status: Literal["success"]
    deleted_id: str


class NutritionTargetsResponse(StrictSchema):
    kcal: int
    protein: int
    carbs: int
    fat: int
