"""Tests for the pure Kalos exercise catalog adapter."""

from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

from app.schemas.kalos_training import Equipment, ExerciseRole, FatigueCost, JointStress, MovementPattern
from app.services.kalos_catalog_adapter import KalosExerciseCatalogAdapter


FIXTURE_DIR = Path(__file__).parent / "fixtures" / "kalos"
MUSCLE_GROUPS = {
    1: "quads",
    2: "glutes",
    3: "core",
    4: "chest",
    5: "back",
}


def load_mock_catalog() -> list[dict]:
    return json.loads((FIXTURE_DIR / "mock_exercise_catalog.json").read_text(encoding="utf-8"))


def test_adapter_maps_legacy_fields_to_kalos_catalog_item() -> None:
    catalog = load_mock_catalog()

    result = KalosExerciseCatalogAdapter().adapt_many(
        catalog[:2],
        muscle_group_code_by_id=MUSCLE_GROUPS,
    )

    hip_thrust = result.items[0]
    bench_press = result.items[1]
    assert result.coverage.total_items == 2
    assert result.coverage.complete_items == 2
    assert hip_thrust.exercise_id == "exercise_hip_thrust"
    assert hip_thrust.primary_muscle == "glutes"
    assert hip_thrust.movement_pattern == MovementPattern.hinge
    assert hip_thrust.role == ExerciseRole.anchor
    assert hip_thrust.fatigue_cost == FatigueCost.high
    assert hip_thrust.equipment == [Equipment.barbell]
    assert hip_thrust.joint_stress == [JointStress.hip, JointStress.lumbar]
    assert hip_thrust.substitution_group == "hinge_glutes"
    assert hip_thrust.missing_fields == []
    assert bench_press.movement_pattern == MovementPattern.horizontal_push
    assert bench_press.substitution_group == "horizontal_push_chest"


def test_adapter_infers_isolation_pattern_from_primary_muscle() -> None:
    catalog = load_mock_catalog()

    result = KalosExerciseCatalogAdapter().adapt_many(
        [catalog[2]],
        muscle_group_code_by_id=MUSCLE_GROUPS,
    )

    item = result.items[0]
    assert item.primary_muscle == "quads"
    assert item.movement_pattern == MovementPattern.knee_extension
    assert item.role == ExerciseRole.isolation
    assert item.fatigue_cost == FatigueCost.low
    assert item.joint_stress == [JointStress.knee]
    assert item.substitution_group == "knee_extension_quads"


def test_adapter_maps_resistance_band_to_kalos_band() -> None:
    catalog = load_mock_catalog()

    result = KalosExerciseCatalogAdapter().adapt_many(
        [catalog[3]],
        muscle_group_code_by_id=MUSCLE_GROUPS,
    )

    item = result.items[0]
    assert item.equipment == [Equipment.band]
    assert item.movement_pattern == MovementPattern.horizontal_pull
    assert item.role == ExerciseRole.primary_accessory


def test_adapter_reports_missing_fields_and_unsupported_values() -> None:
    catalog = load_mock_catalog()

    result = KalosExerciseCatalogAdapter().adapt_many(
        catalog,
        muscle_group_code_by_id=MUSCLE_GROUPS,
    )

    incomplete = result.items[4]
    unsupported = result.items[5]
    assert "primary_muscle" in incomplete.missing_fields
    assert "movement_pattern" in incomplete.missing_fields
    assert "equipment" in incomplete.missing_fields
    assert "movement_pattern" in unsupported.missing_fields
    assert "equipment" in unsupported.missing_fields
    assert result.coverage.total_items == 6
    assert result.coverage.complete_items == 4
    assert result.coverage.coverage_ratio == 4 / 6
    assert result.coverage.unsupported_values == {
        "equipment": ["kettlebell"],
        "movement_pattern": ["carry"],
    }


def test_adapter_accepts_object_rows() -> None:
    row = SimpleNamespace(
        id="exercise_object_row",
        canonical_name="Object row press",
        equipment_type="dumbbell",
        movement_pattern="push_vertical",
        primary_muscle_group=6,
        joint_complexity=2,
        allows_glute_focus=False,
        allows_quad_focus=False,
    )

    item = KalosExerciseCatalogAdapter().adapt_exercise(
        row,
        muscle_group_code_by_id={6: "shoulders"},
    )

    assert item.exercise_id == "exercise_object_row"
    assert item.name_es == "Object row press"
    assert item.movement_pattern == MovementPattern.vertical_push
    assert item.equipment == [Equipment.dumbbell]
    assert item.role == ExerciseRole.primary_accessory
    assert item.missing_fields == []
