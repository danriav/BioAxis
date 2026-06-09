"""Pure adapter from existing exercise catalog rows to Kalos catalog items."""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Any, Iterable, Mapping

from app.schemas.kalos_training import (
    Equipment,
    ExerciseRole,
    FatigueCost,
    JointStress,
    KalosCatalogCoverageReport,
    KalosExerciseCatalogItem,
    MovementPattern,
)


LEGACY_EQUIPMENT_MAP = {
    "barbell": Equipment.barbell,
    "dumbbell": Equipment.dumbbell,
    "cable": Equipment.cable,
    "machine": Equipment.machine,
    "bodyweight": Equipment.bodyweight,
    "resistance_band": Equipment.band,
    "band": Equipment.band,
    "smith_machine": Equipment.smith,
    "smith": Equipment.smith,
    "bench": Equipment.bench,
}

LEGACY_MOVEMENT_PATTERN_MAP = {
    "squat": MovementPattern.squat,
    "hinge": MovementPattern.hinge,
    "push_horizontal": MovementPattern.horizontal_push,
    "horizontal_push": MovementPattern.horizontal_push,
    "push_vertical": MovementPattern.vertical_push,
    "vertical_push": MovementPattern.vertical_push,
    "pull_horizontal": MovementPattern.horizontal_pull,
    "horizontal_pull": MovementPattern.horizontal_pull,
    "pull_vertical": MovementPattern.vertical_pull,
    "vertical_pull": MovementPattern.vertical_pull,
    "lunge": MovementPattern.squat,
    "isolation": None,
}

ISOLATION_PATTERN_BY_MUSCLE = {
    "biceps": MovementPattern.elbow_flexion,
    "triceps": MovementPattern.elbow_extension,
    "shoulders": MovementPattern.shoulder_abduction,
    "rear_delts": MovementPattern.rear_delt,
    "quads": MovementPattern.knee_extension,
    "hamstrings": MovementPattern.knee_flexion,
    "glutes": MovementPattern.hip_abduction,
    "adductors": MovementPattern.hip_adduction,
    "calves": MovementPattern.calf_raise,
    "core": MovementPattern.core_stability,
}

JOINT_STRESS_BY_PATTERN = {
    MovementPattern.squat: [JointStress.knee, JointStress.hip],
    MovementPattern.hinge: [JointStress.hip, JointStress.lumbar],
    MovementPattern.hip_thrust: [JointStress.hip, JointStress.lumbar],
    MovementPattern.horizontal_push: [JointStress.shoulder, JointStress.elbow],
    MovementPattern.vertical_push: [JointStress.shoulder, JointStress.elbow],
    MovementPattern.horizontal_pull: [JointStress.shoulder, JointStress.elbow],
    MovementPattern.vertical_pull: [JointStress.shoulder, JointStress.elbow],
    MovementPattern.knee_extension: [JointStress.knee],
    MovementPattern.knee_flexion: [JointStress.knee],
    MovementPattern.hip_abduction: [JointStress.hip],
    MovementPattern.hip_adduction: [JointStress.hip],
    MovementPattern.calf_raise: [JointStress.ankle],
    MovementPattern.elbow_flexion: [JointStress.elbow],
    MovementPattern.elbow_extension: [JointStress.elbow],
    MovementPattern.shoulder_abduction: [JointStress.shoulder],
    MovementPattern.rear_delt: [JointStress.shoulder],
    MovementPattern.core_flexion: [JointStress.lumbar],
    MovementPattern.core_stability: [JointStress.lumbar],
    MovementPattern.cardio_liss: [JointStress.ankle],
    MovementPattern.cardio_hiit: [JointStress.ankle, JointStress.knee],
}

REQUIRED_KALOS_FIELDS = (
    "primary_muscle",
    "movement_pattern",
    "role",
    "fatigue_cost",
    "equipment",
    "joint_stress",
    "substitution_group",
)


@dataclass(frozen=True, slots=True)
class KalosCatalogAdapterResult:
    items: list[KalosExerciseCatalogItem]
    coverage: KalosCatalogCoverageReport


class KalosExerciseCatalogAdapter:
    """Maps current exercise catalog rows into the Kalos taxonomy surface."""

    def adapt_many(
        self,
        exercises: Iterable[Any],
        *,
        muscle_group_code_by_id: Mapping[int, str] | None = None,
    ) -> KalosCatalogAdapterResult:
        items = [
            self.adapt_exercise(exercise, muscle_group_code_by_id=muscle_group_code_by_id)
            for exercise in exercises
        ]
        return KalosCatalogAdapterResult(items=items, coverage=self.coverage_report(items))

    def adapt_exercise(
        self,
        exercise: Any,
        *,
        muscle_group_code_by_id: Mapping[int, str] | None = None,
    ) -> KalosExerciseCatalogItem:
        exercise_id = str(self._get(exercise, "id") or self._get(exercise, "exercise_id"))
        name = str(
            self._get(exercise, "name_es")
            or self._get(exercise, "display_name")
            or self._get(exercise, "canonical_name")
        )
        source_warnings: list[str] = []
        unsupported_values: list[tuple[str, str]] = []

        primary_muscle = self._primary_muscle(exercise, muscle_group_code_by_id)
        movement_pattern = self._movement_pattern(exercise, primary_muscle, unsupported_values)
        equipment = self._equipment(exercise, unsupported_values)
        fatigue_cost = self._fatigue_cost(exercise)
        role = self._role(movement_pattern, fatigue_cost)
        joint_stress = JOINT_STRESS_BY_PATTERN.get(movement_pattern, []) if movement_pattern else []
        substitution_group = self._substitution_group(movement_pattern, primary_muscle)

        if self._get(exercise, "allows_glute_focus") and primary_muscle != "glutes":
            source_warnings.append("allows_glute_focus_requires_variant_taxonomy")
        if self._get(exercise, "allows_quad_focus") and primary_muscle != "quads":
            source_warnings.append("allows_quad_focus_requires_variant_taxonomy")
        source_warnings.extend(f"unsupported_{field}:{value}" for field, value in unsupported_values)

        item = KalosExerciseCatalogItem(
            exercise_id=exercise_id,
            name_es=name,
            primary_muscle=primary_muscle,
            movement_pattern=movement_pattern,
            role=role,
            fatigue_cost=fatigue_cost,
            equipment=equipment,
            joint_stress=joint_stress,
            substitution_group=substitution_group,
            missing_fields=[],
            source_warnings=source_warnings,
        )
        missing_fields = [
            field_name
            for field_name in REQUIRED_KALOS_FIELDS
            if not getattr(item, field_name)
        ]
        return item.model_copy(update={"missing_fields": missing_fields})

    def coverage_report(self, items: Iterable[KalosExerciseCatalogItem]) -> KalosCatalogCoverageReport:
        item_list = list(items)
        missing_counts: Counter[str] = Counter()
        unsupported_values: dict[str, set[str]] = defaultdict(set)
        complete_items = 0

        for item in item_list:
            if not item.missing_fields:
                complete_items += 1
            missing_counts.update(item.missing_fields)
            for warning in item.source_warnings:
                if not warning.startswith("unsupported_"):
                    continue
                field, _, value = warning.removeprefix("unsupported_").partition(":")
                unsupported_values[field].add(value)

        total_items = len(item_list)
        coverage_ratio = complete_items / total_items if total_items else 0.0
        return KalosCatalogCoverageReport(
            total_items=total_items,
            complete_items=complete_items,
            coverage_ratio=coverage_ratio,
            missing_by_field=dict(missing_counts),
            unsupported_values={
                field: sorted(values)
                for field, values in sorted(unsupported_values.items())
            },
        )

    def _primary_muscle(
        self,
        exercise: Any,
        muscle_group_code_by_id: Mapping[int, str] | None,
    ) -> str | None:
        direct = self._get(exercise, "primary_muscle") or self._get(exercise, "primary_muscle_code")
        if direct:
            return str(direct)

        muscle_group = self._get(exercise, "muscle_group") or self._get(exercise, "primary_muscle_group_ref")
        if muscle_group:
            code = self._get(muscle_group, "code")
            if code:
                return str(code)

        muscle_group_id = self._get(exercise, "primary_muscle_group") or self._get(exercise, "primary_muscle_group_id")
        if muscle_group_id is not None and muscle_group_code_by_id:
            return muscle_group_code_by_id.get(int(muscle_group_id))
        return None

    def _movement_pattern(
        self,
        exercise: Any,
        primary_muscle: str | None,
        unsupported_values: list[tuple[str, str]],
    ) -> MovementPattern | None:
        raw_pattern = self._get(exercise, "movement_pattern")
        if not raw_pattern:
            return None
        normalized = str(raw_pattern).strip().lower()
        mapped = LEGACY_MOVEMENT_PATTERN_MAP.get(normalized)
        if mapped:
            return mapped
        if normalized == "isolation" and primary_muscle:
            return ISOLATION_PATTERN_BY_MUSCLE.get(primary_muscle)
        if normalized != "isolation":
            unsupported_values.append(("movement_pattern", normalized))
        return None

    def _equipment(
        self,
        exercise: Any,
        unsupported_values: list[tuple[str, str]],
    ) -> list[Equipment]:
        raw_equipment = self._get(exercise, "equipment") or self._get(exercise, "equipment_type")
        if not raw_equipment:
            return []
        raw_values = raw_equipment if isinstance(raw_equipment, list) else [raw_equipment]
        equipment: list[Equipment] = []
        for raw_value in raw_values:
            normalized = str(raw_value).strip().lower()
            mapped = LEGACY_EQUIPMENT_MAP.get(normalized)
            if mapped:
                equipment.append(mapped)
            else:
                unsupported_values.append(("equipment", normalized))
        return sorted(set(equipment), key=lambda value: value.value)

    def _fatigue_cost(self, exercise: Any) -> FatigueCost | None:
        raw_fatigue = self._get(exercise, "fatigue_cost")
        if raw_fatigue:
            return FatigueCost(str(raw_fatigue))

        joint_complexity = self._get(exercise, "joint_complexity")
        if joint_complexity is None:
            return None
        complexity = int(joint_complexity)
        if complexity <= 1:
            return FatigueCost.low
        if complexity == 2:
            return FatigueCost.medium
        return FatigueCost.high

    def _role(
        self,
        movement_pattern: MovementPattern | None,
        fatigue_cost: FatigueCost | None,
    ) -> ExerciseRole | None:
        if not movement_pattern or not fatigue_cost:
            return None
        if movement_pattern in {
            MovementPattern.knee_extension,
            MovementPattern.knee_flexion,
            MovementPattern.hip_abduction,
            MovementPattern.hip_adduction,
            MovementPattern.calf_raise,
            MovementPattern.elbow_flexion,
            MovementPattern.elbow_extension,
            MovementPattern.shoulder_abduction,
            MovementPattern.rear_delt,
        }:
            return ExerciseRole.isolation
        if movement_pattern in {MovementPattern.cardio_liss, MovementPattern.cardio_hiit}:
            return ExerciseRole.cardio
        if fatigue_cost == FatigueCost.high:
            return ExerciseRole.anchor
        return ExerciseRole.primary_accessory

    def _substitution_group(
        self,
        movement_pattern: MovementPattern | None,
        primary_muscle: str | None,
    ) -> str | None:
        if not movement_pattern or not primary_muscle:
            return None
        return f"{movement_pattern.value}_{primary_muscle}"

    def _get(self, source: Any, key: str) -> Any:
        if isinstance(source, dict):
            return source.get(key)
        return getattr(source, key, None)
