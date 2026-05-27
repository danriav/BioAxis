"""Unit tests for the hypertrophy service layer."""

from __future__ import annotations

import pytest

from app.services.hypertrophy_engine import (
    HypertrophyEngineService,
    TrainingSessionInput,
    UserBiometrics,
)


def test_calculates_hypertrophy_macro_targets() -> None:
    service = HypertrophyEngineService()

    targets = service.calculate_macro_targets(
        UserBiometrics(
            weight_kg=80.0,
            height_cm=180.0,
            age_years=30,
            biological_sex="male",
            metabolic_goal="hypertrophy",
            training_days_per_week=5,
        )
    )

    assert targets.calories == 3059
    assert targets.protein_g == 160
    assert targets.fat_g == 80
    assert targets.carbs_g == 425


def test_rejects_negative_or_incoherent_anthropometrics() -> None:
    service = HypertrophyEngineService()

    with pytest.raises(ValueError, match="weight_kg"):
        service.calculate_macro_targets(
            UserBiometrics(
                weight_kg=-80.0,
                height_cm=180.0,
                age_years=30,
                biological_sex="male",
            )
        )

    with pytest.raises(ValueError, match="height_cm"):
        service.calculate_macro_targets(
            UserBiometrics(
                weight_kg=80.0,
                height_cm=40.0,
                age_years=30,
                biological_sex="male",
            )
        )


def test_calculates_weekly_volume_by_muscle_group() -> None:
    service = HypertrophyEngineService()

    volume = service.calculate_weekly_volume(
        [
            TrainingSessionInput(muscle_group_id=1, prescribed_sets=6, rir_target=2),
            TrainingSessionInput(muscle_group_id=1, prescribed_sets=8, rir_target=1),
            TrainingSessionInput(muscle_group_id=2, prescribed_sets=5, rir_target=3),
        ]
    )

    assert volume == {1: 14, 2: 5}


def test_rejects_weekly_volume_above_cap() -> None:
    service = HypertrophyEngineService()

    with pytest.raises(ValueError, match="weekly volume"):
        service.calculate_weekly_volume(
            [
                TrainingSessionInput(muscle_group_id=1, prescribed_sets=8, rir_target=2),
                TrainingSessionInput(muscle_group_id=1, prescribed_sets=8, rir_target=2),
                TrainingSessionInput(muscle_group_id=1, prescribed_sets=6, rir_target=2),
            ]
        )
