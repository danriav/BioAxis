"""Authorization and contract tests for the Kalos preview endpoint."""

from __future__ import annotations

from importlib import import_module
from types import ModuleType, SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient


AUTH_HEADERS = {"Authorization": "Bearer valid-token"}
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


class FakeResult:
    def __init__(self, data: list[dict[str, Any]]) -> None:
        self.data = data


class FakeAuth:
    def __init__(self, user_id: str) -> None:
        self.user_id = user_id

    def get_user(self, token: str) -> SimpleNamespace:
        if token != "valid-token":
            raise ValueError("invalid token")
        return SimpleNamespace(user=SimpleNamespace(id=self.user_id))


class FakeSupabase:
    def __init__(self, user_id: str = "auth-user") -> None:
        self.auth = FakeAuth(user_id)
        self.table_calls: list[str] = []
        self.write_calls: list[tuple[str, Any]] = []
        self.current_biometrics: dict[str, Any] | None = None

    def table(self, name: str) -> "FakeTable":
        self.table_calls.append(name)
        return FakeTable(self, name)


class FakeTable:
    def __init__(self, client: FakeSupabase, name: str) -> None:
        self.client = client
        self.name = name

    def select(self, _columns: str) -> "FakeTable":
        return self

    def eq(self, _column: str, _value: Any) -> "FakeTable":
        return self

    def insert(self, payload: Any) -> "FakeTable":
        self.client.write_calls.append((self.name, payload))
        return self

    def execute(self) -> FakeResult:
        if self.name == "dim_atleta":
            return FakeResult([self.client.current_biometrics] if self.client.current_biometrics else [])
        return FakeResult([])


@pytest.fixture()
def kalos_client(monkeypatch: pytest.MonkeyPatch) -> tuple[TestClient, FakeSupabase]:
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test-key")

    import sys

    supabase_module = ModuleType("supabase")
    supabase_module.Client = object
    supabase_module.create_client = lambda _url, _key: FakeSupabase(user_id="initial-user")
    monkeypatch.setitem(sys.modules, "supabase", supabase_module)
    sys.modules.pop("app.main", None)

    module = import_module("app.main")
    module.get_kalos_training_engine.cache_clear()
    fake_supabase = FakeSupabase(user_id="auth-user")
    monkeypatch.setattr(module, "supabase", fake_supabase)
    return TestClient(module.app), fake_supabase


def valid_preview_payload() -> dict[str, Any]:
    return {
        "days_per_week": 4,
        "goal": "hypertrophy",
        "priority": "glutes",
        "experience": "intermediate",
        "time_budget_minutes": 75,
        "available_equipment": ["barbell", "dumbbell", "machine", "cable", "bodyweight"],
        "constraints": {},
    }


def balanced_preview_payload() -> dict[str, Any]:
    return valid_preview_payload() | {
        "priority": "balanced",
        "available_equipment": FULL_EQUIPMENT,
    }


def volume_for(volume: dict[str, int], muscles: list[str]) -> int:
    return sum(volume.get(muscle, 0) for muscle in muscles)


def valid_substitute_payload() -> dict[str, Any]:
    return {
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
    }


def test_kalos_preview_rejects_missing_authorization(
    kalos_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = kalos_client

    response = client.post("/training/kalos/preview", json=valid_preview_payload())

    assert response.status_code == 401
    assert fake_supabase.table_calls == []
    assert fake_supabase.write_calls == []


def test_kalos_preview_rejects_user_id_in_body(
    kalos_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = kalos_client
    payload = valid_preview_payload() | {"user_id": "attacker-user"}

    response = client.post("/training/kalos/preview", headers=AUTH_HEADERS, json=payload)

    assert response.status_code == 422
    assert fake_supabase.table_calls == []
    assert fake_supabase.write_calls == []


def test_kalos_substitute_rejects_missing_authorization(
    kalos_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = kalos_client

    response = client.post("/training/kalos/substitute", json=valid_substitute_payload())

    assert response.status_code == 401
    assert fake_supabase.table_calls == []
    assert fake_supabase.write_calls == []


def test_kalos_substitute_rejects_user_id_in_body(
    kalos_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = kalos_client
    payload = valid_substitute_payload() | {"user_id": "attacker-user"}

    response = client.post("/training/kalos/substitute", headers=AUTH_HEADERS, json=payload)

    assert response.status_code == 422
    assert fake_supabase.table_calls == []
    assert fake_supabase.write_calls == []


def test_kalos_substitute_returns_full_exercise_without_persistence_or_ai(
    kalos_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = kalos_client

    response = client.post("/training/kalos/substitute", headers=AUTH_HEADERS, json=valid_substitute_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["current_exercise_id"] == valid_substitute_payload()["current_exercise_id"]
    assert body["substitute_exercise"]["exercise_id"] != body["current_exercise_id"]
    assert body["substitute_exercise"]["primary_muscle"] == "chest"
    assert body["substitute_exercise"]["sets"] >= 1
    assert body["substitute_exercise"]["rep_range"] == {"min": 8, "max": 12}
    assert body["substitute_exercise"]["rir_target"]["min"] >= 1
    assert body["substitute_exercise"]["rest_seconds"] >= 30
    assert body["equivalence_score"] >= 0
    assert fake_supabase.table_calls == []
    assert fake_supabase.write_calls == []


def test_kalos_substitute_returns_422_when_no_safe_candidate(
    kalos_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = kalos_client
    payload = valid_substitute_payload() | {
        "available_equipment": ["band"],
        "constraints": {"pain_areas": ["shoulder", "elbow", "wrist"]},
    }

    response = client.post("/training/kalos/substitute", headers=AUTH_HEADERS, json=payload)

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "catalog_no_substitute"
    assert fake_supabase.table_calls == []
    assert fake_supabase.write_calls == []


def test_kalos_preview_returns_valid_plan_without_persistence(
    kalos_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = kalos_client

    response = client.post(
        "/training/kalos/preview",
        headers=AUTH_HEADERS,
        json=valid_preview_payload(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["contract_version"] == "kalos_training_plan.v1"
    assert body["input_summary"]["biometric_focus"] == "unknown"
    assert len(body["program"]["sessions"]) == 4
    assert fake_supabase.table_calls == ["dim_atleta"]
    assert fake_supabase.write_calls == []


def test_kalos_preview_returns_422_for_no_safe_restricted_plan(
    kalos_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = kalos_client
    payload = valid_preview_payload() | {
        "days_per_week": 6,
        "priority": "torso",
        "experience": "advanced",
        "constraints": {"pain_areas": ["shoulder"]},
    }

    response = client.post("/training/kalos/preview", headers=AUTH_HEADERS, json=payload)

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "catalog_no_safe_anchor"
    assert fake_supabase.table_calls == ["dim_atleta"]
    assert fake_supabase.write_calls == []


def test_kalos_preview_uses_db_biometrics_for_male_ratio_adaptation(
    kalos_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = kalos_client
    payload = valid_preview_payload() | {
        "priority": "balanced",
        "sex_reference": "female",
        "anthropometric_buckets": {"ratio_type": "hourglass_ratio", "ratio_gap_bucket": "very_high"},
    }
    fake_supabase.current_biometrics = {
        "genero": "hombre",
        "peso": 82,
        "altura": 180,
        "hombros": 110,
        "cintura": 92,
        "cadera": 96,
    }

    response = client.post("/training/kalos/preview", headers=AUTH_HEADERS, json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["input_summary"]["biometric_focus"] == "torso"
    volume = body["program"]["weekly_volume_targets"]
    assert volume["shoulders"] + volume["back"] > volume["glutes"] + volume.get("abductors", 0)
    assert fake_supabase.write_calls == []


def test_kalos_preview_uses_db_biometrics_for_female_ratio_adaptation(
    kalos_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = kalos_client
    payload = valid_preview_payload() | {"priority": "balanced"}
    fake_supabase.current_biometrics = {
        "genero": "mujer",
        "peso": 62,
        "altura": 165,
        "hombros": 96,
        "cintura": 84,
        "cadera": 94,
    }

    response = client.post("/training/kalos/preview", headers=AUTH_HEADERS, json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["input_summary"]["biometric_focus"] == "glutes_legs"
    volume = body["program"]["weekly_volume_targets"]
    assert volume["glutes"] + volume["abductors"] + volume["hamstrings"] > volume["shoulders"] + volume["back"]
    assert fake_supabase.write_calls == []


def test_kalos_preview_balanced_biometrics_keep_balanced_plan(
    kalos_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = kalos_client
    payload = valid_preview_payload() | {"priority": "balanced"}
    fake_supabase.current_biometrics = {
        "genero": "hombre",
        "peso": 80,
        "altura": 178,
        "hombros": 140,
        "cintura": 90,
        "cadera": 98,
    }

    response = client.post("/training/kalos/preview", headers=AUTH_HEADERS, json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["input_summary"]["biometric_focus"] == "balanced"
    volume = body["program"]["weekly_volume_targets"]
    assert abs((volume["shoulders"] + volume["back"]) - (volume["glutes"] + volume["hamstrings"])) <= 6
    assert fake_supabase.write_calls == []


def test_kalos_preview_plans_differ_when_db_ratios_change(
    kalos_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = kalos_client
    payload = valid_preview_payload() | {"priority": "balanced"}

    fake_supabase.current_biometrics = {
        "genero": "hombre",
        "peso": 82,
        "altura": 180,
        "hombros": 110,
        "cintura": 92,
        "cadera": 96,
    }
    male_plan = client.post("/training/kalos/preview", headers=AUTH_HEADERS, json=payload).json()

    fake_supabase.current_biometrics = {
        "genero": "mujer",
        "peso": 62,
        "altura": 165,
        "hombros": 96,
        "cintura": 84,
        "cadera": 94,
    }
    female_plan = client.post("/training/kalos/preview", headers=AUTH_HEADERS, json=payload).json()

    assert male_plan["program"]["weekly_volume_targets"] != female_plan["program"]["weekly_volume_targets"]
    assert male_plan["program"]["sessions"] != female_plan["program"]["sessions"]
    assert fake_supabase.write_calls == []


def test_kalos_preview_female_glute_ratio_changes_volume_with_same_waist_and_hip(
    kalos_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = kalos_client
    payload = valid_preview_payload() | {
        "priority": "balanced",
        "sex_reference": "male",
        "anthropometric_buckets": {"ratio_type": "golden_ratio", "ratio_gap_bucket": "very_high"},
    }
    shared_biometrics = {
        "genero": "mujer",
        "peso": 62,
        "altura": 165,
        "hombros": 96,
        "cintura": 70,
        "cadera": 94,
    }

    fake_supabase.current_biometrics = shared_biometrics | {"gluteo": 88}
    low_glute_plan = client.post("/training/kalos/preview", headers=AUTH_HEADERS, json=payload).json()

    fake_supabase.current_biometrics = shared_biometrics | {"gluteo": 105}
    high_glute_plan = client.post("/training/kalos/preview", headers=AUTH_HEADERS, json=payload).json()

    low_volume = low_glute_plan["program"]["weekly_volume_targets"]
    high_volume = high_glute_plan["program"]["weekly_volume_targets"]
    low_lower_bias = low_volume["glutes"] + low_volume["abductors"] + low_volume["hamstrings"]
    high_lower_bias = high_volume["glutes"] + high_volume.get("abductors", 0) + high_volume["hamstrings"]

    assert low_lower_bias > high_lower_bias
    assert low_glute_plan["program"]["weekly_volume_targets"] != high_glute_plan["program"]["weekly_volume_targets"]
    assert low_glute_plan["program"]["sessions"] != high_glute_plan["program"]["sessions"]
    assert fake_supabase.write_calls == []


def test_kalos_preview_differentiates_male_ratio_from_db_not_body_context(
    kalos_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = kalos_client
    payload = balanced_preview_payload() | {
        "sex_reference": "female",
        "anthropometric_buckets": {"ratio_type": "hourglass_ratio", "ratio_gap_bucket": "very_high"},
    }

    fake_supabase.current_biometrics = {
        "genero": "hombre",
        "peso": 82,
        "altura": 180,
        "hombros": 110,
        "cintura": 92,
        "cadera": 96,
        "gluteo": 96,
    }
    unbalanced_response = client.post("/training/kalos/preview", headers=AUTH_HEADERS, json=payload)

    fake_supabase.current_biometrics = {
        "genero": "hombre",
        "peso": 82,
        "altura": 180,
        "hombros": 145,
        "cintura": 88,
        "cadera": 96,
        "gluteo": 96,
    }
    balanced_response = client.post("/training/kalos/preview", headers=AUTH_HEADERS, json=payload)

    assert unbalanced_response.status_code == 200
    assert balanced_response.status_code == 200
    unbalanced_plan = unbalanced_response.json()
    balanced_plan = balanced_response.json()
    assert unbalanced_plan["input_summary"]["biometric_focus"] == "torso"
    assert balanced_plan["input_summary"]["biometric_focus"] == "balanced"
    unbalanced_volume = unbalanced_plan["program"]["weekly_volume_targets"]
    balanced_volume = balanced_plan["program"]["weekly_volume_targets"]

    assert unbalanced_plan["quality_checks"]["status"] in {"pass", "warning"}
    assert balanced_plan["quality_checks"]["status"] in {"pass", "warning"}
    assert volume_for(unbalanced_volume, ["shoulders", "back"]) > volume_for(
        balanced_volume,
        ["shoulders", "back"],
    )
    assert volume_for(balanced_volume, ["shoulders", "back"]) <= volume_for(
        balanced_volume,
        ["chest", "glutes", "hamstrings"],
    )
    assert unbalanced_plan["program"]["sessions"] != balanced_plan["program"]["sessions"]
    assert fake_supabase.table_calls == ["dim_atleta", "dim_atleta"]
    assert fake_supabase.write_calls == []


def test_kalos_preview_differentiates_female_ratio_from_db_not_body_context(
    kalos_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = kalos_client
    payload = balanced_preview_payload() | {
        "sex_reference": "male",
        "anthropometric_buckets": {"ratio_type": "golden_ratio", "ratio_gap_bucket": "very_high"},
    }

    fake_supabase.current_biometrics = {
        "genero": "mujer",
        "peso": 62,
        "altura": 165,
        "hombros": 96,
        "cintura": 70,
        "cadera": 94,
        "gluteo": 88,
    }
    unbalanced_response = client.post("/training/kalos/preview", headers=AUTH_HEADERS, json=payload)

    fake_supabase.current_biometrics = {
        "genero": "mujer",
        "peso": 62,
        "altura": 165,
        "hombros": 96,
        "cintura": 70,
        "cadera": 98,
        "gluteo": 105,
    }
    balanced_response = client.post("/training/kalos/preview", headers=AUTH_HEADERS, json=payload)

    assert unbalanced_response.status_code == 200
    assert balanced_response.status_code == 200
    unbalanced_plan = unbalanced_response.json()
    balanced_plan = balanced_response.json()
    assert unbalanced_plan["input_summary"]["biometric_focus"] == "glutes_legs"
    assert balanced_plan["input_summary"]["biometric_focus"] == "balanced"
    unbalanced_volume = unbalanced_plan["program"]["weekly_volume_targets"]
    balanced_volume = balanced_plan["program"]["weekly_volume_targets"]

    assert unbalanced_plan["quality_checks"]["status"] in {"pass", "warning"}
    assert balanced_plan["quality_checks"]["status"] in {"pass", "warning"}
    assert volume_for(unbalanced_volume, ["glutes", "hamstrings", "abductors"]) > volume_for(
        balanced_volume,
        ["glutes", "hamstrings", "abductors"],
    )
    assert volume_for(balanced_volume, ["glutes", "hamstrings", "abductors"]) <= volume_for(
        balanced_volume,
        ["chest", "back", "shoulders", "triceps"],
    )
    assert unbalanced_plan["program"]["sessions"] != balanced_plan["program"]["sessions"]
    assert fake_supabase.table_calls == ["dim_atleta", "dim_atleta"]
    assert fake_supabase.write_calls == []
