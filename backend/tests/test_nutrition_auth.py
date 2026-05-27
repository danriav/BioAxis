"""Authorization contract tests for service-role backed nutrition routes."""

from __future__ import annotations

from dataclasses import dataclass
from importlib import import_module
from types import ModuleType
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient


AUTH_HEADERS = {"Authorization": "Bearer valid-token"}


@dataclass
class FakeResult:
    data: list[dict[str, Any]]


class FakeAuth:
    def __init__(self, user_id: str) -> None:
        self.user_id = user_id

    def get_user(self, token: str) -> SimpleNamespace:
        if token != "valid-token":
            raise ValueError("invalid token")
        return SimpleNamespace(user=SimpleNamespace(id=self.user_id))


class FakeTable:
    def __init__(self, client: "FakeSupabase", name: str) -> None:
        self.client = client
        self.name = name
        self.filters: list[tuple[str, Any]] = []
        self.insert_payload: Any = None

    def select(self, columns: str) -> "FakeTable":
        self.client.calls.append(("select", self.name, columns))
        return self

    def ilike(self, column: str, value: str) -> "FakeTable":
        self.client.calls.append(("ilike", self.name, column, value))
        return self

    def eq(self, column: str, value: Any) -> "FakeTable":
        self.filters.append((column, value))
        self.client.calls.append(("eq", self.name, column, value))
        return self

    def insert(self, payload: Any) -> "FakeTable":
        self.insert_payload = payload
        self.client.calls.append(("insert", self.name, payload))
        return self

    def execute(self) -> FakeResult:
        self.client.calls.append(("execute", self.name, tuple(self.filters)))
        if self.name == "catalog_foods":
            return FakeResult(
                [
                    {
                        "id": "food-1",
                        "name_es": "Avena",
                        "protein_per_g": 0.169,
                        "carbs_per_g": 0.663,
                        "fat_per_g": 0.069,
                        "fiber_per_g": 0.1,
                        "sugar_per_g": 0.01,
                        "sodium_per_mg": 0.0,
                        "is_premium": False,
                        "calories_per_g": "3.89",
                        "variant": "En hojuelas",
                        "default_portion_grams": 40.0,
                        "potassium_mg_per_g": 4.29,
                        "vitamin_c_mg_per_g": 0.0,
                        "category": "Carbohidratos",
                    }
                ]
            )
        if self.name == "nutrition_logs" and self.insert_payload is not None:
            if isinstance(self.insert_payload, list):
                return FakeResult(self.insert_payload)
            return FakeResult([self.insert_payload])
        if self.name == "nutrition_logs":
            return FakeResult(
                [
                    {
                        "user_id": self.client.auth.user_id,
                        "food_id": "food-1",
                        "meal_slot": "breakfast",
                        "quantity_g": 100.0,
                    }
                ]
            )
        if self.name == "dim_atleta":
            return FakeResult(
                [
                    {
                        "genero": "hombre",
                        "edad": 30,
                        "peso": 80,
                        "altura": 180,
                        "objetivo_metabolico": "maintenance",
                        "dias_entrenamiento_semana": 3,
                    }
                ]
            )
        return FakeResult([])


class FakeSupabase:
    def __init__(self, user_id: str = "auth-user") -> None:
        self.auth = FakeAuth(user_id)
        self.calls: list[tuple[Any, ...]] = []

    def table(self, name: str) -> FakeTable:
        self.calls.append(("table", name))
        return FakeTable(self, name)


@pytest.fixture()
def nutrition_client(monkeypatch: pytest.MonkeyPatch) -> tuple[TestClient, FakeSupabase]:
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test-key")

    import sys

    supabase_module = ModuleType("supabase")
    supabase_module.Client = object
    supabase_module.create_client = lambda _url, _key: FakeSupabase(user_id="initial-user")
    monkeypatch.setitem(sys.modules, "supabase", supabase_module)
    sys.modules.pop("app.main", None)
    module = import_module("app.main")
    fake_supabase = FakeSupabase(user_id="auth-user")
    monkeypatch.setattr(module, "supabase", fake_supabase)
    return TestClient(module.app), fake_supabase


@pytest.mark.parametrize(
    ("method", "url", "json_body"),
    [
        ("get", "/nutrition/search?query=avena", None),
        (
            "post",
            "/nutrition/add-log",
            {
                "food_id": "food-1",
                "meal_slot": "breakfast",
                "quantity_g": 100.0,
                "target_date": "2026-05-25",
            },
        ),
        (
            "post",
            "/nutrition/sync-day",
            {
                "source_date": "2026-05-24",
                "target_date": "2026-05-25",
            },
        ),
        ("get", "/nutrition/targets/auth-user", None),
    ],
)
def test_nutrition_endpoints_reject_missing_token(
    nutrition_client: tuple[TestClient, FakeSupabase],
    method: str,
    url: str,
    json_body: dict[str, Any] | None,
) -> None:
    client, _ = nutrition_client

    if json_body is None:
        response = getattr(client, method)(url)
    else:
        response = getattr(client, method)(url, json=json_body)

    assert response.status_code == 401


def test_search_accepts_valid_token(nutrition_client: tuple[TestClient, FakeSupabase]) -> None:
    client, _ = nutrition_client

    response = client.get("/nutrition/search?query=avena", headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.json()[0]["name_es"] == "Avena"
    assert response.json()[0]["calories_per_g"] == 3.89
    assert response.json()[0]["potassium_mg_per_g"] == 4.29
    assert response.json()[0]["vitamin_c_mg_per_g"] == 0.0


def test_add_log_uses_authenticated_user_for_persistence(
    nutrition_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = nutrition_client

    response = client.post(
        "/nutrition/add-log",
        headers=AUTH_HEADERS,
        json={
            "food_id": "food-1",
            "meal_slot": "breakfast",
            "quantity_g": 100.0,
            "target_date": "2026-05-25",
        },
    )

    insert_calls = [call for call in fake_supabase.calls if call[0] == "insert"]
    assert response.status_code == 200
    assert response.json()["user_id"] == "auth-user"
    assert insert_calls[-1][2]["user_id"] == "auth-user"


def test_sync_day_filters_and_inserts_authenticated_user(
    nutrition_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = nutrition_client

    response = client.post(
        "/nutrition/sync-day",
        headers=AUTH_HEADERS,
        json={
            "source_date": "2026-05-24",
            "target_date": "2026-05-25",
        },
    )

    insert_calls = [call for call in fake_supabase.calls if call[0] == "insert"]
    assert response.status_code == 200
    assert response.json() == {"status": "success", "copied_items": 1}
    assert ("eq", "nutrition_logs", "user_id", "auth-user") in fake_supabase.calls
    assert insert_calls[-1][2][0]["user_id"] == "auth-user"


def test_targets_accepts_valid_user_and_rejects_cross_user(
    nutrition_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, _ = nutrition_client

    own_response = client.get("/nutrition/targets/auth-user", headers=AUTH_HEADERS)
    cross_user_response = client.get("/nutrition/targets/other-user", headers=AUTH_HEADERS)

    assert own_response.status_code == 200
    assert own_response.json() == {"kcal": 2448, "protein": 176, "carbs": 256, "fat": 80}
    assert cross_user_response.status_code == 403


@pytest.mark.parametrize(
    ("url", "json_body"),
    [
        (
            "/nutrition/add-log",
            {
                "user_id": "attacker-user",
                "food_id": "food-1",
                "meal_slot": "breakfast",
                "quantity_g": 100.0,
                "target_date": "2026-05-25",
            },
        ),
        (
            "/nutrition/sync-day",
            {
                "user_id": "attacker-user",
                "source_date": "2026-05-24",
                "target_date": "2026-05-25",
            },
        ),
    ],
)
def test_nutrition_payloads_reject_extra_user_id(
    nutrition_client: tuple[TestClient, FakeSupabase],
    url: str,
    json_body: dict[str, Any],
) -> None:
    client, _ = nutrition_client

    response = client.post(url, headers=AUTH_HEADERS, json=json_body)

    assert response.status_code == 422


def test_cors_allows_local_frontend_port_without_wildcard(
    nutrition_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, _ = nutrition_client

    response = client.options(
        "/nutrition/search?query=avena",
        headers={
            "Origin": "http://127.0.0.1:4173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:4173"
    assert response.headers["access-control-allow-origin"] != "*"


def test_cors_rejects_unlisted_origin(nutrition_client: tuple[TestClient, FakeSupabase]) -> None:
    client, _ = nutrition_client

    response = client.options(
        "/nutrition/search?query=avena",
        headers={
            "Origin": "https://malicious.example",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
