"""Hypertrophy domain calculations kept outside FastAPI routes."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


BiologicalSex = Literal["male", "female", "other"]
MetabolicGoal = Literal["deficit", "superavit", "maintenance", "hypertrophy", "fat_loss"]


@dataclass(frozen=True, slots=True)
class UserBiometrics:
    weight_kg: float
    height_cm: float
    age_years: int
    biological_sex: BiologicalSex
    metabolic_goal: MetabolicGoal = "maintenance"
    training_days_per_week: int = 3


@dataclass(frozen=True, slots=True)
class MacroTargets:
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int


@dataclass(frozen=True, slots=True)
class TrainingSessionInput:
    muscle_group_id: int
    prescribed_sets: int
    rir_target: int


class HypertrophyEngineService:
    """Pure domain service for nutrition and training-volume calculations."""

    MAX_WEEKLY_SETS_PER_MUSCLE = 20

    def validate_biometrics(self, biometrics: UserBiometrics) -> None:
        if not 25 <= biometrics.weight_kg <= 350:
            raise ValueError("weight_kg must be between 25 and 350")
        if not 90 <= biometrics.height_cm <= 250:
            raise ValueError("height_cm must be between 90 and 250")
        if not 13 <= biometrics.age_years <= 100:
            raise ValueError("age_years must be between 13 and 100")
        if not 1 <= biometrics.training_days_per_week <= 7:
            raise ValueError("training_days_per_week must be between 1 and 7")

    def calculate_macro_targets(self, biometrics: UserBiometrics) -> MacroTargets:
        self.validate_biometrics(biometrics)

        sex_offset = 5 if biometrics.biological_sex == "male" else -161
        basal_metabolic_rate = (
            (10 * biometrics.weight_kg)
            + (6.25 * biometrics.height_cm)
            - (5 * biometrics.age_years)
            + sex_offset
        )

        activity_factor = self._activity_factor(biometrics.training_days_per_week)
        calories_target = basal_metabolic_rate * activity_factor
        goal = biometrics.metabolic_goal

        if goal in {"deficit", "fat_loss"}:
            calories_target -= 500
            protein_multiplier = 2.4
        elif goal in {"superavit", "hypertrophy"}:
            calories_target += 300
            protein_multiplier = 2.0
        else:
            protein_multiplier = 2.2

        calories_target = max(900, calories_target)
        protein_target = biometrics.weight_kg * protein_multiplier
        fat_target = max(20, biometrics.weight_kg * 1.0)
        remaining_calories = calories_target - (protein_target * 4) - (fat_target * 9)
        carb_target = max(0, remaining_calories / 4)

        return MacroTargets(
            calories=round(calories_target),
            protein_g=round(protein_target),
            carbs_g=round(carb_target),
            fat_g=round(fat_target),
        )

    def calculate_weekly_volume(
        self, sessions: list[TrainingSessionInput]
    ) -> dict[int, int]:
        weekly_sets: dict[int, int] = {}
        for session in sessions:
            self._validate_training_session(session)
            current_sets = weekly_sets.get(session.muscle_group_id, 0)
            weekly_sets[session.muscle_group_id] = current_sets + session.prescribed_sets

        overloaded = {
            muscle_group_id: total_sets
            for muscle_group_id, total_sets in weekly_sets.items()
            if total_sets > self.MAX_WEEKLY_SETS_PER_MUSCLE
        }
        if overloaded:
            raise ValueError("weekly volume exceeds 20 sets for at least one muscle group")

        return weekly_sets

    def _activity_factor(self, training_days_per_week: int) -> float:
        if training_days_per_week <= 0:
            return 1.2
        if training_days_per_week <= 3:
            return 1.375
        if training_days_per_week <= 5:
            return 1.55
        return 1.725

    def _validate_training_session(self, session: TrainingSessionInput) -> None:
        if session.muscle_group_id < 1:
            raise ValueError("muscle_group_id must be positive")
        if not 1 <= session.prescribed_sets <= 8:
            raise ValueError("prescribed_sets must be between 1 and 8")
        if not 0 <= session.rir_target <= 4:
            raise ValueError("rir_target must be between 0 and 4")
