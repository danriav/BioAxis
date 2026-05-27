"""Strict Pydantic contracts for AI language extraction."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, strict=True, extra="forbid")


class AIExtractionRequest(StrictSchema):
    text: Annotated[str, Field(min_length=1, max_length=8000)]
    locale: Annotated[str, Field(min_length=2, max_length=12)] = "es-MX"


class ParsedExercise(StrictSchema):
    name: Annotated[str, Field(min_length=1, max_length=120)]
    sets: Annotated[int, Field(ge=1, le=20)]
    reps: Annotated[int | None, Field(ge=1, le=100)] = None
    rir: Annotated[int | None, Field(ge=0, le=10)] = None
    load_kg: Annotated[float | None, Field(ge=0, le=500)] = None
    notes: Annotated[str | None, Field(max_length=300)] = None


class ParsedWorkout(StrictSchema):
    day_label: Annotated[str | None, Field(max_length=80)] = None
    muscle_groups: list[Annotated[str, Field(min_length=1, max_length=80)]] = []
    exercises: list[ParsedExercise] = []


class ParsedMealItem(StrictSchema):
    name: Annotated[str, Field(min_length=1, max_length=120)]
    quantity_g: Annotated[float | None, Field(ge=0, le=5000)] = None
    calories: Annotated[int | None, Field(ge=0, le=5000)] = None
    protein_g: Annotated[float | None, Field(ge=0, le=400)] = None
    carbs_g: Annotated[float | None, Field(ge=0, le=900)] = None
    fat_g: Annotated[float | None, Field(ge=0, le=250)] = None
    confidence: Annotated[float, Field(ge=0, le=1)] = 0.5

    @model_validator(mode="after")
    def require_macro_evidence(self) -> "ParsedMealItem":
        macros = (self.calories, self.protein_g, self.carbs_g, self.fat_g)
        if any(value is not None for value in macros) and self.quantity_g is None:
            raise ValueError("quantity_g is required when macro estimates are provided")
        return self


class ParsedMeal(StrictSchema):
    meal_slot: Literal["breakfast", "lunch", "dinner", "snack", "unknown"] = "unknown"
    items: list[ParsedMealItem] = []


class HealthNLPExtraction(StrictSchema):
    workouts: list[ParsedWorkout] = []
    meals: list[ParsedMeal] = []
    warnings: list[Annotated[str, Field(min_length=1, max_length=300)]] = []
