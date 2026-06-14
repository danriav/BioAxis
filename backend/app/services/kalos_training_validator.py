"""Pure deterministic validators for Kalos training plans."""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass, field

from app.schemas.kalos_training import (
    Equipment,
    ExerciseRole,
    FatigueCost,
    JointStress,
    KalosExperience,
    KalosSession,
    KalosTrainingPlanRequest,
    KalosTrainingPlanResponse,
)


FATIGUE_POINTS = {
    FatigueCost.low: 1,
    FatigueCost.medium: 2,
    FatigueCost.high: 3,
}

FATIGUE_LIMITS = {
    KalosExperience.beginner: 8,
    KalosExperience.intermediate: 12,
    KalosExperience.advanced: 16,
}

HIGH_FATIGUE_EXERCISE_LIMITS = {
    KalosExperience.beginner: 2,
    KalosExperience.intermediate: 3,
    KalosExperience.advanced: 4,
}

ABSOLUTE_VOLUME_LIMITS = {
    KalosExperience.beginner: 12,
    KalosExperience.intermediate: 16,
    KalosExperience.advanced: 20,
}

FREQUENCY_LIMITS = {
    KalosExperience.beginner: 2,
    KalosExperience.intermediate: 3,
    KalosExperience.advanced: 4,
}

TIME_SERIES_LIMITS = (
    (45, 10),
    (60, 14),
    (75, 18),
    (90, 22),
    (150, 24),
)

RECOVERY_MARKERS = {"recovery", "core", "mobility", "cardio"}

PRIORITY_VOLUME_EXCEPTION_MUSCLES = {
    "glutes": {"glutes"},
    "legs": {"quads", "hamstrings", "glutes", "calves"},
    "torso": {"chest", "back", "shoulders", "biceps", "triceps"},
    "balanced": set(),
}

CONSTRAINT_ERROR_CODES = {
    "excluded_exercise_used",
    "excluded_pattern_used",
    "injury_constraint_violated",
    "pain_constraint_violated",
    "pain_rir_too_low",
}


@dataclass(frozen=True, slots=True)
class KalosValidationIssue:
    code: str
    message: str


@dataclass(slots=True)
class KalosValidationResult:
    errors: list[KalosValidationIssue] = field(default_factory=list)
    warnings: list[KalosValidationIssue] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return not self.errors

    @property
    def status(self) -> str:
        if self.errors:
            return "fail"
        if self.warnings:
            return "warning"
        return "pass"


class KalosTrainingValidator:
    """Validates a Kalos plan without FastAPI, DB, persistence, or AI calls."""

    def validate(
        self,
        request: KalosTrainingPlanRequest,
        plan: KalosTrainingPlanResponse,
    ) -> KalosValidationResult:
        result = KalosValidationResult()
        self._validate_structure(request, plan, result)
        self._validate_volume(request, plan, result)
        self._validate_frequency(request, plan, result)
        self._validate_fatigue(request, plan, result)
        self._validate_duplicates(request, plan, result)
        self._validate_equipment(request, plan, result)
        self._validate_constraints(request, plan, result)
        self._validate_time(request, plan, result)
        self._validate_rir_and_rest(request, plan, result)
        self._validate_quality_checks(plan, result)
        return result

    def _validate_structure(
        self,
        request: KalosTrainingPlanRequest,
        plan: KalosTrainingPlanResponse,
        result: KalosValidationResult,
    ) -> None:
        sessions = plan.program.sessions
        if plan.contract_version != "kalos_training_plan.v1":
            self._error(result, "invalid_contract_version", "Plan contract version is not kalos_training_plan.v1.")
        if len(sessions) != request.days_per_week:
            self._error(result, "days_session_mismatch", "days_per_week must match the number of sessions.")
        if len(plan.program.split) != len(sessions):
            self._error(result, "split_session_mismatch", "Program split must match the number of sessions.")

        day_numbers = [session.day_number for session in sessions]
        if len(day_numbers) != len(set(day_numbers)):
            self._error(result, "duplicate_day_number", "Each session must have a unique day_number.")
        if request.session_days and sorted(request.session_days) != sorted(day_numbers):
            self._error(result, "session_days_mismatch", "Requested session_days do not match plan day_numbers.")

        for session in sessions:
            if not self._is_recovery_session(session):
                anchor_count = sum(1 for exercise in session.exercises if exercise.role == ExerciseRole.anchor)
                if anchor_count < 1:
                    self._error(result, "missing_anchor", f"Session {session.session_id} must include an anchor.")
                if anchor_count > 2:
                    self._error(result, "too_many_anchors", f"Session {session.session_id} has too many anchors.")

    def _validate_volume(
        self,
        request: KalosTrainingPlanRequest,
        plan: KalosTrainingPlanResponse,
        result: KalosValidationResult,
    ) -> None:
        weekly_sets = self._weekly_sets(plan)
        muscle_frequency = self._muscle_frequency(plan)
        limit = ABSOLUTE_VOLUME_LIMITS[request.experience]
        for muscle, sets in weekly_sets.items():
            if sets > limit:
                priority_exception_muscles = PRIORITY_VOLUME_EXCEPTION_MUSCLES[request.priority.value]
                advanced_exception = (
                    request.experience == KalosExperience.advanced
                    and sets <= 22
                    and not request.constraints.injuries
                    and not request.constraints.pain_areas
                    and muscle in priority_exception_muscles
                    and muscle_frequency.get(muscle, 0) == 3
                )
                if advanced_exception:
                    self._warning(result, "advanced_volume_exception", f"{muscle} uses the advanced 22-set exception.")
                else:
                    self._error(result, "volume_exceeds_limit", f"{muscle} exceeds weekly volume limit.")

        for muscle, target in plan.program.weekly_volume_targets.items():
            actual = weekly_sets.get(muscle, 0)
            if actual != target:
                self._warning(result, "volume_target_mismatch", f"{muscle} actual sets differ from target.")

    def _validate_frequency(
        self,
        request: KalosTrainingPlanRequest,
        plan: KalosTrainingPlanResponse,
        result: KalosValidationResult,
    ) -> None:
        frequency = self._muscle_frequency(plan)
        limit = FREQUENCY_LIMITS[request.experience]
        for muscle, days in frequency.items():
            if days > limit:
                self._error(result, "frequency_exceeds_limit", f"{muscle} exceeds weekly frequency limit.")

        if request.experience == KalosExperience.beginner and request.days_per_week > 4:
            self._warning(result, "beginner_high_frequency", "Beginner plans over four days require low fatigue and recovery.")
        if request.days_per_week == 7 and not any(self._is_recovery_session(session) for session in plan.program.sessions):
            self._error(result, "seven_days_without_recovery", "Seven-day plans must include recovery, core, mobility, or cardio.")

    def _validate_fatigue(
        self,
        request: KalosTrainingPlanRequest,
        plan: KalosTrainingPlanResponse,
        result: KalosValidationResult,
    ) -> None:
        session_limit = FATIGUE_LIMITS[request.experience]
        high_limit = HIGH_FATIGUE_EXERCISE_LIMITS[request.experience]
        for session in plan.program.sessions:
            calculated = sum(FATIGUE_POINTS[exercise.fatigue_cost] for exercise in session.exercises)
            if calculated != session.fatigue_points:
                self._error(result, "fatigue_points_mismatch", f"Session {session.session_id} fatigue_points are incorrect.")
            if calculated > session_limit:
                self._error(result, "fatigue_exceeds_limit", f"Session {session.session_id} exceeds fatigue limit.")

            high_count = sum(1 for exercise in session.exercises if exercise.fatigue_cost == FatigueCost.high)
            if high_count > high_limit:
                self._error(result, "too_many_high_fatigue_exercises", f"Session {session.session_id} has too many high-fatigue exercises.")

            lumbar_high = sum(
                1
                for exercise in session.exercises
                if exercise.fatigue_cost == FatigueCost.high and JointStress.lumbar in exercise.joint_stress
            )
            if lumbar_high > 2:
                self._error(result, "lumbar_stress_exceeds_limit", f"Session {session.session_id} has excessive lumbar stress.")

    def _validate_duplicates(
        self,
        request: KalosTrainingPlanRequest,
        plan: KalosTrainingPlanResponse,
        result: KalosValidationResult,
    ) -> None:
        exercise_counts = Counter(exercise.exercise_id for session in plan.program.sessions for exercise in session.exercises)
        max_repeats = 1 if request.experience == KalosExperience.beginner else 2
        for exercise_id, count in exercise_counts.items():
            if count > max_repeats:
                repeated = [
                    exercise
                    for session in plan.program.sessions
                    for exercise in session.exercises
                    if exercise.exercise_id == exercise_id
                ]
                if not all(exercise.repeat_justification for exercise in repeated):
                    self._error(result, "duplicate_exercise_unjustified", f"{exercise_id} repeats without justification.")

        ordered_sessions = sorted(plan.program.sessions, key=lambda session: session.day_number)
        for previous, current in zip(ordered_sessions, ordered_sessions[1:]):
            previous_anchors = {exercise.exercise_id for exercise in previous.exercises if exercise.role == ExerciseRole.anchor}
            current_anchors = {exercise.exercise_id for exercise in current.exercises if exercise.role == ExerciseRole.anchor}
            if previous_anchors & current_anchors:
                self._error(result, "anchor_repeated_consecutive_days", "The same anchor cannot repeat on consecutive days.")

    def _validate_equipment(
        self,
        request: KalosTrainingPlanRequest,
        plan: KalosTrainingPlanResponse,
        result: KalosValidationResult,
    ) -> None:
        available = set(request.available_equipment)
        required = {exercise.equipment for session in plan.program.sessions for exercise in session.exercises}
        missing = required - available
        if missing:
            self._error(result, "equipment_unavailable", "Plan includes equipment outside available_equipment.")
        limited_equipment = available <= {Equipment.dumbbell, Equipment.bodyweight, Equipment.band}
        if limited_equipment:
            self._warning(result, "limited_equipment_substitutions", "Limited equipment may require substitutions.")

    def _validate_constraints(
        self,
        request: KalosTrainingPlanRequest,
        plan: KalosTrainingPlanResponse,
        result: KalosValidationResult,
    ) -> None:
        excluded_ids = set(request.constraints.excluded_exercise_ids)
        excluded_patterns = set(request.constraints.excluded_movement_patterns)
        injuries = set(request.constraints.injuries)
        pain_areas = set(request.constraints.pain_areas)

        for session in plan.program.sessions:
            for exercise in session.exercises:
                if exercise.exercise_id in excluded_ids:
                    self._error(result, "excluded_exercise_used", f"{exercise.exercise_id} is excluded.")
                if exercise.movement_pattern in excluded_patterns:
                    self._error(result, "excluded_pattern_used", f"{exercise.movement_pattern.value} is excluded.")

                stressed = set(exercise.joint_stress)
                if injuries & stressed:
                    self._error(result, "injury_constraint_violated", f"{exercise.exercise_id} stresses an injured joint.")
                if pain_areas & stressed:
                    if exercise.role == ExerciseRole.anchor or exercise.fatigue_cost == FatigueCost.high:
                        self._error(result, "pain_constraint_violated", f"{exercise.exercise_id} is too stressful for a painful joint.")
                    else:
                        self._warning(result, "pain_constraint_warning", f"{exercise.exercise_id} touches a painful joint.")

    def _validate_time(
        self,
        request: KalosTrainingPlanRequest,
        plan: KalosTrainingPlanResponse,
        result: KalosValidationResult,
    ) -> None:
        hard_limit = request.time_budget_minutes * 1.1
        set_limit = self._effective_set_limit(request.time_budget_minutes)
        for session in plan.program.sessions:
            if session.estimated_minutes > hard_limit:
                self._error(result, "time_budget_exceeded", f"Session {session.session_id} exceeds time budget.")
            total_sets = sum(exercise.sets for exercise in session.exercises)
            if total_sets > set_limit:
                self._warning(result, "session_sets_over_time_guideline", f"Session {session.session_id} may exceed time capacity.")

    def _validate_rir_and_rest(
        self,
        request: KalosTrainingPlanRequest,
        plan: KalosTrainingPlanResponse,
        result: KalosValidationResult,
    ) -> None:
        painful_joints = set(request.constraints.injuries) | set(request.constraints.pain_areas)
        for session in plan.program.sessions:
            for exercise in session.exercises:
                if exercise.rep_range.min < 1:
                    self._error(result, "invalid_rep_range", "Rep ranges must start at one or higher.")
                if exercise.rir_target.max > 4:
                    self._error(result, "invalid_rir", "RIR cannot exceed four.")
                if (
                    request.experience == KalosExperience.beginner
                    and exercise.role == ExerciseRole.anchor
                    and exercise.rir_target.min == 0
                ):
                    self._error(result, "beginner_anchor_rir_too_low", "Beginner anchors must not target RIR 0.")
                if painful_joints & set(exercise.joint_stress) and exercise.rir_target.min < 2:
                    self._error(result, "pain_rir_too_low", "Exercises stressing painful joints require RIR 2 or higher.")

    def _validate_quality_checks(
        self,
        plan: KalosTrainingPlanResponse,
        result: KalosValidationResult,
    ) -> None:
        expected_status = result.status
        if plan.quality_checks.status != expected_status:
            self._warning(result, "quality_status_mismatch", "quality_checks.status does not match validator result.")

        flag_expectations = {
            "volume_within_limits": "volume_exceeds_limit",
            "frequency_within_limits": "frequency_exceeds_limit",
            "fatigue_within_limits": "fatigue_exceeds_limit",
            "equipment_available": "equipment_unavailable",
            "duplicate_exercises_justified": "duplicate_exercise_unjustified",
        }
        error_codes = {issue.code for issue in result.errors}
        for flag, code_fragment in flag_expectations.items():
            if any(code_fragment in code for code in error_codes) and getattr(plan.quality_checks, flag):
                self._warning(result, "quality_flag_mismatch", f"quality_checks.{flag} is inconsistent.")
        if error_codes & CONSTRAINT_ERROR_CODES and plan.quality_checks.constraints_respected:
            self._warning(result, "quality_flag_mismatch", "quality_checks.constraints_respected is inconsistent.")

    def _weekly_sets(self, plan: KalosTrainingPlanResponse) -> dict[str, int]:
        weekly_sets: dict[str, int] = defaultdict(int)
        for session in plan.program.sessions:
            for exercise in session.exercises:
                for muscle, sets in exercise.weekly_set_contribution.items():
                    weekly_sets[muscle] += sets
        return dict(weekly_sets)

    def _muscle_frequency(self, plan: KalosTrainingPlanResponse) -> dict[str, int]:
        frequency: dict[str, int] = defaultdict(int)
        for session in plan.program.sessions:
            stimulated = {
                muscle
                for exercise in session.exercises
                for muscle, sets in exercise.weekly_set_contribution.items()
                if sets > 0
            }
            for muscle in stimulated:
                frequency[muscle] += 1
        return dict(frequency)

    def _effective_set_limit(self, time_budget_minutes: int) -> int:
        for max_minutes, max_sets in TIME_SERIES_LIMITS:
            if time_budget_minutes <= max_minutes:
                return max_sets
        return 24

    def _is_recovery_session(self, session: KalosSession) -> bool:
        text = f"{session.label} {session.intent}".lower()
        return any(marker in text for marker in RECOVERY_MARKERS)

    def _error(self, result: KalosValidationResult, code: str, message: str) -> None:
        result.errors.append(KalosValidationIssue(code=code, message=message))

    def _warning(self, result: KalosValidationResult, code: str, message: str) -> None:
        result.warnings.append(KalosValidationIssue(code=code, message=message))
