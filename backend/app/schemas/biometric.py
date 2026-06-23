"""Strict biometric Pydantic schemas."""

from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


HeightCm = Annotated[float, Field(ge=90, le=250)]
WeightKg = Annotated[float, Field(ge=25, le=350)]
BodyFatPct = Annotated[float, Field(ge=3, le=70)]
JsonDate = Annotated[date, Field(strict=False)]


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


class MobileAthleteMetrics(StrictSchema):
    peso: WeightKg
    altura: HeightCm
    hombros: Annotated[float, Field(ge=45, le=220)]
    pecho: Annotated[float, Field(ge=45, le=220)]
    brazo: Annotated[float, Field(ge=15, le=80)]
    antebrazo: Annotated[float, Field(ge=10, le=70)]
    cintura: Annotated[float, Field(ge=35, le=220)]
    cadera: Annotated[float, Field(ge=45, le=220)]
    gluteo: Annotated[float, Field(ge=45, le=220)]
    pierna: Annotated[float, Field(ge=25, le=120)]
    pantorrilla: Annotated[float, Field(ge=15, le=80)]


class MobileProfileSetupRequest(MobileAthleteMetrics):
    display_name: Annotated[str, Field(min_length=1, max_length=120)]
    genero: Literal["hombre", "mujer"]
    edad: Annotated[int, Field(ge=13, le=100)] | None = None
    fecha_nacimiento: JsonDate | None = None
    objetivo_metabolico: Literal["deficit", "mantenimiento", "superavit"] = "mantenimiento"
    dias_entrenamiento_semana: Annotated[int, Field(ge=0, le=7)] = 3

    @model_validator(mode="after")
    def validate_age_source(self) -> "MobileProfileSetupRequest":
        if self.edad is None and self.fecha_nacimiento is None:
            raise ValueError("edad or fecha_nacimiento is required")
        return self


class MobileMeasurementCreateRequest(StrictSchema):
    peso: WeightKg
    hombros: Annotated[float, Field(ge=45, le=220)] | None = None
    pecho: Annotated[float, Field(ge=45, le=220)] | None = None
    brazo: Annotated[float, Field(ge=15, le=80)] | None = None
    antebrazo: Annotated[float, Field(ge=10, le=70)] | None = None
    cintura: Annotated[float, Field(ge=35, le=220)] | None = None
    cadera: Annotated[float, Field(ge=45, le=220)] | None = None
    gluteo: Annotated[float, Field(ge=45, le=220)] | None = None
    pierna: Annotated[float, Field(ge=25, le=120)] | None = None
    pantorrilla: Annotated[float, Field(ge=15, le=80)] | None = None
    objetivo_metabolico: Literal["deficit", "mantenimiento", "superavit"] | None = None
    dias_entrenamiento_semana: Annotated[int, Field(ge=0, le=7)] | None = None


class MobileAthleteProfile(StrictSchema):
    biometria_id: str | None = None
    display_name: str | None = None
    genero: Literal["hombre", "mujer"] | None = None
    edad: int | None = None
    peso: float | None = None
    altura: float | None = None
    hombros: float | None = None
    pecho: float | None = None
    brazo: float | None = None
    antebrazo: float | None = None
    cintura: float | None = None
    cadera: float | None = None
    gluteo: float | None = None
    pierna: float | None = None
    pantorrilla: float | None = None
    objetivo_metabolico: str | None = None
    dias_entrenamiento_semana: int | None = None
    is_current: bool = False


class MobileProfileMeResponse(StrictSchema):
    status: Literal["empty", "ready"]
    has_profile: bool
    profile: MobileAthleteProfile | None = None


class MobileProfileMutationResponse(StrictSchema):
    status: Literal["success"]
    profile: MobileAthleteProfile


class MobileBiometricHistoryEntry(StrictSchema):
    recorded_at: datetime
    is_current: bool
    genero: Literal["hombre", "mujer"] | None = None
    peso: float | None = None
    hombros: float | None = None
    pecho: float | None = None
    brazo: float | None = None
    antebrazo: float | None = None
    cintura: float | None = None
    cadera: float | None = None
    gluteo: float | None = None
    pierna: float | None = None
    pantorrilla: float | None = None
    ratio_simetria: float | None = None
    ratio_curvatura: float | None = None


class MobileBiometricHistoryResponse(StrictSchema):
    status: Literal["empty", "ready"]
    count: Annotated[int, Field(ge=0)]
    entries: list[MobileBiometricHistoryEntry]
