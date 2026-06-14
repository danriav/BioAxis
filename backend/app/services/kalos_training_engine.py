"""Minimal deterministic Kalos training engine."""

from __future__ import annotations

import csv
import hashlib
from collections import Counter
from pathlib import Path

from app.schemas.kalos_training import (
    Equipment,
    ExerciseRole,
    FatigueCost,
    JointStress,
    KalosExercise,
    KalosExerciseCatalogItem,
    KalosExerciseSubstitutionRequest,
    KalosExerciseSubstitutionResponse,
    KalosInputSummary,
    KalosProgram,
    KalosProgression,
    KalosQualityChecks,
    KalosRange,
    KalosSession,
    KalosTrainingPlanRequest,
    KalosTrainingPlanResponse,
    MovementPattern,
)
from app.services.kalos_training_validator import FATIGUE_POINTS, KalosTrainingValidator


DEFAULT_MUSCLE_GROUP_CODE_BY_ID = {
    1: "quads",
    2: "glutes",
    3: "chest",
    4: "back",
    5: "shoulders",
    6: "biceps",
    7: "triceps",
    8: "core",
    9: "hamstrings",
    10: "calves",
    11: "adductors",
    12: "abductors",
    13: "forearms",
}

SESSION_DENSITY_RULES = (
    (45, 3, 3, 5, 10),
    (60, 4, 4, 6, 14),
    (75, 5, 5, 7, 18),
    (90, 6, 6, 8, 22),
    (120, 7, 7, 10, 24),
    (150, 7, 7, 10, 24),
)

EXPERIENCE_DENSITY_CAPS = {
    "beginner": 6,
    "intermediate": 8,
    "advanced": 10,
}

SESSION_FATIGUE_LIMITS = {
    "beginner": 8,
    "intermediate": 12,
    "advanced": 16,
}

WEEKLY_VOLUME_LIMITS = {
    "beginner": 12,
    "intermediate": 16,
    "advanced": 20,
}

WEEKLY_FREQUENCY_LIMITS = {
    "beginner": 2,
    "intermediate": 3,
    "advanced": 4,
}

RIR_ZERO_WEEKLY_LIMITS = {
    "beginner": 0.0,
    "intermediate": 0.2,
    "advanced": 0.3,
}

RIR_RULES = {
    "beginner": {
        ExerciseRole.anchor: (2, 4),
        ExerciseRole.primary_accessory: (2, 3),
        ExerciseRole.secondary_accessory: (2, 3),
        ExerciseRole.isolation: (1, 3),
        ExerciseRole.finisher: (2, 3),
        ExerciseRole.warmup: (2, 3),
        ExerciseRole.cardio: (2, 3),
    },
    "intermediate": {
        ExerciseRole.anchor: (1, 3),
        ExerciseRole.primary_accessory: (1, 2),
        ExerciseRole.secondary_accessory: (1, 2),
        ExerciseRole.isolation: (0, 2),
        ExerciseRole.finisher: (0, 2),
        ExerciseRole.warmup: (1, 2),
        ExerciseRole.cardio: (1, 2),
    },
    "advanced": {
        ExerciseRole.anchor: (1, 2),
        ExerciseRole.primary_accessory: (0, 2),
        ExerciseRole.secondary_accessory: (0, 2),
        ExerciseRole.isolation: (0, 1),
        ExerciseRole.finisher: (0, 1),
        ExerciseRole.warmup: (1, 2),
        ExerciseRole.cardio: (1, 2),
    },
}

COMPATIBLE_MUSCLES = {
    "glutes": {"glutes", "hamstrings", "abductors"},
    "hamstrings": {"hamstrings", "glutes"},
    "abductors": {"abductors", "glutes"},
    "quads": {"quads", "glutes"},
    "chest": {"chest", "shoulders", "triceps"},
    "back": {"back", "shoulders", "biceps"},
    "shoulders": {"shoulders", "chest", "back", "triceps"},
    "biceps": {"biceps", "back", "forearms"},
    "triceps": {"triceps", "chest", "shoulders"},
    "calves": {"calves"},
    "adductors": {"adductors", "glutes"},
    "core": {"core"},
}

ROLE_EQUIVALENTS = {
    ExerciseRole.anchor: {ExerciseRole.anchor, ExerciseRole.primary_accessory},
    ExerciseRole.primary_accessory: {ExerciseRole.primary_accessory, ExerciseRole.anchor, ExerciseRole.secondary_accessory},
    ExerciseRole.secondary_accessory: {ExerciseRole.secondary_accessory, ExerciseRole.primary_accessory, ExerciseRole.isolation},
    ExerciseRole.isolation: {ExerciseRole.isolation, ExerciseRole.secondary_accessory},
    ExerciseRole.finisher: {ExerciseRole.finisher, ExerciseRole.isolation},
    ExerciseRole.warmup: {ExerciseRole.warmup, ExerciseRole.isolation},
    ExerciseRole.cardio: {ExerciseRole.cardio, ExerciseRole.finisher},
}

FATIGUE_RANK = {
    FatigueCost.low: 1,
    FatigueCost.medium: 2,
    FatigueCost.high: 3,
}

SPLITS = {
    ("balanced", 1): [("Full Body", "full_body_balanced", ["quads", "chest", "back"])],
    ("balanced", 2): [
        ("Lower", "lower_balanced", ["quads", "glutes"]),
        ("Upper", "upper_balanced", ["chest", "back"]),
    ],
    ("balanced", 3): [
        ("Full Body A", "full_body_squat_push_pull", ["quads", "chest", "back"]),
        ("Full Body B", "full_body_hinge_pull_push", ["glutes", "hamstrings", "back"]),
        ("Full Body C", "full_body_single_leg_upper", ["quads", "chest", "back"]),
    ],
    ("balanced", 4): [
        ("Lower A", "lower_squat_glute", ["quads", "glutes"]),
        ("Upper A", "upper_push_pull", ["chest", "back", "triceps"]),
        ("Lower B", "lower_hinge_quad", ["hamstrings", "quads"]),
        ("Upper B", "upper_pull_push", ["back", "chest", "biceps"]),
    ],
    ("balanced", 5): [
        ("Lower A", "lower_squat_glute", ["quads", "glutes"]),
        ("Push", "upper_push", ["chest", "shoulders"]),
        ("Pull", "upper_pull", ["back", "biceps"]),
        ("Lower B", "lower_hinge_quad", ["hamstrings", "quads"]),
        ("Upper B", "upper_balanced_secondary", ["chest", "back"]),
    ],
    ("balanced", 6): [
        ("Push A", "push_heavy", ["chest", "shoulders"]),
        ("Pull A", "pull_heavy", ["back", "biceps"]),
        ("Legs A", "lower_squat", ["quads", "glutes"]),
        ("Push B", "push_volume", ["chest", "triceps"]),
        ("Pull B", "pull_volume", ["back", "biceps"]),
        ("Legs B", "lower_hinge", ["hamstrings", "quads"]),
    ],
    ("balanced", 7): [
        ("Push A", "push_heavy", ["chest", "shoulders"]),
        ("Pull A", "pull_heavy", ["back", "biceps"]),
        ("Legs A", "lower_squat", ["quads", "glutes"]),
        ("Push B", "push_volume", ["chest", "triceps"]),
        ("Pull B", "pull_volume", ["back", "biceps"]),
        ("Legs B", "lower_hinge", ["hamstrings", "quads"]),
        ("Core Recovery", "core_recovery_mobility_cardio", ["core"]),
    ],
    ("glutes", 1): [("Full Body Glute", "full_body_glute_bias", ["glutes", "quads", "chest"])],
    ("glutes", 2): [
        ("Lower Glute", "glute_dominant", ["glutes", "quads"]),
        ("Upper", "upper_balanced", ["back", "chest"]),
    ],
    ("glutes", 3): [
        ("Glutes A", "glute_dominant_heavy", ["glutes", "quads"]),
        ("Upper", "upper_balanced", ["back", "chest"]),
        ("Glutes B", "posterior_glute", ["glutes", "hamstrings"]),
    ],
    ("glutes", 4): [
        ("Lower A", "glute_dominant_heavy", ["glutes", "quads"]),
        ("Upper A", "upper_balanced", ["back", "chest"]),
        ("Lower B", "posterior_glute", ["glutes", "hamstrings"]),
        ("Upper B", "upper_balanced_secondary", ["back", "chest"]),
    ],
    ("glutes", 5): [
        ("Glutes A", "glute_dominant_heavy", ["glutes", "quads"]),
        ("Upper A", "upper_push_pull", ["chest", "back"]),
        ("Glutes B", "posterior_glute", ["glutes", "hamstrings"]),
        ("Upper B", "upper_pull_push", ["back", "chest"]),
        ("Glutes C", "glute_pump_low_fatigue", ["glutes", "abductors"]),
    ],
    ("glutes", 6): [
        ("Glutes A", "glute_dominant_heavy", ["glutes", "quads"]),
        ("Push", "upper_push", ["chest", "shoulders"]),
        ("Glutes B", "posterior_glute", ["glutes", "hamstrings"]),
        ("Pull", "upper_pull", ["back", "biceps"]),
        ("Glutes C", "glute_pump_low_fatigue", ["glutes", "abductors"]),
        ("Upper B", "upper_balanced_secondary", ["chest", "back"]),
    ],
    ("glutes", 7): [
        ("Glutes A", "glute_dominant_heavy", ["glutes", "quads"]),
        ("Push", "upper_push", ["chest", "shoulders"]),
        ("Glutes B", "posterior_glute", ["glutes", "hamstrings"]),
        ("Pull", "upper_pull", ["back", "biceps"]),
        ("Glutes C", "glute_pump_low_fatigue", ["glutes", "abductors"]),
        ("Upper B", "upper_balanced_secondary", ["chest", "back"]),
        ("Core Recovery", "core_recovery_mobility_cardio", ["core"]),
    ],
    ("legs", 1): [("Full Body Legs", "full_body_legs_bias", ["quads", "glutes", "chest"])],
    ("legs", 2): [
        ("Lower", "lower_balanced", ["quads", "glutes"]),
        ("Upper", "upper_balanced", ["chest", "back"]),
    ],
    ("legs", 3): [
        ("Legs A", "quad_glute", ["quads", "glutes"]),
        ("Upper", "upper_balanced", ["chest", "back"]),
        ("Legs B", "hinge_hamstring", ["hamstrings", "quads"]),
    ],
    ("legs", 4): [
        ("Legs A", "quad_glute", ["quads", "glutes"]),
        ("Upper A", "upper_push_pull", ["chest", "back"]),
        ("Legs B", "hinge_hamstring", ["hamstrings", "quads"]),
        ("Upper B", "upper_pull_push", ["back", "chest"]),
    ],
    ("legs", 5): [
        ("Legs A", "quad_glute", ["quads", "glutes"]),
        ("Push", "upper_push", ["chest", "shoulders"]),
        ("Legs B", "hinge_hamstring", ["hamstrings", "quads"]),
        ("Pull", "upper_pull", ["back", "biceps"]),
        ("Legs C", "glute_calves", ["glutes", "calves"]),
    ],
    ("legs", 6): [
        ("Legs A", "quad_glute", ["quads", "glutes"]),
        ("Push", "upper_push", ["chest", "shoulders"]),
        ("Legs B", "hinge_hamstring", ["hamstrings", "quads"]),
        ("Pull", "upper_pull", ["back", "biceps"]),
        ("Legs C", "glute_calves", ["glutes", "calves"]),
        ("Upper B", "upper_balanced_secondary", ["chest", "back"]),
    ],
    ("legs", 7): [
        ("Legs A", "quad_glute", ["quads", "glutes"]),
        ("Push", "upper_push", ["chest", "shoulders"]),
        ("Legs B", "hinge_hamstring", ["hamstrings", "quads"]),
        ("Pull", "upper_pull", ["back", "biceps"]),
        ("Legs C", "glute_calves", ["glutes", "calves"]),
        ("Upper B", "upper_balanced_secondary", ["chest", "back"]),
        ("Core Recovery", "core_recovery_mobility_cardio", ["core"]),
    ],
    ("torso", 1): [("Full Body Torso", "full_body_torso_bias", ["chest", "back", "quads"])],
    ("torso", 2): [
        ("Upper", "upper_torso", ["chest", "back"]),
        ("Lower", "lower_maintenance", ["quads", "glutes"]),
    ],
    ("torso", 3): [
        ("Push", "push_heavy", ["chest", "shoulders"]),
        ("Legs", "lower_maintenance", ["quads", "hamstrings"]),
        ("Pull", "pull_heavy", ["back", "biceps"]),
    ],
    ("torso", 4): [
        ("Push", "push_heavy", ["chest", "shoulders"]),
        ("Legs", "lower_maintenance", ["quads", "hamstrings"]),
        ("Pull", "pull_heavy", ["back", "biceps"]),
        ("Upper", "upper_arms", ["shoulders", "triceps"]),
    ],
    ("torso", 5): [
        ("Push A", "push_heavy", ["chest", "shoulders"]),
        ("Pull A", "pull_heavy", ["back", "biceps"]),
        ("Legs", "lower_maintenance", ["quads", "hamstrings"]),
        ("Push B", "push_volume", ["chest", "triceps"]),
        ("Pull B", "pull_volume", ["back", "biceps"]),
    ],
    ("torso", 6): [
        ("Push A", "push_heavy", ["chest", "shoulders", "triceps"]),
        ("Pull A", "pull_heavy", ["back", "biceps"]),
        ("Legs", "lower_maintenance", ["quads", "hamstrings"]),
        ("Push B", "push_volume", ["chest", "shoulders", "triceps"]),
        ("Pull B", "pull_volume", ["back", "biceps"]),
        ("Upper Arms", "upper_arms", ["shoulders", "biceps", "triceps"]),
    ],
    ("torso", 7): [
        ("Push A", "push_heavy", ["chest", "shoulders", "triceps"]),
        ("Pull A", "pull_heavy", ["back", "biceps"]),
        ("Legs", "lower_maintenance", ["quads", "hamstrings"]),
        ("Push B", "push_volume", ["chest", "shoulders", "triceps"]),
        ("Pull B", "pull_volume", ["back", "biceps"]),
        ("Upper Arms", "upper_arms", ["shoulders", "biceps", "triceps"]),
        ("Core Recovery", "core_recovery_mobility_cardio", ["core"]),
    ],
}

FALLBACK_SPLIT = [
    ("Full Body A", "full_body_squat_push_pull", ["quads", "chest", "back"]),
    ("Full Body B", "full_body_hinge_pull_push", ["glutes", "hamstrings", "back"]),
    ("Full Body C", "full_body_single_leg_upper", ["quads", "chest", "back"]),
    ("Upper", "upper_balanced", ["back", "chest"]),
    ("Lower", "lower_balanced", ["quads", "glutes"]),
    ("Core Recovery", "core_recovery", ["core"]),
    ("Mobility Cardio", "mobility_cardio", ["core"]),
]


class KalosTrainingEngineError(Exception):
    def __init__(
        self,
        *,
        code: str,
        message: str,
        validation_errors: tuple[str, ...] = (),
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.validation_errors = validation_errors


class KalosTrainingEngine:
    """Generates a minimal valid Kalos plan from curated catalog items."""

    def __init__(
        self,
        catalog: list[KalosExerciseCatalogItem],
        *,
        validator: KalosTrainingValidator | None = None,
    ) -> None:
        self.catalog = [item for item in catalog if not item.missing_fields]
        self.validator = validator or KalosTrainingValidator()

    @classmethod
    def from_csv(
        cls,
        path: Path,
        *,
        muscle_group_code_by_id: dict[int, str] | None = None,
    ) -> "KalosTrainingEngine":
        return cls(load_kalos_catalog_csv(path, muscle_group_code_by_id=muscle_group_code_by_id))

    def generate(self, request: KalosTrainingPlanRequest) -> KalosTrainingPlanResponse:
        split = self._split_for(request)
        available = set(request.available_equipment)
        used_counts: Counter[str] = Counter()
        weekly_sets: Counter[str] = Counter()
        muscle_day_counts: Counter[str] = Counter()
        previous_anchor_ids: set[str] = set()
        density_warnings: list[str] = []
        sessions: list[KalosSession] = []

        for index, (label, intent, muscles) in enumerate(split, start=1):
            exercises = self._build_session_exercises(
                request=request,
                day_number=index,
                label=label,
                intent=intent,
                target_muscles=muscles,
                available_equipment=available,
                used_counts=used_counts,
                weekly_sets=weekly_sets,
                muscle_day_counts=muscle_day_counts,
                previous_anchor_ids=previous_anchor_ids,
            )
            if self._needs_density_warning(
                request=request,
                label=label,
                intent=intent,
                exercise_count=len(exercises),
            ):
                density_warnings.append(f"session_{index}_density_below_minimum")
            previous_anchor_ids = {
                exercise.exercise_id
                for exercise in exercises
                if exercise.role == ExerciseRole.anchor
            }
            fatigue_points = sum(FATIGUE_POINTS[exercise.fatigue_cost] for exercise in exercises)
            sessions.append(
                KalosSession(
                    session_id=f"session_{index}",
                    day_number=index,
                    label=label,
                    intent=intent,
                    target_muscles=muscles,
                    estimated_minutes=min(request.time_budget_minutes, 20 + (len(exercises) * 10)),
                    fatigue_points=fatigue_points,
                    exercises=exercises,
                )
            )
            stimulated = {
                muscle
                for exercise in exercises
                for muscle, sets in exercise.weekly_set_contribution.items()
                if sets > 0
            }
            muscle_day_counts.update(stimulated)

        sessions = self._ensure_weekly_minimum_coverage(
            request=request,
            sessions=sessions,
            available_equipment=available,
            used_counts=used_counts,
        )
        sessions = self._ensure_priority_floor_coverage(
            request=request,
            sessions=sessions,
            available_equipment=available,
            used_counts=used_counts,
        )
        sessions = self._ensure_coach_floor_coverage(
            request=request,
            sessions=sessions,
            available_equipment=available,
            used_counts=used_counts,
        )
        sessions = self._apply_weekly_rir_zero_limits(request=request, sessions=sessions)
        weekly_volume_targets = self._weekly_volume_targets(sessions)
        warnings = self._expected_warnings(request) + density_warnings
        progression = self._progression_for(request)
        plan = KalosTrainingPlanResponse(
            contract_version="kalos_training_plan.v1",
            plan_id=self._plan_id(request),
            input_summary=KalosInputSummary(
                days_per_week=request.days_per_week,
                goal=request.goal,
                priority=request.priority,
                experience=request.experience,
                time_budget_minutes=request.time_budget_minutes,
                equipment_scope=request.available_equipment,
                constraints_applied=self._constraints_applied(request),
                biometric_focus=self._biometric_focus_for(request),
            ),
            program=KalosProgram(
                name=f"Kalos {request.priority.value} {request.days_per_week}d",
                duration_weeks=8,
                split=[session.label for session in sessions],
                weekly_volume_targets=weekly_volume_targets,
                progression=progression,
                sessions=sessions,
            ),
            quality_checks=KalosQualityChecks(
                status="warning" if warnings else "pass",
                warnings=warnings,
                volume_within_limits=True,
                frequency_within_limits=True,
                fatigue_within_limits=True,
                equipment_available=True,
                constraints_respected=True,
                duplicate_exercises_justified=True,
            ),
        )

        validation = self.validator.validate(request, plan)
        if not validation.passed:
            raise KalosTrainingEngineError(
                code="invalid_generated_plan",
                message="Generated Kalos plan failed deterministic validation.",
                validation_errors=tuple(error.code for error in validation.errors),
            )
        return plan

    def _ensure_coach_floor_coverage(
        self,
        *,
        request: KalosTrainingPlanRequest,
        sessions: list[KalosSession],
        available_equipment: set[Equipment],
        used_counts: Counter[str],
    ) -> list[KalosSession]:
        if self._has_pain_or_restriction(request):
            return sessions

        updated_sessions = list(sessions)
        focus = self._biometric_focus_for(request)
        base_floor = self._coach_base_floor(request.time_budget_minutes)

        if request.priority.value == "balanced":
            for muscle in ("chest", "back", "shoulders", "quads", "hamstrings", "glutes"):
                updated_sessions = self._ensure_muscle_floor(
                    request=request,
                    sessions=updated_sessions,
                    muscle=muscle,
                    floor=1,
                    available_equipment=available_equipment,
                    used_counts=used_counts,
                )

        if request.priority.value == "glutes" or focus == "glutes_legs":
            updated_sessions = self._ensure_muscle_floor(
                request=request,
                sessions=updated_sessions,
                muscle="quads",
                floor=base_floor,
                available_equipment=available_equipment,
                used_counts=used_counts,
            )

        if request.priority.value == "torso" or focus == "torso":
            updated_sessions = self._ensure_muscle_floor(
                request=request,
                sessions=updated_sessions,
                muscle="chest",
                floor=base_floor,
                available_equipment=available_equipment,
                used_counts=used_counts,
            )
            updated_sessions = self._ensure_leg_total_floor(
                request=request,
                sessions=updated_sessions,
                floor=self._coach_torso_leg_floor(request.time_budget_minutes),
                available_equipment=available_equipment,
                used_counts=used_counts,
            )

        return updated_sessions

    def _ensure_leg_total_floor(
        self,
        *,
        request: KalosTrainingPlanRequest,
        sessions: list[KalosSession],
        floor: int,
        available_equipment: set[Equipment],
        used_counts: Counter[str],
    ) -> list[KalosSession]:
        updated_sessions = list(sessions)
        leg_muscles = ("quads", "hamstrings", "glutes")
        while True:
            volume_for_muscles = sum(
                self._weekly_volume_targets(updated_sessions).get(muscle, 0)
                for muscle in leg_muscles
            )
            if volume_for_muscles >= floor:
                return updated_sessions
            volumes = self._weekly_volume_targets(updated_sessions)
            target = min(leg_muscles, key=lambda muscle: volumes.get(muscle, 0))
            before = volumes.get(target, 0)
            updated_sessions = self._ensure_muscle_floor(
                request=request,
                sessions=updated_sessions,
                muscle=target,
                floor=before + min(2, floor - volume_for_muscles),
                available_equipment=available_equipment,
                used_counts=used_counts,
            )
            if self._weekly_volume_targets(updated_sessions).get(target, 0) == before:
                return updated_sessions
        return updated_sessions

    def _ensure_muscle_floor(
        self,
        *,
        request: KalosTrainingPlanRequest,
        sessions: list[KalosSession],
        muscle: str,
        floor: int,
        available_equipment: set[Equipment],
        used_counts: Counter[str],
    ) -> list[KalosSession]:
        updated_sessions = list(sessions)
        if self._weekly_volume_targets(updated_sessions).get(muscle, 0) <= 0:
            replacement = self._choose_candidate(
                target_muscles=[muscle],
                roles=[ExerciseRole.isolation, ExerciseRole.secondary_accessory, ExerciseRole.primary_accessory],
                available_equipment=available_equipment,
                excluded_ids={exercise.exercise_id for session in updated_sessions for exercise in session.exercises},
                excluded_patterns=set(request.constraints.excluded_movement_patterns),
                restricted_joints=set(request.constraints.injuries) | set(request.constraints.pain_areas),
                used_counts=used_counts,
                max_repeats=1 if request.experience.value == "beginner" else 2,
                require_no_restricted_stress=True,
            )
            if replacement is not None:
                updated_sessions = self._replace_redundant_accessory_for_missing_muscle(
                    request=request,
                    sessions=updated_sessions,
                    replacement=replacement,
                )

        current = self._weekly_volume_targets(updated_sessions).get(muscle, 0)
        if current >= floor:
            return updated_sessions

        needed = floor - current
        next_sessions: list[KalosSession] = []
        for session in updated_sessions:
            next_exercises = []
            for exercise in session.exercises:
                if needed <= 0 or exercise.primary_muscle != muscle:
                    next_exercises.append(exercise)
                    continue
                added_sets = min(8 - exercise.sets, needed)
                if added_sets <= 0:
                    next_exercises.append(exercise)
                    continue
                next_sets = exercise.sets + added_sets
                needed -= added_sets
                next_exercises.append(
                    exercise.model_copy(
                        update={
                            "sets": next_sets,
                            "weekly_set_contribution": {muscle: next_sets},
                        }
                    )
                )
            next_sessions.append(session.model_copy(update={"exercises": next_exercises}))
        return next_sessions

    def _coach_base_floor(self, time_budget_minutes: int) -> int:
        if time_budget_minutes >= 120:
            return 6
        if time_budget_minutes >= 75:
            return 4
        return 2

    def _coach_torso_leg_floor(self, time_budget_minutes: int) -> int:
        if time_budget_minutes >= 120:
            return 12
        if time_budget_minutes >= 75:
            return 8
        return 4

    def _ensure_priority_floor_coverage(
        self,
        *,
        request: KalosTrainingPlanRequest,
        sessions: list[KalosSession],
        available_equipment: set[Equipment],
        used_counts: Counter[str],
    ) -> list[KalosSession]:
        required_muscles: list[str] = []
        if request.priority.value == "glutes" or self._biometric_focus_for(request) == "glutes_legs":
            required_muscles.append("quads")
        if request.priority.value == "torso":
            required_muscles.extend(["chest", "quads"])

        updated_sessions = list(sessions)
        for muscle in required_muscles:
            if self._weekly_volume_targets(updated_sessions).get(muscle, 0) > 0:
                continue
            replacement = self._choose_candidate(
                target_muscles=[muscle],
                roles=[ExerciseRole.isolation, ExerciseRole.secondary_accessory, ExerciseRole.primary_accessory],
                available_equipment=available_equipment,
                excluded_ids={exercise.exercise_id for session in updated_sessions for exercise in session.exercises},
                excluded_patterns=set(request.constraints.excluded_movement_patterns),
                restricted_joints=set(request.constraints.injuries) | set(request.constraints.pain_areas),
                used_counts=used_counts,
                max_repeats=1 if request.experience.value == "beginner" else 2,
                require_no_restricted_stress=True,
            )
            if replacement is None:
                continue
            updated_sessions = self._replace_redundant_accessory_for_missing_muscle(
                request=request,
                sessions=updated_sessions,
                replacement=replacement,
            )
        return updated_sessions

    def _apply_weekly_rir_zero_limits(
        self,
        *,
        request: KalosTrainingPlanRequest,
        sessions: list[KalosSession],
    ) -> list[KalosSession]:
        exercise_occurrences = [
            (session_index, exercise_index, exercise)
            for session_index, session in enumerate(sessions)
            for exercise_index, exercise in enumerate(session.exercises)
        ]
        if not exercise_occurrences:
            return sessions

        max_zero = int(len(exercise_occurrences) * RIR_ZERO_WEEKLY_LIMITS[request.experience.value])
        if request.experience.value in {"intermediate", "advanced"}:
            max_zero = max(1, max_zero)

        allowed_zero_occurrences = [
            (session_index, exercise_index)
            for session_index, exercise_index, exercise in sorted(
                exercise_occurrences,
                key=lambda occurrence: self._rir_zero_priority(occurrence[2]),
            )
            if exercise.rir_target.min == 0
            and self._can_keep_rir_zero(request=request, exercise=exercise)
        ]
        allowed_zero_occurrences = set(allowed_zero_occurrences[:max_zero])

        updated_sessions: list[KalosSession] = []
        for session_index, session in enumerate(sessions):
            updated_exercises = []
            for exercise_index, exercise in enumerate(session.exercises):
                if exercise.rir_target.min != 0 or (session_index, exercise_index) in allowed_zero_occurrences:
                    updated_exercises.append(exercise)
                    continue
                next_min = 2 if self._has_pain_or_restriction(request) else 1
                next_max = max(exercise.rir_target.max, next_min)
                updated_exercises.append(
                    exercise.model_copy(update={"rir_target": KalosRange(min=next_min, max=next_max)})
                )
            updated_sessions.append(session.model_copy(update={"exercises": updated_exercises}))
        return updated_sessions

    def _rir_zero_priority(self, exercise: KalosExercise) -> tuple[int, int, int]:
        role_priority = {
            ExerciseRole.isolation: 0,
            ExerciseRole.finisher: 1,
            ExerciseRole.secondary_accessory: 2,
            ExerciseRole.primary_accessory: 3,
        }.get(exercise.role, 9)
        return (
            role_priority,
            FATIGUE_RANK[exercise.fatigue_cost],
            exercise.order,
        )

    def _can_keep_rir_zero(self, *, request: KalosTrainingPlanRequest, exercise: KalosExercise) -> bool:
        if request.experience.value == "beginner":
            return False
        if self._has_pain_or_restriction(request):
            return False
        if request.experience.value == "intermediate":
            if exercise.role in {ExerciseRole.isolation, ExerciseRole.finisher}:
                return True
            return (
                exercise.role in {ExerciseRole.primary_accessory, ExerciseRole.secondary_accessory}
                and exercise.fatigue_cost != FatigueCost.high
                and not ({JointStress.lumbar, JointStress.shoulder, JointStress.knee} & set(exercise.joint_stress))
            )
        return exercise.role in {
            ExerciseRole.primary_accessory,
            ExerciseRole.secondary_accessory,
            ExerciseRole.isolation,
            ExerciseRole.finisher,
        }

    def _progression_for(self, request: KalosTrainingPlanRequest) -> KalosProgression:
        rir_by_experience = {
            "beginner": (3, 2),
            "intermediate": (2, 1),
            "advanced": (1, 0),
        }
        rir_start, rir_end = rir_by_experience[request.experience.value]
        return KalosProgression(
            model="double_progression",
            weeks=8,
            rir_start=rir_start,
            rir_end=rir_end,
            deload_week=5,
            load_rule="Increase load after all sets reach top reps at target RIR.",
        )

    def _biometric_focus_for(self, request: KalosTrainingPlanRequest) -> str:
        buckets = request.anthropometric_buckets
        if not buckets or buckets.ratio_gap_bucket == "unknown":
            return "unknown"
        if buckets.ratio_gap_bucket in {"low", "moderate"}:
            return "balanced"
        if request.sex_reference == "male":
            return "torso"
        if request.sex_reference == "female":
            return "glutes_legs"
        return "unknown"

    def _ensure_weekly_minimum_coverage(
        self,
        *,
        request: KalosTrainingPlanRequest,
        sessions: list[KalosSession],
        available_equipment: set[Equipment],
        used_counts: Counter[str],
    ) -> list[KalosSession]:
        if request.priority.value != "balanced" or request.days_per_week != 4 or request.time_budget_minutes < 75:
            return sessions

        required = {"biceps", "triceps", "shoulders", "chest", "back"}
        weekly_targets = self._weekly_volume_targets(sessions)
        missing = [muscle for muscle in required if weekly_targets.get(muscle, 0) <= 0]
        if not missing:
            return sessions

        updated_sessions = list(sessions)
        for muscle in missing:
            replacement = self._choose_candidate(
                target_muscles=[muscle],
                roles=[ExerciseRole.isolation, ExerciseRole.secondary_accessory, ExerciseRole.primary_accessory],
                available_equipment=available_equipment,
                excluded_ids={exercise.exercise_id for session in updated_sessions for exercise in session.exercises},
                excluded_patterns=set(request.constraints.excluded_movement_patterns),
                restricted_joints=set(request.constraints.injuries) | set(request.constraints.pain_areas),
                used_counts=used_counts,
                max_repeats=1 if request.experience.value == "beginner" else 2,
                require_no_restricted_stress=True,
            )
            if replacement is None:
                continue
            updated_sessions = self._replace_redundant_accessory_for_missing_muscle(
                request=request,
                sessions=updated_sessions,
                replacement=replacement,
            )
        return updated_sessions

    def _replace_redundant_accessory_for_missing_muscle(
        self,
        *,
        request: KalosTrainingPlanRequest,
        sessions: list[KalosSession],
        replacement: KalosExerciseCatalogItem,
    ) -> list[KalosSession]:
        muscle_counts = Counter(
            exercise.primary_muscle
            for session in sessions
            for exercise in session.exercises
        )
        preferred_indexes = sorted(
            range(len(sessions)),
            key=lambda index: (
                0 if "upper b" in sessions[index].label.lower() or "pull" in sessions[index].intent.lower() else 1,
                sessions[index].day_number,
            ),
        )
        for session_index in preferred_indexes:
            session = sessions[session_index]
            for exercise_index in range(len(session.exercises) - 1, -1, -1):
                current = session.exercises[exercise_index]
                if current.role == ExerciseRole.anchor:
                    continue
                if muscle_counts[current.primary_muscle] <= 1:
                    continue
                substitute = self._exercise_from_item(
                    replacement,
                    order=current.order,
                    request=request,
                    promote_anchor=False,
                )
                next_exercises = list(session.exercises)
                next_exercises[exercise_index] = substitute
                next_fatigue = sum(FATIGUE_POINTS[exercise.fatigue_cost] for exercise in next_exercises)
                next_sets = sum(exercise.sets for exercise in next_exercises)
                density = self._density_for(request)
                if next_fatigue > SESSION_FATIGUE_LIMITS[request.experience.value] or next_sets > density["max_sets"]:
                    continue
                sessions[session_index] = session.model_copy(
                    update={
                        "fatigue_points": next_fatigue,
                        "exercises": next_exercises,
                    }
                )
                return sessions
        return sessions

    def substitute_exercise(
        self,
        request: KalosExerciseSubstitutionRequest,
    ) -> KalosExerciseSubstitutionResponse:
        current = self._catalog_item_by_id(request.current_exercise_id)
        if current is None:
            raise KalosTrainingEngineError(
                code="catalog_exercise_not_found",
                message="Current exercise is not available in the Kalos catalog.",
            )

        current_primary = request.primary_muscle or current.primary_muscle or "unknown"
        current_pattern = request.movement_pattern or current.movement_pattern
        current_role = request.role or current.role or ExerciseRole.isolation
        current_fatigue = request.fatigue_cost or current.fatigue_cost or FatigueCost.medium
        excluded_ids = set(request.excluded_exercise_ids) | {request.current_exercise_id}
        available = set(request.available_equipment)
        compatible_muscles = self._compatible_muscles(current_primary, request.current_session.target_muscles)
        roles = ROLE_EQUIVALENTS[current_role]

        candidates = [
            item
            for item in self.catalog
            if item.exercise_id not in excluded_ids
            and item.primary_muscle in compatible_muscles
            and item.role in roles
            and set(item.equipment).issubset(available)
            and item.movement_pattern not in set(request.constraints.excluded_movement_patterns)
            and not (set(item.joint_stress) & (set(request.constraints.injuries) | set(request.constraints.pain_areas)))
        ]
        if not candidates:
            raise KalosTrainingEngineError(
                code="catalog_no_substitute",
                message="No safe substitute is available for the requested exercise.",
            )

        ranked = sorted(
            candidates,
            key=lambda item: self._substitution_score(
                item=item,
                current_primary=current_primary,
                current_pattern=current_pattern,
                current_role=current_role,
                current_fatigue=current_fatigue,
            ),
        )
        selected = ranked[0]
        warnings = self._substitution_warnings(
            selected=selected,
            current_primary=current_primary,
            current_pattern=current_pattern,
            current_role=current_role,
            current_fatigue=current_fatigue,
        )
        exercise_request = KalosTrainingPlanRequest(
            days_per_week=1,
            goal=request.current_session.goal,
            priority=request.current_session.priority,
            experience=request.current_session.experience,
            time_budget_minutes=60,
            available_equipment=request.available_equipment,
            constraints=request.constraints,
        )
        substitute = self._exercise_from_item(selected, order=1, request=exercise_request, promote_anchor=False)
        if request.sets is not None:
            substitute = substitute.model_copy(
                update={
                    "sets": request.sets,
                    "weekly_set_contribution": {substitute.primary_muscle: request.sets},
                }
            )
        return KalosExerciseSubstitutionResponse(
            current_exercise_id=request.current_exercise_id,
            substitute_exercise=substitute,
            equivalence="partial" if warnings else "exact",
            equivalence_score=max(0.0, 1.0 - (0.2 * len(warnings))),
            warnings=warnings,
        )

    def _split_for(self, request: KalosTrainingPlanRequest) -> list[tuple[str, str, list[str]]]:
        if request.priority.value == "glutes" and request.experience.value == "beginner" and request.days_per_week >= 5:
            beginner_glutes = [
                ("Glutes A", "glute_dominant_heavy", ["glutes", "quads"]),
                ("Upper A", "upper_push_pull", ["chest", "back"]),
                ("Glutes B", "posterior_glute", ["glutes", "hamstrings"]),
                ("Upper B", "upper_balanced_secondary", ["back", "chest"]),
                ("Core Recovery", "core_recovery_mobility_cardio", ["core"]),
                ("Calves Recovery", "recovery_mobility_cardio", ["calves"]),
                ("Adductors Recovery", "recovery_mobility_cardio", ["adductors"]),
            ]
            return beginner_glutes[: request.days_per_week]
        if request.priority.value == "torso" and request.experience.value == "beginner" and request.days_per_week >= 6:
            beginner_torso = [
                ("Push", "push_heavy", ["chest", "shoulders"]),
                ("Pull", "pull_heavy", ["back", "biceps"]),
                ("Legs", "lower_maintenance", ["quads", "hamstrings"]),
                ("Upper", "upper_arms", ["shoulders", "triceps"]),
                ("Core Recovery", "core_recovery_mobility_cardio", ["core"]),
                ("Calves Recovery", "recovery_mobility_cardio", ["calves"]),
                ("Adductors Recovery", "recovery_mobility_cardio", ["adductors"]),
            ]
            return beginner_torso[: request.days_per_week]
        split = SPLITS.get((request.priority.value, request.days_per_week))
        selected = split if split else FALLBACK_SPLIT[: request.days_per_week]
        return self._personalized_split(request, selected)

    def _catalog_item_by_id(self, exercise_id: str) -> KalosExerciseCatalogItem | None:
        return next((item for item in self.catalog if item.exercise_id == exercise_id), None)

    def _compatible_muscles(self, primary_muscle: str, target_muscles: list[str]) -> set[str]:
        compatible = set(COMPATIBLE_MUSCLES.get(primary_muscle, {primary_muscle}))
        compatible.add(primary_muscle)
        compatible.update(muscle for muscle in target_muscles if muscle in compatible)
        return compatible

    def _substitution_score(
        self,
        *,
        item: KalosExerciseCatalogItem,
        current_primary: str,
        current_pattern: MovementPattern | None,
        current_role: ExerciseRole,
        current_fatigue: FatigueCost,
    ) -> tuple[int, int, int, int, str]:
        fatigue_rank = FATIGUE_RANK[item.fatigue_cost or FatigueCost.medium]
        current_rank = FATIGUE_RANK[current_fatigue]
        return (
            0 if item.primary_muscle == current_primary else 1,
            0 if current_pattern and item.movement_pattern == current_pattern else 1,
            0 if item.role == current_role else 1,
            0 if fatigue_rank <= current_rank else 1,
            item.name_es,
        )

    def _substitution_warnings(
        self,
        *,
        selected: KalosExerciseCatalogItem,
        current_primary: str,
        current_pattern: MovementPattern | None,
        current_role: ExerciseRole,
        current_fatigue: FatigueCost,
    ) -> list[str]:
        warnings: list[str] = []
        if selected.primary_muscle != current_primary:
            warnings.append("partial_muscle_match")
        if current_pattern and selected.movement_pattern != current_pattern:
            warnings.append("partial_movement_pattern_match")
        if selected.role != current_role:
            warnings.append("partial_role_match")
        if FATIGUE_RANK[selected.fatigue_cost or FatigueCost.medium] > FATIGUE_RANK[current_fatigue]:
            warnings.append("higher_fatigue_substitute")
        return warnings

    def _personalized_split(
        self,
        request: KalosTrainingPlanRequest,
        split: list[tuple[str, str, list[str]]],
    ) -> list[tuple[str, str, list[str]]]:
        priority_muscles = self._anthropometric_priority_muscles(request)
        if (
            request.priority.value == "balanced"
            and request.sex_reference == "female"
            and request.days_per_week == 5
            and request.anthropometric_buckets
        ):
            if request.anthropometric_buckets.ratio_gap_bucket in {"high", "very_high"}:
                lower_b_muscles = priority_muscles or ["glutes", "abductors", "hamstrings"]
                lower_c_muscles = ["glutes", "abductors", "hamstrings"]
            else:
                lower_b_muscles = ["hamstrings", "quads", "glutes"]
                lower_c_muscles = ["quads", "glutes", "calves", "abductors"]
            return [
                ("Lower A", "lower_squat_glute", ["quads", "glutes", "hamstrings"]),
                ("Upper A", "upper_push_pull", ["chest", "back", "shoulders"]),
                ("Lower B", "lower_hinge_quad", lower_b_muscles),
                ("Upper B", "upper_pull_push", ["back", "chest", "biceps", "triceps"]),
                ("Lower C", "lower_balanced_accessory", lower_c_muscles),
            ]
        if request.priority.value != "balanced" or not priority_muscles:
            return split

        personalized: list[tuple[str, str, list[str]]] = []
        for label, intent, muscles in split:
            text = f"{label} {intent}".lower()
            next_muscles = list(muscles)
            if request.sex_reference == "male" and ("upper" in text or "push" in text or "pull" in text):
                next_muscles = list(dict.fromkeys(priority_muscles + next_muscles))
            elif request.sex_reference == "female" and ("lower" in text or "leg" in text or "glute" in text):
                next_muscles = list(dict.fromkeys(priority_muscles + next_muscles))
            personalized.append((label, intent, next_muscles))
        return personalized

    def _build_session_exercises(
        self,
        *,
        request: KalosTrainingPlanRequest,
        day_number: int,
        label: str,
        intent: str,
        target_muscles: list[str],
        available_equipment: set[Equipment],
        used_counts: Counter[str],
        weekly_sets: Counter[str],
        muscle_day_counts: Counter[str],
        previous_anchor_ids: set[str],
    ) -> list[KalosExercise]:
        exercises: list[KalosExercise] = []
        excluded_ids = set(request.constraints.excluded_exercise_ids)
        excluded_patterns = set(request.constraints.excluded_movement_patterns)
        restricted_joints = set(request.constraints.injuries) | set(request.constraints.pain_areas)

        if self._is_recovery_session(label=label, intent=intent):
            recovery_item = self._choose_candidate(
                target_muscles=target_muscles,
                roles=[
                    ExerciseRole.isolation,
                    ExerciseRole.secondary_accessory,
                    ExerciseRole.finisher,
                    ExerciseRole.cardio,
                    ExerciseRole.primary_accessory,
                    ExerciseRole.anchor,
                ],
                available_equipment=available_equipment,
                excluded_ids=excluded_ids,
                excluded_patterns=excluded_patterns,
                restricted_joints=restricted_joints,
                used_counts=used_counts,
                max_repeats=1 if request.experience.value == "beginner" else 2,
                require_no_restricted_stress=True,
            )
            if recovery_item is None:
                raise KalosTrainingEngineError(
                    code="catalog_no_safe_recovery",
                    message="No safe low-load exercise is available for the requested recovery session.",
                )
            exercises.append(self._exercise_from_item(recovery_item, order=1, request=request, promote_anchor=False))
            used_counts[recovery_item.exercise_id] += 1
            weekly_sets.update(exercises[-1].weekly_set_contribution)
            return exercises

        density = self._density_for(request)
        anchor = None
        anchor_exercise = None
        for candidate in self._candidate_options(
            target_muscles=target_muscles,
            roles=[ExerciseRole.anchor, ExerciseRole.primary_accessory],
            available_equipment=available_equipment,
            excluded_ids=excluded_ids | previous_anchor_ids,
            excluded_patterns=excluded_patterns,
            restricted_joints=restricted_joints,
            used_counts=used_counts,
            max_repeats=1 if request.experience.value == "beginner" else 2,
            require_no_restricted_stress=True,
            prefer_muscle_order=True,
        ):
            candidate_exercise = self._exercise_from_item(candidate, order=1, request=request)
            if not self._can_add_exercise(
                exercise=candidate_exercise,
                request=request,
                session_fatigue=0,
                session_sets=0,
                current_session_muscles=set(),
                max_session_sets=density["max_sets"],
                weekly_sets=weekly_sets,
                muscle_day_counts=muscle_day_counts,
            ):
                continue
            anchor = candidate
            anchor_exercise = candidate_exercise
            break
        if anchor is None and not self._has_pain_or_restriction(request):
            for candidate in self._candidate_options(
                target_muscles=target_muscles,
                roles=[ExerciseRole.secondary_accessory, ExerciseRole.isolation],
                available_equipment=available_equipment,
                excluded_ids=excluded_ids | previous_anchor_ids,
                excluded_patterns=excluded_patterns,
                restricted_joints=restricted_joints,
                used_counts=used_counts,
                max_repeats=1 if request.experience.value == "beginner" else 2,
                require_no_restricted_stress=True,
                prefer_muscle_order=True,
            ):
                candidate_exercise = self._exercise_from_item(candidate, order=1, request=request)
                if not self._can_add_exercise(
                    exercise=candidate_exercise,
                    request=request,
                    session_fatigue=0,
                    session_sets=0,
                    current_session_muscles=set(),
                    max_session_sets=density["max_sets"],
                    weekly_sets=weekly_sets,
                    muscle_day_counts=muscle_day_counts,
                ):
                    continue
                anchor = candidate
                anchor_exercise = candidate_exercise
                break
        if anchor is None or anchor_exercise is None:
            raise KalosTrainingEngineError(
                code="catalog_no_safe_anchor",
                message="No safe anchor exercise is available for the requested session.",
            )
        exercises.append(anchor_exercise)
        used_counts[anchor.exercise_id] += 1
        weekly_sets.update(exercises[-1].weekly_set_contribution)

        muscle_pool = self._density_muscle_pool(
            label=label,
            intent=intent,
            target_muscles=target_muscles,
            request=request,
        )
        priority_muscles = set(self._anthropometric_priority_muscles(request, label=label, intent=intent))
        role_sequence = self._role_sequence_for_density(density["target"])
        session_fatigue = sum(FATIGUE_POINTS[exercise.fatigue_cost] for exercise in exercises)
        session_sets = sum(exercise.sets for exercise in exercises)

        for roles in role_sequence:
            if len(exercises) >= density["target"]:
                break
            excluded_exercise_ids = excluded_ids | {exercise.exercise_id for exercise in exercises}
            current_session_muscles = {
                muscle
                for existing in exercises
                for muscle, sets in existing.weekly_set_contribution.items()
                if sets > 0
            }
            prioritized_muscles = self._prioritized_muscle_pool(
                muscle_pool=muscle_pool,
                weekly_sets=weekly_sets,
                current_session_muscles=current_session_muscles,
                priority_muscles=priority_muscles,
            )
            for candidate in self._candidate_options(
                target_muscles=prioritized_muscles,
                roles=roles,
                available_equipment=available_equipment,
                excluded_ids=excluded_exercise_ids,
                excluded_patterns=excluded_patterns,
                restricted_joints=restricted_joints,
                used_counts=used_counts,
                max_repeats=1 if request.experience.value == "beginner" else 2,
                require_no_restricted_stress=True,
            ):
                exercise = self._exercise_from_item(candidate, order=len(exercises) + 1, request=request)
                if not self._can_add_exercise(
                    exercise=exercise,
                    request=request,
                    session_fatigue=session_fatigue,
                    session_sets=session_sets,
                    current_session_muscles=current_session_muscles,
                    max_session_sets=density["max_sets"],
                    weekly_sets=weekly_sets,
                    muscle_day_counts=muscle_day_counts,
                ):
                    continue
                exercises.append(exercise)
                used_counts[candidate.exercise_id] += 1
                weekly_sets.update(exercise.weekly_set_contribution)
                session_fatigue += FATIGUE_POINTS[exercise.fatigue_cost]
                session_sets += exercise.sets
                break

        return exercises

    def _choose_candidate(
        self,
        *,
        target_muscles: list[str],
        roles: list[ExerciseRole],
        available_equipment: set[Equipment],
        excluded_ids: set[str],
        excluded_patterns: set[MovementPattern],
        restricted_joints: set[JointStress],
        used_counts: Counter[str],
        max_repeats: int,
        require_no_restricted_stress: bool,
        prefer_muscle_order: bool = False,
    ) -> KalosExerciseCatalogItem | None:
        options = self._candidate_options(
            target_muscles=target_muscles,
            roles=roles,
            available_equipment=available_equipment,
            excluded_ids=excluded_ids,
            excluded_patterns=excluded_patterns,
            restricted_joints=restricted_joints,
            used_counts=used_counts,
            max_repeats=max_repeats,
            require_no_restricted_stress=require_no_restricted_stress,
            prefer_muscle_order=prefer_muscle_order,
        )
        return next(options, None)

    def _candidate_options(
        self,
        *,
        target_muscles: list[str],
        roles: list[ExerciseRole],
        available_equipment: set[Equipment],
        excluded_ids: set[str],
        excluded_patterns: set[MovementPattern],
        restricted_joints: set[JointStress],
        used_counts: Counter[str],
        max_repeats: int,
        require_no_restricted_stress: bool,
        prefer_muscle_order: bool = False,
    ):
        outer = target_muscles if prefer_muscle_order else roles
        inner = roles if prefer_muscle_order else target_muscles
        for first in outer:
            for second in inner:
                muscle = first if prefer_muscle_order else second
                role = second if prefer_muscle_order else first
                for item in self.catalog:
                    if item.exercise_id in excluded_ids:
                        continue
                    if item.primary_muscle != muscle:
                        continue
                    if item.role != role:
                        continue
                    if item.movement_pattern in excluded_patterns:
                        continue
                    if not set(item.equipment).issubset(available_equipment):
                        continue
                    if used_counts[item.exercise_id] >= max_repeats:
                        continue
                    if require_no_restricted_stress and restricted_joints & set(item.joint_stress):
                        continue
                    yield item

    def _exercise_from_item(
        self,
        item: KalosExerciseCatalogItem,
        *,
        order: int,
        request: KalosTrainingPlanRequest,
        promote_anchor: bool = True,
    ) -> KalosExercise:
        sets = self._sets_for(item, request)
        equipment = item.equipment[0]
        role = ExerciseRole.anchor if promote_anchor and order == 1 else item.role
        rir_min, rir_max = self._rir_range_for(request=request, role=role)
        return KalosExercise(
            order=order,
            exercise_id=item.exercise_id,
            exercise_name=item.name_es,
            primary_muscle=item.primary_muscle or "unknown",
            secondary_muscles=item.secondary_muscles,
            movement_pattern=item.movement_pattern,
            role=role,
            sets=sets,
            rep_range=KalosRange(min=8, max=12),
            rir_target=KalosRange(min=rir_min, max=rir_max),
            rest_seconds=150 if item.fatigue_cost == FatigueCost.high else 90,
            fatigue_cost=item.fatigue_cost,
            equipment=equipment,
            joint_stress=item.joint_stress,
            substitution_group=item.substitution_group or f"{item.movement_pattern.value}_{item.primary_muscle}",
            weekly_set_contribution={item.primary_muscle or "unknown": sets},
            repeat_justification=None,
            coaching_note=None,
        )

    def _rir_range_for(self, *, request: KalosTrainingPlanRequest, role: ExerciseRole) -> tuple[int, int]:
        rir_min, rir_max = RIR_RULES[request.experience.value][role]
        if self._has_pain_or_restriction(request):
            rir_min = max(rir_min, 2)
            rir_max = max(rir_max, rir_min)
        return rir_min, rir_max

    def _has_pain_or_restriction(self, request: KalosTrainingPlanRequest) -> bool:
        return bool(
            request.constraints.injuries
            or request.constraints.pain_areas
            or request.constraints.excluded_exercise_ids
            or request.constraints.excluded_movement_patterns
        )

    def _sets_for(self, item: KalosExerciseCatalogItem, request: KalosTrainingPlanRequest) -> int:
        if request.days_per_week >= 5:
            return 2
        if request.experience.value == "beginner":
            return 3 if item.role == ExerciseRole.anchor else 2
        if request.experience.value == "advanced" and item.role == ExerciseRole.anchor:
            return 4
        return 3

    def _density_for(self, request: KalosTrainingPlanRequest) -> dict[str, int]:
        for max_minutes, target, minimum, maximum, max_sets in SESSION_DENSITY_RULES:
            if request.time_budget_minutes <= max_minutes:
                cap = EXPERIENCE_DENSITY_CAPS[request.experience.value]
                adjusted_target = min(target, cap, maximum)
                return {
                    "target": adjusted_target,
                    "minimum": min(minimum, adjusted_target),
                    "maximum": min(maximum, cap),
                    "max_sets": max_sets,
                }
        return {"target": 7, "minimum": 7, "maximum": 10, "max_sets": 24}

    def _role_sequence_for_density(self, target_count: int) -> list[list[ExerciseRole]]:
        sequence = [
            [ExerciseRole.primary_accessory],
            [ExerciseRole.secondary_accessory, ExerciseRole.isolation],
            [ExerciseRole.isolation, ExerciseRole.secondary_accessory],
            [ExerciseRole.isolation],
            [ExerciseRole.primary_accessory, ExerciseRole.isolation],
            [ExerciseRole.finisher, ExerciseRole.isolation],
            [ExerciseRole.secondary_accessory, ExerciseRole.isolation],
            [ExerciseRole.isolation],
            [ExerciseRole.finisher],
        ]
        return sequence[: max(0, target_count - 1)]

    def _density_muscle_pool(
        self,
        *,
        label: str,
        intent: str,
        target_muscles: list[str],
        request: KalosTrainingPlanRequest,
    ) -> list[str]:
        text = f"{label} {intent}".lower()
        pool = list(dict.fromkeys(target_muscles))
        if "arms" in text:
            pool.extend(["shoulders", "biceps", "triceps", "forearms"])
        elif "push" in text:
            pool.extend(["chest", "shoulders", "triceps"])
        elif "pull" in text:
            pool.extend(["back", "shoulders", "biceps", "forearms"])
        elif "upper" in text or "torso" in text:
            pool.extend(["chest", "back", "shoulders", "biceps", "triceps"])
        elif "glute" in text:
            pool.extend(["glutes", "quads", "hamstrings", "abductors", "adductors"])
        elif "lower" in text or "leg" in text:
            pool.extend(["quads", "glutes", "hamstrings", "calves", "abductors", "adductors"])
        elif "full_body" in text or "full body" in text:
            pool.extend(["quads", "glutes", "chest", "back", "shoulders", "biceps", "triceps", "core"])

        is_lower = "glute" in text or "lower" in text or "leg" in text or "full_body" in text or "full body" in text
        is_torso = "push" in text or "pull" in text or "upper" in text or "torso" in text or "full_body" in text or "full body" in text
        if request.priority.value == "glutes" and is_lower:
            pool.extend(["glutes", "abductors", "hamstrings"])
        elif request.priority.value == "legs" and is_lower:
            pool.extend(["quads", "hamstrings", "glutes", "calves", "adductors", "abductors"])
        pool.extend(self._anthropometric_priority_muscles(request, label=label, intent=intent))
        return list(dict.fromkeys(pool))

    def _prioritized_muscle_pool(
        self,
        *,
        muscle_pool: list[str],
        weekly_sets: Counter[str],
        current_session_muscles: set[str],
        priority_muscles: set[str],
    ) -> list[str]:
        unique_pool = list(dict.fromkeys(muscle_pool))
        return sorted(
            unique_pool,
            key=lambda muscle: (
                muscle not in priority_muscles,
                weekly_sets[muscle],
                muscle in current_session_muscles,
                unique_pool.index(muscle),
            ),
        )

    def _anthropometric_priority_muscles(
        self,
        request: KalosTrainingPlanRequest,
        *,
        label: str | None = None,
        intent: str | None = None,
    ) -> list[str]:
        buckets = request.anthropometric_buckets
        if not buckets or buckets.ratio_gap_bucket not in {"high", "very_high"}:
            return []
        text = f"{label or ''} {intent or ''}".strip().lower()
        if request.sex_reference == "male":
            if not text or "upper" in text or "push" in text or "pull" in text or "torso" in text:
                return ["shoulders", "back"]
        if request.sex_reference == "female":
            if not text or "lower" in text or "leg" in text or "glute" in text:
                return ["glutes", "abductors", "hamstrings"]
        return []

    def _can_add_exercise(
        self,
        *,
        exercise: KalosExercise,
        request: KalosTrainingPlanRequest,
        session_fatigue: int,
        session_sets: int,
        current_session_muscles: set[str],
        max_session_sets: int,
        weekly_sets: Counter[str],
        muscle_day_counts: Counter[str],
    ) -> bool:
        if session_fatigue + FATIGUE_POINTS[exercise.fatigue_cost] > SESSION_FATIGUE_LIMITS[request.experience.value]:
            return False
        if session_sets + exercise.sets > max_session_sets:
            return False
        weekly_limit = WEEKLY_VOLUME_LIMITS[request.experience.value]
        frequency_limit = WEEKLY_FREQUENCY_LIMITS[request.experience.value]
        reserve = 2 if request.days_per_week >= 5 else 0
        for muscle, sets in exercise.weekly_set_contribution.items():
            if weekly_sets[muscle] + sets > weekly_limit - reserve:
                return False
            if muscle not in current_session_muscles and muscle_day_counts[muscle] >= frequency_limit:
                return False
        return True

    def _needs_density_warning(
        self,
        *,
        request: KalosTrainingPlanRequest,
        label: str,
        intent: str,
        exercise_count: int,
    ) -> bool:
        if request.time_budget_minutes < 45 or self._is_recovery_session(label=label, intent=intent):
            return False
        return exercise_count <= 2

    def _weekly_volume_targets(self, sessions: list[KalosSession]) -> dict[str, int]:
        targets: Counter[str] = Counter()
        for session in sessions:
            for exercise in session.exercises:
                targets.update(exercise.weekly_set_contribution)
        return dict(sorted(targets.items()))

    def _expected_warnings(self, request: KalosTrainingPlanRequest) -> list[str]:
        warnings: list[str] = []
        if set(request.available_equipment) <= {Equipment.dumbbell, Equipment.bodyweight, Equipment.band}:
            warnings.append("limited_equipment_substitutions")
        if request.experience.value == "beginner" and request.days_per_week > 4:
            warnings.append("beginner_high_frequency")
        return warnings

    def _constraints_applied(self, request: KalosTrainingPlanRequest) -> list[str]:
        applied: list[str] = []
        if request.constraints.injuries:
            applied.append("injuries")
        if request.constraints.pain_areas:
            applied.append("pain_areas")
        if request.constraints.excluded_exercise_ids:
            applied.append("excluded_exercise_ids")
        if request.constraints.excluded_movement_patterns:
            applied.append("excluded_movement_patterns")
        return applied

    def _plan_id(self, request: KalosTrainingPlanRequest) -> str:
        raw = (
            f"{request.days_per_week}:{request.goal.value}:"
            f"{request.priority.value}:{request.experience.value}:"
            f"{','.join(sorted(equipment.value for equipment in request.available_equipment))}"
        )
        digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12]
        return f"plan_{digest}"

    def _is_recovery_session(self, *, label: str, intent: str) -> bool:
        text = f"{label} {intent}".lower()
        return any(marker in text for marker in ("recovery", "core", "mobility", "cardio"))


def load_kalos_catalog_csv(
    path: Path,
    *,
    muscle_group_code_by_id: dict[int, str] | None = None,
) -> list[KalosExerciseCatalogItem]:
    muscle_map = muscle_group_code_by_id or DEFAULT_MUSCLE_GROUP_CODE_BY_ID
    items: list[KalosExerciseCatalogItem] = []
    with path.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            try:
                item = KalosExerciseCatalogItem(
                    exercise_id=row["exercise_id"],
                    name_es=row["name_es"] or row["canonical_name"],
                    primary_muscle=muscle_map.get(int(row["primary_muscle_group_id"])),
                    secondary_muscles=_split_semicolon(row.get("secondary_muscles", "")),
                    movement_pattern=row.get("movement_pattern") or None,
                    role=row.get("role") or None,
                    fatigue_cost=row.get("fatigue_cost") or None,
                    equipment=[row["equipment_type"]] if row.get("equipment_type") else [],
                    joint_stress=_split_semicolon(row.get("joint_stress", "")),
                    substitution_group=row.get("substitution_group") or None,
                    missing_fields=[],
                    source_warnings=[],
                )
            except (KeyError, ValueError):
                continue
            missing = [
                field_name
                for field_name in (
                    "primary_muscle",
                    "movement_pattern",
                    "role",
                    "fatigue_cost",
                    "equipment",
                    "joint_stress",
                    "substitution_group",
                )
                if not getattr(item, field_name)
            ]
            items.append(item.model_copy(update={"missing_fields": missing}))
    return items


def _split_semicolon(value: str | None) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in value.split(";") if part.strip()]
