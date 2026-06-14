"""Kalos training schema and pure validator tests."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from app.schemas.kalos_training import (
    KalosExercise,
    KalosTrainingPlanRequest,
    KalosTrainingPlanResponse,
)
from app.services.kalos_training_validator import KalosTrainingValidator


FIXTURE_DIR = Path(__file__).parent / "fixtures" / "kalos"


def load_fixture(name: str) -> tuple[KalosTrainingPlanRequest, KalosTrainingPlanResponse]:
    payload = json.loads((FIXTURE_DIR / name).read_text(encoding="utf-8"))
    return (
        KalosTrainingPlanRequest.model_validate(payload["request"]),
        KalosTrainingPlanResponse.model_validate(payload["plan"]),
    )


@pytest.mark.parametrize(
    "fixture_name",
    [
        "beginner_1_day.json",
        "intermediate_glutes_4_days.json",
        "advanced_torso_6_days.json",
    ],
)
def test_valid_kalos_fixtures_pass(fixture_name: str) -> None:
    request, plan = load_fixture(fixture_name)

    result = KalosTrainingValidator().validate(request, plan)

    assert result.passed
    assert result.status == "pass"
    assert result.errors == []


@pytest.mark.parametrize(
    ("fixture_name", "expected_warning"),
    [
        ("beginner_6_days_warning.json", "beginner_high_frequency"),
        ("limited_equipment_warning.json", "limited_equipment_substitutions"),
    ],
)
def test_warning_kalos_fixtures_return_warnings(
    fixture_name: str,
    expected_warning: str,
) -> None:
    request, plan = load_fixture(fixture_name)

    result = KalosTrainingValidator().validate(request, plan)

    assert result.passed
    assert result.status == "warning"
    assert expected_warning in {warning.code for warning in result.warnings}


def test_pain_restriction_fixture_fails() -> None:
    request, plan = load_fixture("pain_restriction_fail.json")

    result = KalosTrainingValidator().validate(request, plan)

    assert not result.passed
    assert result.status == "fail"
    assert {
        "excluded_pattern_used",
        "pain_constraint_violated",
        "pain_rir_too_low",
    } <= {error.code for error in result.errors}


def test_kalos_request_rejects_user_id_body() -> None:
    request, _ = load_fixture("beginner_1_day.json")
    payload = request.model_dump(mode="json")
    payload["user_id"] = "attacker-user"

    with pytest.raises(ValidationError):
        KalosTrainingPlanRequest.model_validate(payload)


def test_kalos_response_rejects_extra_fields() -> None:
    _, plan = load_fixture("beginner_1_day.json")
    payload = plan.model_dump(mode="json")
    payload["secret_note"] = "not allowed"

    with pytest.raises(ValidationError):
        KalosTrainingPlanResponse.model_validate(payload)


def test_kalos_exercise_rejects_invalid_range_order() -> None:
    _, plan = load_fixture("beginner_1_day.json")
    exercise_payload: dict[str, Any] = plan.program.sessions[0].exercises[0].model_dump(mode="json")
    exercise_payload["rep_range"] = {"min": 12, "max": 8}

    with pytest.raises(ValidationError):
        KalosExercise.model_validate(exercise_payload)


def test_validator_fails_unavailable_equipment() -> None:
    request, plan = load_fixture("beginner_1_day.json")
    payload = request.model_dump(mode="json")
    payload["available_equipment"] = ["bodyweight"]
    restricted_request = KalosTrainingPlanRequest.model_validate(payload)

    result = KalosTrainingValidator().validate(restricted_request, plan)

    assert not result.passed
    assert "equipment_unavailable" in {error.code for error in result.errors}


def test_validator_fails_unjustified_duplicate_exercise() -> None:
    request, plan = load_fixture("intermediate_glutes_4_days.json")
    payload = plan.model_dump(mode="json")
    duplicate = payload["program"]["sessions"][0]["exercises"][0].copy()
    duplicate["order"] = 4
    duplicate["repeat_justification"] = None
    payload["program"]["sessions"][1]["exercises"].append(duplicate)
    payload["program"]["sessions"][2]["exercises"].append({**duplicate, "order": 4})
    mutated_plan = KalosTrainingPlanResponse.model_validate(payload)

    result = KalosTrainingValidator().validate(request, mutated_plan)

    assert not result.passed
    assert "duplicate_exercise_unjustified" in {error.code for error in result.errors}


def test_validator_fails_fatigue_mismatch() -> None:
    request, plan = load_fixture("beginner_1_day.json")
    payload = plan.model_dump(mode="json")
    payload["program"]["sessions"][0]["fatigue_points"] = 1
    mutated_plan = KalosTrainingPlanResponse.model_validate(payload)

    result = KalosTrainingValidator().validate(request, mutated_plan)

    assert not result.passed
    assert "fatigue_points_mismatch" in {error.code for error in result.errors}


def test_advanced_priority_muscle_can_use_22_set_exception() -> None:
    request, plan = load_fixture("advanced_torso_6_days.json")
    payload = plan.model_dump(mode="json")
    payload["program"]["weekly_volume_targets"]["chest"] = 22
    payload["program"]["sessions"][0]["exercises"][0]["weekly_set_contribution"] = {"chest": 8}
    payload["program"]["sessions"][3]["exercises"][0]["weekly_set_contribution"] = {"chest": 8}
    payload["program"]["sessions"][3]["exercises"][1]["weekly_set_contribution"] = {}
    payload["program"]["sessions"][5]["exercises"][0]["weekly_set_contribution"] = {"chest": 6}
    mutated_plan = KalosTrainingPlanResponse.model_validate(payload)

    result = KalosTrainingValidator().validate(request, mutated_plan)

    assert result.passed
    assert "advanced_volume_exception" in {warning.code for warning in result.warnings}


def test_advanced_non_priority_muscle_22_sets_fails() -> None:
    request, plan = load_fixture("advanced_torso_6_days.json")
    payload = request.model_dump(mode="json")
    payload["priority"] = "glutes"
    glute_request = KalosTrainingPlanRequest.model_validate(payload)
    plan_payload = plan.model_dump(mode="json")
    plan_payload["program"]["weekly_volume_targets"]["chest"] = 22
    plan_payload["program"]["sessions"][0]["exercises"][0]["weekly_set_contribution"] = {"chest": 8}
    plan_payload["program"]["sessions"][3]["exercises"][0]["weekly_set_contribution"] = {"chest": 8}
    plan_payload["program"]["sessions"][3]["exercises"][1]["weekly_set_contribution"] = {}
    plan_payload["program"]["sessions"][5]["exercises"][0]["weekly_set_contribution"] = {"chest": 6}
    mutated_plan = KalosTrainingPlanResponse.model_validate(plan_payload)

    result = KalosTrainingValidator().validate(glute_request, mutated_plan)

    assert not result.passed
    assert "volume_exceeds_limit" in {error.code for error in result.errors}


def test_excluded_pattern_makes_constraints_flag_inconsistent() -> None:
    request, plan = load_fixture("beginner_1_day.json")
    payload = request.model_dump(mode="json")
    payload["constraints"] = {"excluded_movement_patterns": ["squat"]}
    restricted_request = KalosTrainingPlanRequest.model_validate(payload)

    result = KalosTrainingValidator().validate(restricted_request, plan)

    assert not result.passed
    assert "excluded_pattern_used" in {error.code for error in result.errors}
    assert "quality_flag_mismatch" in {warning.code for warning in result.warnings}


def test_excluded_exercise_makes_constraints_flag_inconsistent() -> None:
    request, plan = load_fixture("beginner_1_day.json")
    payload = request.model_dump(mode="json")
    payload["constraints"] = {"excluded_exercise_ids": ["exercise_goblet_squat"]}
    restricted_request = KalosTrainingPlanRequest.model_validate(payload)

    result = KalosTrainingValidator().validate(restricted_request, plan)

    assert not result.passed
    assert "excluded_exercise_used" in {error.code for error in result.errors}
    assert "quality_flag_mismatch" in {warning.code for warning in result.warnings}
