"""Strict Pydantic contracts for Kalos training plans."""

from __future__ import annotations

from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictSchema(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")


class KalosGoal(StrEnum):
    hypertrophy = "hypertrophy"
    recomposition = "recomposition"
    fat_loss = "fat_loss"
    strength_hypertrophy = "strength_hypertrophy"
    general_fitness = "general_fitness"


class KalosPriority(StrEnum):
    torso = "torso"
    legs = "legs"
    glutes = "glutes"
    balanced = "balanced"


class KalosExperience(StrEnum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class MovementPattern(StrEnum):
    squat = "squat"
    hinge = "hinge"
    hip_thrust = "hip_thrust"
    horizontal_push = "horizontal_push"
    vertical_push = "vertical_push"
    horizontal_pull = "horizontal_pull"
    vertical_pull = "vertical_pull"
    knee_extension = "knee_extension"
    knee_flexion = "knee_flexion"
    hip_abduction = "hip_abduction"
    hip_adduction = "hip_adduction"
    calf_raise = "calf_raise"
    elbow_flexion = "elbow_flexion"
    elbow_extension = "elbow_extension"
    shoulder_abduction = "shoulder_abduction"
    rear_delt = "rear_delt"
    core_flexion = "core_flexion"
    core_stability = "core_stability"
    cardio_liss = "cardio_liss"
    cardio_hiit = "cardio_hiit"


class ExerciseRole(StrEnum):
    anchor = "anchor"
    primary_accessory = "primary_accessory"
    secondary_accessory = "secondary_accessory"
    isolation = "isolation"
    finisher = "finisher"
    warmup = "warmup"
    cardio = "cardio"


class FatigueCost(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"


class Equipment(StrEnum):
    barbell = "barbell"
    dumbbell = "dumbbell"
    machine = "machine"
    cable = "cable"
    bodyweight = "bodyweight"
    band = "band"
    smith = "smith"
    bench = "bench"
    cardio_machine = "cardio_machine"


class JointStress(StrEnum):
    knee = "knee"
    hip = "hip"
    lumbar = "lumbar"
    shoulder = "shoulder"
    elbow = "elbow"
    wrist = "wrist"
    ankle = "ankle"
    neck = "neck"


JsonGoal = Annotated[KalosGoal, Field(strict=False)]
JsonPriority = Annotated[KalosPriority, Field(strict=False)]
JsonExperience = Annotated[KalosExperience, Field(strict=False)]
JsonMovementPattern = Annotated[MovementPattern, Field(strict=False)]
JsonExerciseRole = Annotated[ExerciseRole, Field(strict=False)]
JsonFatigueCost = Annotated[FatigueCost, Field(strict=False)]
JsonEquipment = Annotated[Equipment, Field(strict=False)]
JsonJointStress = Annotated[JointStress, Field(strict=False)]


class KalosConstraints(StrictSchema):
    injuries: list[JsonJointStress] = Field(default_factory=list)
    pain_areas: list[JsonJointStress] = Field(default_factory=list)
    excluded_exercise_ids: list[str] = Field(default_factory=list)
    excluded_movement_patterns: list[JsonMovementPattern] = Field(default_factory=list)
    notes: Annotated[str | None, Field(max_length=1000)] = None


class KalosAnthropometricBuckets(StrictSchema):
    height_bucket_cm: str | None = None
    weight_bucket_kg: str | None = None
    bmi_bucket: str | None = None
    ratio_type: Literal["golden_ratio", "hourglass_ratio", "none"] | None = None
    ratio_gap_bucket: Literal["low", "moderate", "high", "very_high", "unknown"] | None = None


class KalosTrainingPlanRequest(StrictSchema):
    days_per_week: Annotated[int, Field(ge=1, le=7)]
    goal: JsonGoal
    priority: JsonPriority
    experience: JsonExperience
    time_budget_minutes: Annotated[int, Field(ge=30, le=150)]
    available_equipment: Annotated[list[JsonEquipment], Field(min_length=1)]
    constraints: KalosConstraints = Field(default_factory=KalosConstraints)
    sex_reference: Literal["male", "female", "neutral"] = "neutral"
    anthropometric_buckets: KalosAnthropometricBuckets | None = None
    preferred_exercise_ids: list[str] = Field(default_factory=list)
    recent_exercise_ids: list[str] = Field(default_factory=list)
    session_days: Annotated[list[Annotated[int, Field(ge=1, le=7)]] | None, Field(max_length=7)] = None
    cardio_preference: Literal["none", "low", "moderate"] | None = None


class KalosRange(StrictSchema):
    min: Annotated[int, Field(ge=0, le=300)]
    max: Annotated[int, Field(ge=0, le=300)]

    @model_validator(mode="after")
    def validate_order(self) -> "KalosRange":
        if self.min > self.max:
            raise ValueError("min cannot be greater than max")
        return self


class KalosExercise(StrictSchema):
    order: Annotated[int, Field(ge=1, le=50)]
    exercise_id: Annotated[str, Field(min_length=1, max_length=120)]
    exercise_name: Annotated[str, Field(min_length=1, max_length=160)]
    primary_muscle: Annotated[str, Field(min_length=1, max_length=80)]
    secondary_muscles: list[str] = Field(default_factory=list)
    movement_pattern: JsonMovementPattern
    role: JsonExerciseRole
    sets: Annotated[int, Field(ge=1, le=8)]
    rep_range: KalosRange
    rir_target: KalosRange
    rest_seconds: Annotated[int, Field(ge=30, le=300)]
    fatigue_cost: JsonFatigueCost
    equipment: JsonEquipment
    joint_stress: list[JsonJointStress] = Field(default_factory=list)
    substitution_group: Annotated[str, Field(min_length=1, max_length=120)]
    weekly_set_contribution: dict[str, Annotated[int, Field(ge=0, le=8)]]
    repeat_justification: (
        Literal["specialization", "limited_equipment", "technical_practice", "user_preference"] | None
    ) = None
    coaching_note: Annotated[str | None, Field(max_length=500)] = None


class KalosSession(StrictSchema):
    session_id: Annotated[str, Field(min_length=1, max_length=120)]
    day_number: Annotated[int, Field(ge=1, le=7)]
    label: Annotated[str, Field(min_length=1, max_length=80)]
    intent: Annotated[str, Field(min_length=1, max_length=120)]
    target_muscles: Annotated[list[str], Field(min_length=1)]
    estimated_minutes: Annotated[int, Field(ge=20, le=180)]
    fatigue_points: Annotated[int, Field(ge=0, le=30)]
    exercises: Annotated[list[KalosExercise], Field(min_length=1, max_length=12)]


class KalosProgression(StrictSchema):
    model: Literal["double_progression", "load_progression", "set_progression", "volume_wave"]
    weeks: Annotated[int, Field(ge=4, le=24)]
    rir_start: Annotated[int, Field(ge=0, le=4)]
    rir_end: Annotated[int, Field(ge=0, le=4)]
    deload_week: Annotated[int | None, Field(ge=1, le=24)] = None
    load_rule: Annotated[str, Field(min_length=1, max_length=500)]


class KalosProgram(StrictSchema):
    name: Annotated[str, Field(min_length=1, max_length=140)]
    duration_weeks: Annotated[int, Field(ge=4, le=24)]
    split: Annotated[list[str], Field(min_length=1, max_length=7)]
    weekly_volume_targets: dict[str, Annotated[int, Field(ge=0, le=22)]]
    progression: KalosProgression
    sessions: Annotated[list[KalosSession], Field(min_length=1, max_length=7)]


class KalosQualityChecks(StrictSchema):
    status: Literal["pass", "warning", "fail"]
    warnings: list[str] = Field(default_factory=list)
    volume_within_limits: bool
    frequency_within_limits: bool
    fatigue_within_limits: bool
    equipment_available: bool
    constraints_respected: bool
    duplicate_exercises_justified: bool


class KalosInputSummary(StrictSchema):
    days_per_week: Annotated[int, Field(ge=1, le=7)]
    goal: JsonGoal
    priority: JsonPriority
    experience: JsonExperience
    time_budget_minutes: Annotated[int, Field(ge=30, le=150)]
    equipment_scope: Annotated[list[JsonEquipment], Field(min_length=1)]
    constraints_applied: list[str] = Field(default_factory=list)
    biometric_focus: Literal["balanced", "torso", "glutes_legs", "unknown"] = "unknown"


class KalosTrainingPlanResponse(StrictSchema):
    contract_version: Literal["kalos_training_plan.v1"]
    plan_id: Annotated[str, Field(min_length=1, max_length=120)]
    input_summary: KalosInputSummary
    program: KalosProgram
    quality_checks: KalosQualityChecks


class KalosExerciseSubstitutionSessionContext(StrictSchema):
    goal: JsonGoal
    experience: JsonExperience
    priority: JsonPriority
    label: Annotated[str, Field(min_length=1, max_length=80)]
    intent: Annotated[str, Field(min_length=1, max_length=120)]
    target_muscles: Annotated[list[Annotated[str, Field(min_length=1, max_length=80)]], Field(min_length=1)]


class KalosExerciseSubstitutionRequest(StrictSchema):
    current_exercise_id: Annotated[str, Field(min_length=1, max_length=120)]
    current_session: KalosExerciseSubstitutionSessionContext
    available_equipment: Annotated[list[JsonEquipment], Field(min_length=1)] = Field(
        default_factory=lambda: list(Equipment)
    )
    excluded_exercise_ids: list[Annotated[str, Field(min_length=1, max_length=120)]] = Field(default_factory=list)
    constraints: KalosConstraints = Field(default_factory=KalosConstraints)
    movement_pattern: JsonMovementPattern | None = None
    role: JsonExerciseRole | None = None
    primary_muscle: Annotated[str | None, Field(max_length=80)] = None
    fatigue_cost: JsonFatigueCost | None = None
    sets: Annotated[int | None, Field(ge=1, le=8)] = None


class KalosExerciseSubstitutionResponse(StrictSchema):
    current_exercise_id: Annotated[str, Field(min_length=1, max_length=120)]
    substitute_exercise: KalosExercise
    equivalence: Literal["exact", "partial"]
    equivalence_score: Annotated[float, Field(ge=0, le=1)]
    warnings: list[str] = Field(default_factory=list)


class KalosExerciseCatalogItem(StrictSchema):
    exercise_id: Annotated[str, Field(min_length=1, max_length=120)]
    name_es: Annotated[str, Field(min_length=1, max_length=160)]
    primary_muscle: Annotated[str | None, Field(max_length=80)] = None
    secondary_muscles: list[str] = Field(default_factory=list)
    movement_pattern: JsonMovementPattern | None = None
    role: JsonExerciseRole | None = None
    fatigue_cost: JsonFatigueCost | None = None
    equipment: list[JsonEquipment] = Field(default_factory=list)
    joint_stress: list[JsonJointStress] = Field(default_factory=list)
    substitution_group: Annotated[str | None, Field(max_length=120)] = None
    missing_fields: list[str] = Field(default_factory=list)
    source_warnings: list[str] = Field(default_factory=list)


class KalosCatalogCoverageReport(StrictSchema):
    total_items: Annotated[int, Field(ge=0)]
    complete_items: Annotated[int, Field(ge=0)]
    coverage_ratio: Annotated[float, Field(ge=0, le=1)]
    missing_by_field: dict[str, Annotated[int, Field(ge=0)]]
    unsupported_values: dict[str, list[str]]
