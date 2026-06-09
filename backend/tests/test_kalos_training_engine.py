"""Tests for the minimal deterministic Kalos training engine."""

from __future__ import annotations

from itertools import product
from pathlib import Path

import pytest

from app.schemas.kalos_training import ExerciseRole, KalosTrainingPlanRequest
from app.schemas.kalos_training import KalosExerciseSubstitutionRequest
from app.services.kalos_training_engine import (
    KalosTrainingEngine,
    KalosTrainingEngineError,
    load_kalos_catalog_csv,
)
from app.services.kalos_training_validator import KalosTrainingValidator


CATALOG_PATH = Path(__file__).parents[2] / "docs" / "training-data" / "kalos_exercise_taxonomy_seed.csv"
FULL_EQUIPMENT = [
    "barbell",
    "dumbbell",
    "machine",
    "cable",
    "bodyweight",
    "band",
    "smith",
    "bench",
    "cardio_machine",
]
COACH_MATRIX_SEXES = ["male", "female"]
COACH_MATRIX_EXPERIENCES = ["beginner", "intermediate", "advanced"]
COACH_MATRIX_DAYS = [3, 4, 5, 6]
COACH_MATRIX_MINUTES = [45, 75, 120]
COACH_MATRIX_MODES = ["balanced", "torso", "glutes_legs"]
COACH_BASE_MUSCLES = ["chest", "back", "shoulders", "quads", "hamstrings", "glutes"]
UPPER_VOLUME_MUSCLES = ["chest", "back", "shoulders", "biceps", "triceps"]
LOWER_VOLUME_MUSCLES = ["quads", "hamstrings", "glutes", "abductors", "adductors", "calves"]


@pytest.fixture(scope="module")
def engine() -> KalosTrainingEngine:
    catalog = load_kalos_catalog_csv(CATALOG_PATH)
    return KalosTrainingEngine(catalog)


def assert_valid_plan(request: KalosTrainingPlanRequest, engine: KalosTrainingEngine):
    plan = engine.generate(request)
    validation = KalosTrainingValidator().validate(request, plan)
    assert validation.passed
    assert plan.contract_version == "kalos_training_plan.v1"
    assert len(plan.program.sessions) == request.days_per_week
    assert len(plan.program.split) == request.days_per_week
    return plan


def balanced_four_day_request(**overrides) -> KalosTrainingPlanRequest:
    payload = {
        "days_per_week": 4,
        "goal": "hypertrophy",
        "priority": "balanced",
        "experience": "intermediate",
        "time_budget_minutes": 75,
        "available_equipment": FULL_EQUIPMENT,
        "constraints": {},
    } | overrides
    return KalosTrainingPlanRequest.model_validate(payload)


def balanced_five_day_request(**overrides) -> KalosTrainingPlanRequest:
    payload = {
        "days_per_week": 5,
        "goal": "hypertrophy",
        "priority": "balanced",
        "experience": "intermediate",
        "time_budget_minutes": 75,
        "available_equipment": FULL_EQUIPMENT,
        "constraints": {},
    } | overrides
    return KalosTrainingPlanRequest.model_validate(payload)


def coach_base_floor(time_budget_minutes: int) -> int:
    if time_budget_minutes >= 120:
        return 6
    if time_budget_minutes >= 75:
        return 4
    return 2


def coach_torso_leg_floor(time_budget_minutes: int) -> int:
    if time_budget_minutes >= 120:
        return 12
    if time_budget_minutes >= 75:
        return 8
    return 4


def coach_matrix_request(
    *,
    sex: str,
    experience: str,
    days_per_week: int,
    time_budget_minutes: int,
    mode: str,
) -> KalosTrainingPlanRequest:
    priority = "balanced"
    buckets = {
        "ratio_type": "golden_ratio" if sex == "male" else "hourglass_ratio",
        "ratio_gap_bucket": "low",
    }
    if mode == "torso":
        priority = "torso"
        buckets = {"ratio_type": "golden_ratio", "ratio_gap_bucket": "high"}
    if mode == "glutes_legs":
        priority = "glutes"
        buckets = {"ratio_type": "hourglass_ratio", "ratio_gap_bucket": "high"}

    return KalosTrainingPlanRequest.model_validate(
        {
            "days_per_week": days_per_week,
            "goal": "hypertrophy",
            "priority": priority,
            "experience": experience,
            "time_budget_minutes": time_budget_minutes,
            "available_equipment": FULL_EQUIPMENT,
            "constraints": {},
            "sex_reference": sex,
            "anthropometric_buckets": buckets,
        }
    )


def volume_for(volume: dict[str, int], muscles: list[str]) -> int:
    return sum(volume.get(muscle, 0) for muscle in muscles)


def lower_session_count(plan) -> int:
    return sum(
        1
        for session in plan.program.sessions
        if any(marker in f"{session.label} {session.intent}".lower() for marker in ("lower", "glute", "leg"))
    )


def all_exercises(plan):
    return [
        exercise
        for session in plan.program.sessions
        for exercise in session.exercises
    ]


def average_rir_min(plan) -> float:
    exercises = all_exercises(plan)
    return sum(exercise.rir_target.min for exercise in exercises) / len(exercises)


def rir_zero_ratio(plan) -> float:
    exercises = all_exercises(plan)
    return sum(1 for exercise in exercises if exercise.rir_target.min == 0) / len(exercises)


def test_loads_curated_catalog_from_csv() -> None:
    catalog = load_kalos_catalog_csv(CATALOG_PATH)

    assert len(catalog) >= 50
    assert any(item.primary_muscle == "glutes" and not item.missing_fields for item in catalog)
    assert any(item.primary_muscle == "chest" and not item.missing_fields for item in catalog)


def test_engine_generates_beginner_one_day_balanced(engine: KalosTrainingEngine) -> None:
    request = KalosTrainingPlanRequest.model_validate(
        {
            "days_per_week": 1,
            "goal": "general_fitness",
            "priority": "balanced",
            "experience": "beginner",
            "time_budget_minutes": 45,
            "available_equipment": ["barbell", "dumbbell", "machine", "cable", "bodyweight"],
            "constraints": {},
        }
    )

    plan = assert_valid_plan(request, engine)

    assert plan.quality_checks.status == "pass"
    assert plan.program.split == ["Full Body"]
    assert plan.program.sessions[0].intent == "full_body_balanced"


def test_engine_generates_intermediate_glutes_four_days(engine: KalosTrainingEngine) -> None:
    request = KalosTrainingPlanRequest.model_validate(
        {
            "days_per_week": 4,
            "goal": "hypertrophy",
            "priority": "glutes",
            "experience": "intermediate",
            "time_budget_minutes": 75,
            "available_equipment": ["barbell", "dumbbell", "machine", "cable", "bodyweight"],
            "constraints": {},
        }
    )

    plan = assert_valid_plan(request, engine)

    assert plan.quality_checks.status in {"pass", "warning"}
    assert plan.program.split == ["Lower A", "Upper A", "Lower B", "Upper B"]
    assert "glutes" in plan.program.weekly_volume_targets


def test_engine_generates_advanced_torso_six_days(engine: KalosTrainingEngine) -> None:
    request = KalosTrainingPlanRequest.model_validate(
        {
            "days_per_week": 6,
            "goal": "strength_hypertrophy",
            "priority": "torso",
            "experience": "advanced",
            "time_budget_minutes": 90,
            "available_equipment": ["barbell", "dumbbell", "machine", "cable", "bodyweight"],
            "constraints": {},
        }
    )

    plan = assert_valid_plan(request, engine)

    assert plan.quality_checks.status == "pass"
    assert plan.program.split == ["Push A", "Pull A", "Legs", "Push B", "Pull B", "Upper Arms"]
    assert {"chest", "back", "shoulders"} & set(plan.program.weekly_volume_targets)


def test_engine_torso_beginner_high_frequency_uses_recovery_fallback(
    engine: KalosTrainingEngine,
) -> None:
    request = KalosTrainingPlanRequest.model_validate(
        {
            "days_per_week": 6,
            "goal": "hypertrophy",
            "priority": "torso",
            "experience": "beginner",
            "time_budget_minutes": 90,
            "available_equipment": FULL_EQUIPMENT,
            "constraints": {},
        }
    )

    plan = assert_valid_plan(request, engine)

    assert plan.quality_checks.status == "warning"
    assert "beginner_high_frequency" in plan.quality_checks.warnings
    assert any("recovery" in f"{session.label} {session.intent}".lower() for session in plan.program.sessions)
    assert plan.program.weekly_volume_targets["chest"] > 0
    assert plan.program.weekly_volume_targets["quads"] > 0


def test_engine_glutes_priority_keeps_minimum_quad_floor(
    engine: KalosTrainingEngine,
) -> None:
    request = KalosTrainingPlanRequest.model_validate(
        {
            "days_per_week": 5,
            "goal": "hypertrophy",
            "priority": "glutes",
            "experience": "beginner",
            "time_budget_minutes": 90,
            "available_equipment": FULL_EQUIPMENT,
            "constraints": {},
        }
    )

    plan = assert_valid_plan(request, engine)

    assert plan.program.weekly_volume_targets["quads"] > 0
    assert plan.program.weekly_volume_targets["glutes"] > 0


def test_engine_glutes_legs_biometric_focus_keeps_minimum_quad_floor(
    engine: KalosTrainingEngine,
) -> None:
    request = balanced_five_day_request(
        sex_reference="female",
        anthropometric_buckets={"ratio_type": "hourglass_ratio", "ratio_gap_bucket": "very_high"},
    )

    plan = assert_valid_plan(request, engine)

    assert plan.input_summary.biometric_focus == "glutes_legs"
    assert plan.program.weekly_volume_targets["quads"] > 0


def test_engine_torso_priority_keeps_chest_and_leg_floor(
    engine: KalosTrainingEngine,
) -> None:
    request = KalosTrainingPlanRequest.model_validate(
        {
            "days_per_week": 6,
            "goal": "hypertrophy",
            "priority": "torso",
            "experience": "beginner",
            "time_budget_minutes": 90,
            "available_equipment": FULL_EQUIPMENT,
            "constraints": {},
        }
    )

    plan = assert_valid_plan(request, engine)
    volume = plan.program.weekly_volume_targets

    assert volume["chest"] > 0
    assert volume_for(volume, ["quads", "hamstrings", "glutes"]) > 0


@pytest.mark.parametrize("time_budget_minutes", [75, 90, 120])
def test_engine_beginner_density_uses_available_time_without_exceeding_fatigue(
    engine: KalosTrainingEngine,
    time_budget_minutes: int,
) -> None:
    request = KalosTrainingPlanRequest.model_validate(
        {
            "days_per_week": 4,
            "goal": "hypertrophy",
            "priority": "balanced",
            "experience": "beginner",
            "time_budget_minutes": time_budget_minutes,
            "available_equipment": FULL_EQUIPMENT,
            "constraints": {},
        }
    )

    plan = assert_valid_plan(request, engine)
    normal_sessions = [
        session
        for session in plan.program.sessions
        if "recovery" not in f"{session.label} {session.intent}".lower()
    ]

    assert min(len(session.exercises) for session in normal_sessions) >= 4
    assert all(session.fatigue_points <= 8 for session in normal_sessions)


@pytest.mark.parametrize("priority", ["balanced", "glutes", "legs", "torso"])
@pytest.mark.parametrize("days_per_week", range(1, 8))
def test_engine_supports_all_days_and_priorities(
    engine: KalosTrainingEngine,
    priority: str,
    days_per_week: int,
) -> None:
    request = KalosTrainingPlanRequest.model_validate(
        {
            "days_per_week": days_per_week,
            "goal": "hypertrophy",
            "priority": priority,
            "experience": "advanced" if days_per_week >= 6 else "intermediate",
            "time_budget_minutes": 90,
            "available_equipment": ["barbell", "dumbbell", "machine", "cable", "bodyweight"],
            "constraints": {},
        }
    )

    plan = assert_valid_plan(request, engine)

    assert len(plan.program.sessions) == days_per_week
    if days_per_week == 7:
        recovery_text = " ".join(
            f"{session.label} {session.intent}".lower()
            for session in plan.program.sessions
        )
        assert any(marker in recovery_text for marker in ("recovery", "core", "mobility", "cardio"))

    anchors_by_day = [
        {
            exercise.exercise_id
            for exercise in session.exercises
            if exercise.role == ExerciseRole.anchor
        }
        for session in plan.program.sessions
    ]
    for previous, current in zip(anchors_by_day, anchors_by_day[1:]):
        assert not previous & current


def test_engine_warns_when_beginner_exceeds_four_days(engine: KalosTrainingEngine) -> None:
    request = KalosTrainingPlanRequest.model_validate(
        {
            "days_per_week": 5,
            "goal": "general_fitness",
            "priority": "balanced",
            "experience": "beginner",
            "time_budget_minutes": 75,
            "available_equipment": ["barbell", "dumbbell", "machine", "cable", "bodyweight"],
            "constraints": {},
        }
    )

    plan = assert_valid_plan(request, engine)

    assert plan.quality_checks.status == "warning"
    assert "beginner_high_frequency" in plan.quality_checks.warnings


def test_engine_coach_matrix_has_zero_technical_blocks(engine: KalosTrainingEngine) -> None:
    failures = []
    total = 0

    for sex, experience, days_per_week, time_budget_minutes, mode in product(
        COACH_MATRIX_SEXES,
        COACH_MATRIX_EXPERIENCES,
        COACH_MATRIX_DAYS,
        COACH_MATRIX_MINUTES,
        COACH_MATRIX_MODES,
    ):
        total += 1
        request = coach_matrix_request(
            sex=sex,
            experience=experience,
            days_per_week=days_per_week,
            time_budget_minutes=time_budget_minutes,
            mode=mode,
        )
        try:
            assert_valid_plan(request, engine)
        except Exception as exc:  # pragma: no cover - failure aggregation aid
            failures.append((sex, experience, days_per_week, time_budget_minutes, mode, str(exc)))

    assert total == 216
    assert failures == []


def test_engine_coach_matrix_respects_base_muscle_and_priority_floors(
    engine: KalosTrainingEngine,
) -> None:
    violations = []
    total = 0

    for sex, experience, days_per_week, time_budget_minutes, mode in product(
        COACH_MATRIX_SEXES,
        COACH_MATRIX_EXPERIENCES,
        COACH_MATRIX_DAYS,
        COACH_MATRIX_MINUTES,
        COACH_MATRIX_MODES,
    ):
        total += 1
        request = coach_matrix_request(
            sex=sex,
            experience=experience,
            days_per_week=days_per_week,
            time_budget_minutes=time_budget_minutes,
            mode=mode,
        )
        plan = assert_valid_plan(request, engine)
        volume = plan.program.weekly_volume_targets

        if mode == "balanced":
            missing = [muscle for muscle in COACH_BASE_MUSCLES if volume.get(muscle, 0) <= 0]
            if missing:
                violations.append((sex, experience, days_per_week, time_budget_minutes, mode, "base_zero", missing))

        if mode == "glutes_legs" and volume.get("quads", 0) < coach_base_floor(time_budget_minutes):
            violations.append(
                (
                    sex,
                    experience,
                    days_per_week,
                    time_budget_minutes,
                    mode,
                    "quads_floor",
                    volume.get("quads", 0),
                )
            )

        if mode == "torso":
            leg_total = volume_for(volume, ["quads", "hamstrings", "glutes"])
            if volume.get("chest", 0) < coach_base_floor(time_budget_minutes):
                violations.append(
                    (
                        sex,
                        experience,
                        days_per_week,
                        time_budget_minutes,
                        mode,
                        "chest_floor",
                        volume.get("chest", 0),
                    )
                )
            if leg_total < coach_torso_leg_floor(time_budget_minutes):
                violations.append(
                    (
                        sex,
                        experience,
                        days_per_week,
                        time_budget_minutes,
                        mode,
                        "leg_floor",
                        leg_total,
                    )
                )

    assert total == 216
    assert violations == []


def test_engine_coach_matrix_respects_beginner_rir_and_long_session_density(
    engine: KalosTrainingEngine,
) -> None:
    violations = []
    total = 0

    for sex, experience, days_per_week, time_budget_minutes, mode in product(
        COACH_MATRIX_SEXES,
        COACH_MATRIX_EXPERIENCES,
        COACH_MATRIX_DAYS,
        COACH_MATRIX_MINUTES,
        COACH_MATRIX_MODES,
    ):
        total += 1
        request = coach_matrix_request(
            sex=sex,
            experience=experience,
            days_per_week=days_per_week,
            time_budget_minutes=time_budget_minutes,
            mode=mode,
        )
        plan = assert_valid_plan(request, engine)

        if experience == "beginner" and any(exercise.rir_target.min == 0 for exercise in all_exercises(plan)):
            violations.append((sex, experience, days_per_week, time_budget_minutes, mode, "beginner_rir_zero"))

        if time_budget_minutes >= 75:
            sparse_sessions = [
                (session.label, len(session.exercises))
                for session in plan.program.sessions
                if "recovery" not in f"{session.label} {session.intent}".lower()
                and len(session.exercises) <= 3
            ]
            if sparse_sessions:
                violations.append(
                    (sex, experience, days_per_week, time_budget_minutes, mode, "density_low", sparse_sessions)
                )

    assert total == 216
    assert violations == []


@pytest.mark.parametrize(
    ("time_budget_minutes", "experience", "minimum_exercises"),
    [
        (45, "beginner", 3),
        (60, "intermediate", 4),
        (75, "intermediate", 5),
        (90, "advanced", 6),
    ],
)
def test_engine_fills_normal_session_density_by_time(
    engine: KalosTrainingEngine,
    time_budget_minutes: int,
    experience: str,
    minimum_exercises: int,
) -> None:
    request = KalosTrainingPlanRequest.model_validate(
        {
            "days_per_week": 1,
            "goal": "hypertrophy",
            "priority": "balanced",
            "experience": experience,
            "time_budget_minutes": time_budget_minutes,
            "available_equipment": ["barbell", "dumbbell", "machine", "cable", "bodyweight"],
            "constraints": {},
        }
    )

    plan = assert_valid_plan(request, engine)

    assert len(plan.program.sessions[0].exercises) >= minimum_exercises


@pytest.mark.parametrize(
    ("time_budget_minutes", "minimum_exercises"),
    [
        (40, 3),
        (60, 4),
        (75, 5),
        (90, 6),
    ],
)
def test_engine_fills_real_four_day_balanced_density_without_volume_regression(
    engine: KalosTrainingEngine,
    time_budget_minutes: int,
    minimum_exercises: int,
) -> None:
    request = KalosTrainingPlanRequest.model_validate(
        {
            "days_per_week": 4,
            "goal": "hypertrophy",
            "priority": "balanced",
            "experience": "intermediate",
            "time_budget_minutes": time_budget_minutes,
            "available_equipment": ["barbell", "dumbbell", "machine", "cable", "bench"],
            "constraints": {},
        }
    )

    plan = assert_valid_plan(request, engine)
    session_lengths = [len(session.exercises) for session in plan.program.sessions]
    upper_b = next(session for session in plan.program.sessions if session.label == "Upper B")

    assert min(session_lengths) >= minimum_exercises
    assert len(upper_b.exercises) >= minimum_exercises
    assert plan.program.weekly_volume_targets.get("chest", 0) <= 16
    assert plan.program.weekly_volume_targets.get("back", 0) > 0
    assert plan.program.weekly_volume_targets.get("triceps", 0) > 0
    assert plan.program.weekly_volume_targets.get("biceps", 0) > 0
    if time_budget_minutes >= 60:
        assert plan.program.weekly_volume_targets.get("shoulders", 0) > 0


def test_engine_guarantees_balanced_four_day_upper_weekly_minimums(engine: KalosTrainingEngine) -> None:
    request = KalosTrainingPlanRequest.model_validate(
        {
            "days_per_week": 4,
            "goal": "hypertrophy",
            "priority": "balanced",
            "experience": "intermediate",
            "time_budget_minutes": 75,
            "available_equipment": [
                "barbell",
                "dumbbell",
                "machine",
                "cable",
                "bodyweight",
                "band",
                "smith",
                "bench",
                "cardio_machine",
            ],
            "constraints": {},
        }
    )

    plan = assert_valid_plan(request, engine)
    volume = plan.program.weekly_volume_targets
    upper_b = next(session for session in plan.program.sessions if session.label == "Upper B")

    assert volume["biceps"] > 0
    assert volume["triceps"] > 0
    assert volume["shoulders"] > 0
    assert volume["chest"] > 0
    assert volume["back"] > 0
    assert any(exercise.primary_muscle == "biceps" for exercise in upper_b.exercises)


def test_engine_applies_rir_rules_by_experience_and_role(engine: KalosTrainingEngine) -> None:
    expected_ranges = {
        "beginner": {
            ExerciseRole.anchor: (2, 4),
            ExerciseRole.primary_accessory: (2, 3),
            ExerciseRole.secondary_accessory: (2, 3),
            ExerciseRole.isolation: (1, 3),
            ExerciseRole.finisher: (2, 3),
        },
        "intermediate": {
            ExerciseRole.anchor: (1, 3),
            ExerciseRole.primary_accessory: (1, 2),
            ExerciseRole.secondary_accessory: (1, 2),
            ExerciseRole.isolation: (0, 2),
            ExerciseRole.finisher: (0, 2),
        },
        "advanced": {
            ExerciseRole.anchor: (1, 2),
            ExerciseRole.primary_accessory: (0, 2),
            ExerciseRole.secondary_accessory: (0, 2),
            ExerciseRole.isolation: (0, 1),
            ExerciseRole.finisher: (0, 1),
        },
    }

    for experience, role_ranges in expected_ranges.items():
        request = balanced_four_day_request(experience=experience)
        plan = assert_valid_plan(request, engine)

        for exercise in all_exercises(plan):
            if exercise.role not in role_ranges:
                continue
            expected_min, expected_max = role_ranges[exercise.role]
            assert expected_min <= exercise.rir_target.min <= expected_max
            assert expected_min <= exercise.rir_target.max <= expected_max
            assert exercise.rir_target.min <= exercise.rir_target.max
            if experience == "beginner":
                assert exercise.rir_target.min > 0
                assert exercise.rir_target.max > 0


def test_engine_advanced_rir_is_lower_than_intermediate_and_beginner(
    engine: KalosTrainingEngine,
) -> None:
    beginner_plan = assert_valid_plan(balanced_four_day_request(experience="beginner"), engine)
    intermediate_plan = assert_valid_plan(balanced_four_day_request(experience="intermediate"), engine)
    advanced_plan = assert_valid_plan(balanced_four_day_request(experience="advanced"), engine)

    assert average_rir_min(advanced_plan) < average_rir_min(intermediate_plan)
    assert average_rir_min(intermediate_plan) < average_rir_min(beginner_plan)
    assert any(exercise.rir_target.min == 0 for exercise in all_exercises(advanced_plan))
    assert not any(exercise.rir_target.min == 0 for exercise in all_exercises(beginner_plan))


def test_engine_limits_advanced_weekly_rir_zero_ratio(
    engine: KalosTrainingEngine,
) -> None:
    request = balanced_four_day_request(experience="advanced")

    plan = assert_valid_plan(request, engine)
    zero_exercises = [exercise for exercise in all_exercises(plan) if exercise.rir_target.min == 0]

    assert rir_zero_ratio(plan) <= 0.3
    assert zero_exercises
    assert any(
        exercise.role in {
            ExerciseRole.primary_accessory,
            ExerciseRole.secondary_accessory,
            ExerciseRole.isolation,
            ExerciseRole.finisher,
        }
        for exercise in zero_exercises
    )


def test_engine_intermediate_limits_rir_zero_to_safe_roles(
    engine: KalosTrainingEngine,
) -> None:
    request = balanced_four_day_request(experience="intermediate")

    plan = assert_valid_plan(request, engine)
    zero_exercises = [exercise for exercise in all_exercises(plan) if exercise.rir_target.min == 0]

    assert rir_zero_ratio(plan) <= 0.2
    assert all(
        exercise.role in {
            ExerciseRole.primary_accessory,
            ExerciseRole.secondary_accessory,
            ExerciseRole.isolation,
            ExerciseRole.finisher,
        }
        for exercise in zero_exercises
    )
    assert all(exercise.fatigue_cost.value != "high" for exercise in zero_exercises)


def test_engine_progression_rir_changes_by_experience(engine: KalosTrainingEngine) -> None:
    beginner_plan = assert_valid_plan(balanced_four_day_request(experience="beginner"), engine)
    intermediate_plan = assert_valid_plan(balanced_four_day_request(experience="intermediate"), engine)
    advanced_plan = assert_valid_plan(balanced_four_day_request(experience="advanced"), engine)

    assert beginner_plan.program.progression.rir_start == 3
    assert beginner_plan.program.progression.rir_end == 2
    assert intermediate_plan.program.progression.rir_start == 2
    assert intermediate_plan.program.progression.rir_end == 1
    assert advanced_plan.program.progression.rir_start == 1
    assert advanced_plan.program.progression.rir_end == 0


def test_engine_pain_or_restriction_forces_minimum_rir_two(
    engine: KalosTrainingEngine,
) -> None:
    request = balanced_four_day_request(
        experience="advanced",
        constraints={"pain_areas": ["neck"]},
    )

    plan = assert_valid_plan(request, engine)

    assert all(exercise.rir_target.min >= 2 for exercise in all_exercises(plan))


def test_engine_male_ratio_changes_plan_from_balanced_to_upper_bias(
    engine: KalosTrainingEngine,
) -> None:
    unbalanced_request = balanced_four_day_request(
        sex_reference="male",
        anthropometric_buckets={"ratio_type": "golden_ratio", "ratio_gap_bucket": "high"},
    )
    balanced_request = balanced_four_day_request(
        sex_reference="male",
        anthropometric_buckets={"ratio_type": "golden_ratio", "ratio_gap_bucket": "low"},
    )

    unbalanced_plan = assert_valid_plan(unbalanced_request, engine)
    balanced_plan = assert_valid_plan(balanced_request, engine)
    unbalanced_volume = unbalanced_plan.program.weekly_volume_targets
    balanced_volume = balanced_plan.program.weekly_volume_targets

    assert unbalanced_plan.quality_checks.status in {"pass", "warning"}
    assert balanced_plan.quality_checks.status in {"pass", "warning"}
    assert volume_for(unbalanced_volume, ["shoulders", "back"]) > volume_for(
        balanced_volume,
        ["shoulders", "back"],
    )
    assert volume_for(balanced_volume, ["shoulders", "back"]) <= volume_for(
        balanced_volume,
        ["chest", "glutes", "hamstrings"],
    )
    assert unbalanced_plan.program.sessions != balanced_plan.program.sessions


def test_engine_female_ratio_changes_plan_from_balanced_to_lower_bias(
    engine: KalosTrainingEngine,
) -> None:
    unbalanced_request = balanced_four_day_request(
        sex_reference="female",
        anthropometric_buckets={"ratio_type": "hourglass_ratio", "ratio_gap_bucket": "high"},
    )
    balanced_request = balanced_four_day_request(
        sex_reference="female",
        anthropometric_buckets={"ratio_type": "hourglass_ratio", "ratio_gap_bucket": "low"},
    )

    unbalanced_plan = assert_valid_plan(unbalanced_request, engine)
    balanced_plan = assert_valid_plan(balanced_request, engine)
    unbalanced_volume = unbalanced_plan.program.weekly_volume_targets
    balanced_volume = balanced_plan.program.weekly_volume_targets

    assert unbalanced_plan.quality_checks.status in {"pass", "warning"}
    assert balanced_plan.quality_checks.status in {"pass", "warning"}
    assert volume_for(unbalanced_volume, ["glutes", "hamstrings", "abductors"]) > volume_for(
        balanced_volume,
        ["glutes", "hamstrings", "abductors"],
    )
    assert volume_for(balanced_volume, ["glutes", "hamstrings", "abductors"]) <= volume_for(
        balanced_volume,
        ["chest", "back", "shoulders", "triceps"],
    )
    assert unbalanced_plan.program.sessions != balanced_plan.program.sessions


def test_engine_female_high_ratio_balanced_five_days_adds_third_lower_session(
    engine: KalosTrainingEngine,
) -> None:
    request = balanced_five_day_request(
        sex_reference="female",
        anthropometric_buckets={"ratio_type": "hourglass_ratio", "ratio_gap_bucket": "high"},
    )

    plan = assert_valid_plan(request, engine)

    assert lower_session_count(plan) >= 3
    assert plan.program.split == ["Lower A", "Upper A", "Lower B", "Upper B", "Lower C"]


def test_engine_female_high_ratio_balanced_five_days_lower_volume_exceeds_upper(
    engine: KalosTrainingEngine,
) -> None:
    request = balanced_five_day_request(
        sex_reference="female",
        anthropometric_buckets={"ratio_type": "hourglass_ratio", "ratio_gap_bucket": "very_high"},
    )

    plan = assert_valid_plan(request, engine)
    volume = plan.program.weekly_volume_targets

    assert volume_for(volume, ["glutes", "hamstrings", "abductors", "quads"]) > volume_for(
        volume,
        ["chest", "back", "shoulders", "biceps", "triceps"],
    )


def test_engine_male_high_ratio_balanced_five_days_keeps_torso_bias(
    engine: KalosTrainingEngine,
) -> None:
    request = balanced_five_day_request(
        sex_reference="male",
        anthropometric_buckets={"ratio_type": "golden_ratio", "ratio_gap_bucket": "high"},
    )

    plan = assert_valid_plan(request, engine)
    volume = plan.program.weekly_volume_targets

    assert lower_session_count(plan) == 2
    assert volume_for(volume, ["shoulders", "back", "chest", "biceps", "triceps"]) > volume_for(
        volume,
        ["glutes", "hamstrings", "abductors", "quads", "calves", "adductors"],
    )
    assert volume_for(volume, ["shoulders", "back"]) > volume_for(volume, ["chest", "biceps", "triceps"])


@pytest.mark.parametrize("ratio_gap_bucket", ["low", "moderate"])
def test_engine_female_low_or_moderate_ratio_balanced_five_days_uses_three_lower_sessions(
    engine: KalosTrainingEngine,
    ratio_gap_bucket: str,
) -> None:
    request = balanced_five_day_request(
        sex_reference="female",
        anthropometric_buckets={"ratio_type": "hourglass_ratio", "ratio_gap_bucket": ratio_gap_bucket},
    )

    plan = assert_valid_plan(request, engine)
    volume = plan.program.weekly_volume_targets

    assert plan.program.split == ["Lower A", "Upper A", "Lower B", "Upper B", "Lower C"]
    assert lower_session_count(plan) == 3
    assert volume_for(volume, ["quads", "glutes", "hamstrings"]) > 0


def test_engine_male_balanced_five_days_keeps_current_split(
    engine: KalosTrainingEngine,
) -> None:
    request = balanced_five_day_request(
        sex_reference="male",
        anthropometric_buckets={"ratio_type": "golden_ratio", "ratio_gap_bucket": "low"},
    )

    plan = assert_valid_plan(request, engine)

    assert plan.program.split == ["Lower A", "Push", "Pull", "Lower B", "Upper B"]
    assert lower_session_count(plan) == 2


def test_engine_prints_ratio_assertion_report(engine: KalosTrainingEngine, capsys: pytest.CaptureFixture[str]) -> None:
    cases = [
        {
            "sex": "female",
            "ratio_type": "hourglass_ratio",
            "expected_focus": "glutes_legs",
            "expected_split": ["Lower A", "Upper A", "Lower B", "Upper B", "Lower C"],
            "dominant": "lower",
        },
        {
            "sex": "male",
            "ratio_type": "golden_ratio",
            "expected_focus": "torso",
            "expected_split": ["Lower A", "Push", "Pull", "Lower B", "Upper B"],
            "dominant": "upper",
        },
    ]
    reports = []

    for case in cases:
        request = balanced_five_day_request(
            sex_reference=case["sex"],
            anthropometric_buckets={"ratio_type": case["ratio_type"], "ratio_gap_bucket": "high"},
        )
        plan = assert_valid_plan(request, engine)
        volume = plan.program.weekly_volume_targets
        lower_volume = volume_for(volume, LOWER_VOLUME_MUSCLES)
        upper_volume = volume_for(volume, UPPER_VOLUME_MUSCLES)
        focus = plan.input_summary.biometric_focus
        split = " / ".join(plan.program.split)
        passed = (
            focus == case["expected_focus"]
            and plan.program.split == case["expected_split"]
            and (
                (case["dominant"] == "lower" and lower_volume > upper_volume)
                or (case["dominant"] == "upper" and upper_volume > lower_volume)
            )
        )

        reports.append(
            "\n".join(
                [
                    f"sexo: {case['sex']}",
                    "ratio: high",
                    f"biometric_focus: {focus}",
                    f"split: {split}",
                    f"lower_volume: {lower_volume}",
                    f"upper_volume: {upper_volume}",
                    f"resultado: {'PASS' if passed else 'FAIL'}",
                ]
            )
        )
        assert passed

    with capsys.disabled():
        print("\n\n".join(reports))


def test_engine_keeps_beginner_session_within_fatigue_limit(engine: KalosTrainingEngine) -> None:
    request = KalosTrainingPlanRequest.model_validate(
        {
            "days_per_week": 1,
            "goal": "general_fitness",
            "priority": "balanced",
            "experience": "beginner",
            "time_budget_minutes": 90,
            "available_equipment": ["barbell", "dumbbell", "machine", "cable", "bodyweight"],
            "constraints": {},
        }
    )

    plan = assert_valid_plan(request, engine)

    assert plan.program.sessions[0].fatigue_points <= 8


def test_engine_keeps_recovery_session_light(engine: KalosTrainingEngine) -> None:
    request = KalosTrainingPlanRequest.model_validate(
        {
            "days_per_week": 7,
            "goal": "general_fitness",
            "priority": "balanced",
            "experience": "advanced",
            "time_budget_minutes": 90,
            "available_equipment": ["barbell", "dumbbell", "machine", "cable", "bodyweight"],
            "constraints": {},
        }
    )

    plan = assert_valid_plan(request, engine)
    recovery_session = plan.program.sessions[-1]

    assert "recovery" in f"{recovery_session.label} {recovery_session.intent}".lower()
    assert len(recovery_session.exercises) <= 3
    assert recovery_session.fatigue_points <= 4


def test_engine_substitutes_exercise_with_exact_equivalent(engine: KalosTrainingEngine) -> None:
    request = KalosExerciseSubstitutionRequest.model_validate(
        {
            "current_exercise_id": "bfac9d50-179b-461e-bba3-1e87a49094d0",
            "current_session": {
                "goal": "hypertrophy",
                "experience": "intermediate",
                "priority": "torso",
                "label": "Push A",
                "intent": "push_heavy",
                "target_muscles": ["chest", "shoulders", "triceps"],
            },
            "excluded_exercise_ids": ["bfac9d50-179b-461e-bba3-1e87a49094d0"],
            "movement_pattern": "horizontal_push",
            "role": "anchor",
            "primary_muscle": "chest",
            "fatigue_cost": "high",
            "sets": 4,
        }
    )

    response = engine.substitute_exercise(request)

    assert response.equivalence == "exact"
    assert response.equivalence_score == 1.0
    assert response.warnings == []
    assert response.substitute_exercise.exercise_id != request.current_exercise_id
    assert response.substitute_exercise.primary_muscle == "chest"
    assert response.substitute_exercise.movement_pattern == "horizontal_push"
    assert response.substitute_exercise.role == ExerciseRole.anchor
    assert response.substitute_exercise.sets == 4


def test_engine_substitution_returns_partial_warning_for_role_fallback(engine: KalosTrainingEngine) -> None:
    request = KalosExerciseSubstitutionRequest.model_validate(
        {
            "current_exercise_id": "46d1376b-463c-40d9-a656-fd5d026bc6d8",
            "current_session": {
                "goal": "hypertrophy",
                "experience": "intermediate",
                "priority": "torso",
                "label": "Push A",
                "intent": "push_heavy",
                "target_muscles": ["triceps"],
            },
            "available_equipment": ["cable"],
            "excluded_exercise_ids": ["46d1376b-463c-40d9-a656-fd5d026bc6d8"],
            "movement_pattern": "elbow_extension",
            "role": "secondary_accessory",
            "primary_muscle": "triceps",
            "fatigue_cost": "medium",
        }
    )

    response = engine.substitute_exercise(request)

    assert response.equivalence == "partial"
    assert response.equivalence_score < 1.0
    assert "partial_role_match" in response.warnings
    assert response.substitute_exercise.primary_muscle == "triceps"
    assert response.substitute_exercise.movement_pattern == "elbow_extension"
    assert response.substitute_exercise.fatigue_cost.value in {"low", "medium"}


def test_engine_generates_limited_equipment_with_warning(engine: KalosTrainingEngine) -> None:
    request = KalosTrainingPlanRequest.model_validate(
        {
            "days_per_week": 3,
            "goal": "hypertrophy",
            "priority": "balanced",
            "experience": "intermediate",
            "time_budget_minutes": 55,
            "available_equipment": ["dumbbell", "bodyweight", "band"],
            "constraints": {},
        }
    )

    plan = assert_valid_plan(request, engine)
    used_equipment = {
        exercise.equipment
        for session in plan.program.sessions
        for exercise in session.exercises
    }

    assert plan.quality_checks.status == "warning"
    assert "limited_equipment_substitutions" in plan.quality_checks.warnings
    assert {equipment.value for equipment in used_equipment} <= {"dumbbell", "bodyweight", "band"}


def test_engine_returns_controlled_error_for_pain_restriction(engine: KalosTrainingEngine) -> None:
    request = KalosTrainingPlanRequest.model_validate(
        {
            "days_per_week": 6,
            "goal": "hypertrophy",
            "priority": "torso",
            "experience": "advanced",
            "time_budget_minutes": 90,
            "available_equipment": ["barbell", "dumbbell", "machine", "cable", "bodyweight"],
            "constraints": {"pain_areas": ["shoulder"]},
        }
    )

    with pytest.raises(KalosTrainingEngineError) as exc:
        engine.generate(request)

    assert exc.value.code == "catalog_no_safe_anchor"
