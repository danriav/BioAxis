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
        self.update_payload: dict[str, Any] | None = None
        self.delete_requested = False
        self.selected_columns: str = ""

    def select(self, columns: str) -> "FakeTable":
        self.selected_columns = columns
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

    def update(self, payload: dict[str, Any]) -> "FakeTable":
        self.update_payload = payload
        self.client.calls.append(("update", self.name, payload))
        return self

    def delete(self) -> "FakeTable":
        self.delete_requested = True
        self.client.calls.append(("delete", self.name))
        return self

    def _nutrition_log_rows(self) -> list[dict[str, Any]]:
        return [
            {
                "id": "log-1",
                "user_id": self.client.auth.user_id,
                "food_id": "food-1",
                "meal_slot": "desayuno",
                "quantity_g": 100.0,
                "consumed_at": "2026-06-10",
                "catalog_foods": {
                    "name_es": "Avena",
                    "calories_per_g": "3.89",
                    "protein_per_g": 0.169,
                    "carbs_per_g": 0.663,
                    "fat_per_g": 0.069,
                },
            },
            {
                "id": "log-2",
                "user_id": self.client.auth.user_id,
                "food_id": "food-2",
                "meal_slot": "comida",
                "quantity_g": 50.0,
                "consumed_at": "2026-06-10",
                "catalog_foods": {
                    "name_es": "Pollo",
                    "calories_per_g": 1.65,
                    "protein_per_g": 0.31,
                    "carbs_per_g": 0.0,
                    "fat_per_g": 0.036,
                },
            },
            {
                "id": "log-other",
                "user_id": "other-user",
                "food_id": "food-other",
                "meal_slot": "cena",
                "quantity_g": 200.0,
                "consumed_at": "2026-06-10",
                "catalog_foods": {
                    "name_es": "Otro usuario",
                    "calories_per_g": 9.99,
                    "protein_per_g": 9.99,
                    "carbs_per_g": 9.99,
                    "fat_per_g": 9.99,
                },
            },
            {
                "id": "log-other-date",
                "user_id": self.client.auth.user_id,
                "food_id": "food-3",
                "meal_slot": "snacks",
                "quantity_g": 10.0,
                "consumed_at": "2026-06-09",
                "catalog_foods": {
                    "name_es": "Otra fecha",
                    "calories_per_g": 1.0,
                    "protein_per_g": 1.0,
                    "carbs_per_g": 1.0,
                    "fat_per_g": 1.0,
                },
            },
        ]

    def _filtered_nutrition_log_rows(self) -> list[dict[str, Any]]:
        filtered = self._nutrition_log_rows()
        for column, value in self.filters:
            filtered = [row for row in filtered if row.get(column) == value]
        return filtered

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
        if self.name == "nutrition_logs" and self.update_payload is not None:
            updated_rows = [
                row | self.update_payload
                for row in self._filtered_nutrition_log_rows()
            ]
            return FakeResult(updated_rows)
        if self.name == "nutrition_logs" and self.delete_requested:
            return FakeResult(self._filtered_nutrition_log_rows())
        if self.name == "nutrition_logs" and "catalog_foods" in self.selected_columns:
            return FakeResult(self._filtered_nutrition_log_rows())
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
        ("get", "/nutrition/targets/me", None),
        ("get", "/nutrition/logs?date=2026-06-10", None),
        (
            "patch",
            "/nutrition/logs/log-1",
            {"meal_slot": "cena", "quantity_g": 125.0, "target_date": "2026-06-12"},
        ),
        ("delete", "/nutrition/logs/log-1", None),
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


def test_nutrition_targets_me_rejects_invalid_token(
    nutrition_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, _ = nutrition_client

    response = client.get("/nutrition/targets/me", headers={"Authorization": "Bearer expired-token"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid bearer token"


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


def test_nutrition_logs_day_returns_authenticated_user_items_with_macros(
    nutrition_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = nutrition_client

    response = client.get("/nutrition/logs?date=2026-06-10", headers=AUTH_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["date"] == "2026-06-10"
    assert [item["id"] for item in body["items"]] == ["log-1", "log-2"]
    assert {item["food_name"] for item in body["items"]} == {"Avena", "Pollo"}
    assert "Otro usuario" not in {item["food_name"] for item in body["items"]}
    assert body["items"][0] == {
        "id": "log-1",
        "food_id": "food-1",
        "food_name": "Avena",
        "meal_slot": "desayuno",
        "quantity_g": 100.0,
        "consumed_at": "2026-06-10",
        "kcal": 389.0,
        "protein": 16.9,
        "carbs": 66.3,
        "fat": 6.9,
    }
    assert body["items"][1]["kcal"] == 82.5
    assert body["items"][1]["protein"] == 15.5
    assert body["items"][1]["carbs"] == 0.0
    assert body["items"][1]["fat"] == 1.8
    assert body["totals"] == {"kcal": 471.5, "protein": 32.4, "carbs": 66.3, "fat": 8.7}
    assert [item["id"] for item in body["meals"]["desayuno"]] == ["log-1"]
    assert [item["id"] for item in body["meals"]["comida"]] == ["log-2"]
    assert body["meals"]["cena"] == []
    assert body["meals"]["snacks"] == []
    assert ("eq", "nutrition_logs", "user_id", "auth-user") in fake_supabase.calls
    assert ("eq", "nutrition_logs", "consumed_at", "2026-06-10") in fake_supabase.calls


def test_nutrition_logs_day_without_entries_returns_empty_totals(
    nutrition_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, _ = nutrition_client

    response = client.get("/nutrition/logs?date=2026-06-11", headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.json() == {
        "date": "2026-06-11",
        "items": [],
        "totals": {"kcal": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0},
        "meals": {"desayuno": [], "comida": [], "cena": [], "snacks": []},
    }


def test_nutrition_logs_day_rejects_invalid_token(
    nutrition_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, _ = nutrition_client

    response = client.get("/nutrition/logs?date=2026-06-10", headers={"Authorization": "Bearer expired-token"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid bearer token"


def test_nutrition_logs_day_rejects_user_id_query_param(
    nutrition_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, _ = nutrition_client

    response = client.get("/nutrition/logs?date=2026-06-10&user_id=other-user", headers=AUTH_HEADERS)

    assert response.status_code == 422
    assert response.json()["detail"] == "user_id is not accepted on this endpoint"


def test_nutrition_logs_day_rejects_user_id_body(
    nutrition_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, _ = nutrition_client

    response = client.request(
        "GET",
        "/nutrition/logs?date=2026-06-10",
        headers=AUTH_HEADERS,
        json={"user_id": "other-user"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "user_id is not accepted on this endpoint"


def test_patch_nutrition_log_updates_only_authenticated_user_log(
    nutrition_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = nutrition_client

    response = client.patch(
        "/nutrition/logs/log-1",
        headers=AUTH_HEADERS,
        json={"meal_slot": "cena", "quantity_g": 125.0, "target_date": "2026-06-12"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": "log-1",
        "food_id": "food-1",
        "meal_slot": "cena",
        "quantity_g": 125.0,
        "consumed_at": "2026-06-12",
    }
    assert ("update", "nutrition_logs", {"meal_slot": "cena", "quantity_g": 125.0, "consumed_at": "2026-06-12"}) in fake_supabase.calls
    assert ("eq", "nutrition_logs", "id", "log-1") in fake_supabase.calls
    assert ("eq", "nutrition_logs", "user_id", "auth-user") in fake_supabase.calls


def test_delete_nutrition_log_deletes_only_authenticated_user_log(
    nutrition_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = nutrition_client

    response = client.delete("/nutrition/logs/log-1", headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.json() == {"status": "success", "deleted_id": "log-1"}
    assert ("delete", "nutrition_logs") in fake_supabase.calls
    assert ("eq", "nutrition_logs", "id", "log-1") in fake_supabase.calls
    assert ("eq", "nutrition_logs", "user_id", "auth-user") in fake_supabase.calls


@pytest.mark.parametrize(
    ("method", "url", "json_body"),
    [
        ("patch", "/nutrition/logs/log-1", {"quantity_g": 125.0}),
        ("delete", "/nutrition/logs/log-1", None),
    ],
)
def test_nutrition_log_mutations_reject_invalid_token(
    nutrition_client: tuple[TestClient, FakeSupabase],
    method: str,
    url: str,
    json_body: dict[str, Any] | None,
) -> None:
    client, _ = nutrition_client
    kwargs = {"headers": {"Authorization": "Bearer expired-token"}}
    if json_body is not None:
        kwargs["json"] = json_body

    response = getattr(client, method)(url, **kwargs)

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid bearer token"


@pytest.mark.parametrize(
    ("method", "url", "json_body"),
    [
        ("patch", "/nutrition/logs/log-other", {"quantity_g": 125.0}),
        ("delete", "/nutrition/logs/log-other", None),
        ("patch", "/nutrition/logs/missing-log", {"quantity_g": 125.0}),
        ("delete", "/nutrition/logs/missing-log", None),
    ],
)
def test_nutrition_log_mutations_hide_cross_user_or_missing_logs(
    nutrition_client: tuple[TestClient, FakeSupabase],
    method: str,
    url: str,
    json_body: dict[str, Any] | None,
) -> None:
    client, _ = nutrition_client
    kwargs = {"headers": AUTH_HEADERS}
    if json_body is not None:
        kwargs["json"] = json_body

    response = getattr(client, method)(url, **kwargs)

    assert response.status_code == 404
    assert response.json()["detail"] == "Nutrition log not found"


@pytest.mark.parametrize("method", ["patch", "delete"])
def test_nutrition_log_mutations_reject_user_id_query_param(
    nutrition_client: tuple[TestClient, FakeSupabase],
    method: str,
) -> None:
    client, _ = nutrition_client
    kwargs = {"headers": AUTH_HEADERS}
    if method == "patch":
        kwargs["json"] = {"quantity_g": 125.0}

    response = getattr(client, method)("/nutrition/logs/log-1?user_id=other-user", **kwargs)

    assert response.status_code == 422
    assert response.json()["detail"] == "user_id is not accepted on this endpoint"


def test_patch_nutrition_log_rejects_user_id_body(
    nutrition_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, _ = nutrition_client

    response = client.patch(
        "/nutrition/logs/log-1",
        headers=AUTH_HEADERS,
        json={"user_id": "other-user", "quantity_g": 125.0},
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "json_body",
    [
        {"quantity_g": 0},
        {"quantity_g": -1},
        {"meal_slot": ""},
        {"quantity_g": 125.0, "unexpected": "field"},
        {},
    ],
)
def test_patch_nutrition_log_rejects_invalid_payload(
    nutrition_client: tuple[TestClient, FakeSupabase],
    json_body: dict[str, Any],
) -> None:
    client, _ = nutrition_client

    response = client.patch("/nutrition/logs/log-1", headers=AUTH_HEADERS, json=json_body)

    assert response.status_code == 422


def test_targets_accepts_valid_user_and_rejects_cross_user(
    nutrition_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, _ = nutrition_client

    own_response = client.get("/nutrition/targets/auth-user", headers=AUTH_HEADERS)
    cross_user_response = client.get("/nutrition/targets/other-user", headers=AUTH_HEADERS)

    assert own_response.status_code == 200
    assert own_response.json() == {"kcal": 2448, "protein": 176, "carbs": 256, "fat": 80}
    assert cross_user_response.status_code == 403


def test_targets_me_uses_authenticated_user_without_path_user_id(
    nutrition_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = nutrition_client

    response = client.get("/nutrition/targets/me", headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.json() == {"kcal": 2448, "protein": 176, "carbs": 256, "fat": 80}
    assert ("eq", "dim_atleta", "user_id", "auth-user") in fake_supabase.calls
    assert ("eq", "dim_atleta", "user_id", "other-user") not in fake_supabase.calls


def test_targets_me_rejects_user_id_query_param(
    nutrition_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, _ = nutrition_client

    response = client.get("/nutrition/targets/me?user_id=other-user", headers=AUTH_HEADERS)

    assert response.status_code == 422
    assert response.json()["detail"] == "user_id is not accepted on this endpoint"


def test_targets_me_rejects_user_id_body(
    nutrition_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, _ = nutrition_client

    response = client.request(
        "GET",
        "/nutrition/targets/me",
        headers=AUTH_HEADERS,
        json={"user_id": "other-user"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "user_id is not accepted on this endpoint"


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
