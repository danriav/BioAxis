"""Authorization and contract tests for mobile biometric profile routes."""

from __future__ import annotations

from dataclasses import dataclass
from importlib import import_module
from types import ModuleType, SimpleNamespace
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
        self.not_filters: list[tuple[str, Any]] = []
        self.insert_payload: dict[str, Any] | None = None
        self.update_payload: dict[str, Any] | None = None
        self.delete_requested = False
        self.order_column: str | None = None
        self.order_desc = False

    def select(self, columns: str) -> "FakeTable":
        self.client.calls.append(("select", self.name, columns))
        return self

    def eq(self, column: str, value: Any) -> "FakeTable":
        self.filters.append((column, value))
        self.client.calls.append(("eq", self.name, column, value))
        return self

    def neq(self, column: str, value: Any) -> "FakeTable":
        self.not_filters.append((column, value))
        self.client.calls.append(("neq", self.name, column, value))
        return self

    def order(self, column: str, *, desc: bool = False) -> "FakeTable":
        self.order_column = column
        self.order_desc = desc
        self.client.calls.append(("order", self.name, column, desc))
        return self

    def update(self, payload: dict[str, Any]) -> "FakeTable":
        self.update_payload = payload
        self.client.calls.append(("update", self.name, payload))
        return self

    def insert(self, payload: dict[str, Any]) -> "FakeTable":
        self.insert_payload = payload
        self.client.calls.append(("insert", self.name, payload))
        return self

    def delete(self) -> "FakeTable":
        self.delete_requested = True
        self.client.calls.append(("delete", self.name))
        return self

    def _profile_rows(self) -> list[dict[str, Any]]:
        rows = list(self.client.profiles)
        if self.client.current_profile and all(
            row.get("biometria_id") != self.client.current_profile.get("biometria_id")
            for row in rows
        ):
            rows.append(self.client.current_profile)
        return rows

    def _filtered_profile_rows(self) -> list[dict[str, Any]]:
        rows = self._profile_rows()
        for column, value in self.filters:
            rows = [row for row in rows if row.get(column) == value]
        for column, value in self.not_filters:
            rows = [row for row in rows if row.get(column) != value]
        return rows

    def execute(self) -> FakeResult:
        self.client.calls.append(("execute", self.name, tuple(self.filters)))
        if self.name == "user_profiles":
            if self.client.display_name is None:
                return FakeResult([])
            return FakeResult([{"display_name": self.client.display_name}])

        if self.name != "dim_atleta":
            return FakeResult([])

        if self.client.fail_profile_read and self.insert_payload is None and self.update_payload is None:
            raise RuntimeError("sensitive database detail")

        if self.update_payload is not None:
            if self.client.fail_close:
                raise RuntimeError("close failed")
            updated = []
            for row in self._filtered_profile_rows():
                row.update(self.update_payload)
                updated.append(row)
            self.client.profiles = [
                row
                for row in self._profile_rows()
                if not any(row.get("biometria_id") == updated_row.get("biometria_id") for updated_row in updated)
            ] + updated
            current_rows = [row for row in self.client.profiles if row.get("is_current")]
            self.client.current_profile = current_rows[-1] if current_rows else None
            self.client.closed_payloads.append(self.update_payload)
            return FakeResult(updated)

        if self.insert_payload is not None:
            if self.client.fail_insert:
                return FakeResult([])
            inserted = {
                "biometria_id": f"bio-{len(self.client.inserted_profiles) + 1}",
                **self.insert_payload,
            }
            self.client.profiles = self._profile_rows()
            self.client.profiles.append(inserted)
            self.client.inserted_profiles.append(inserted)
            self.client.current_profile = inserted
            return FakeResult([inserted])

        if self.delete_requested:
            if self.client.fail_delete:
                raise RuntimeError("delete failed")
            to_delete = self._filtered_profile_rows()
            self.client.deleted_profiles.extend(to_delete)
            self.client.profiles = [
                row
                for row in self._profile_rows()
                if not any(row.get("biometria_id") == deleted.get("biometria_id") for deleted in to_delete)
            ]
            current_rows = [row for row in self.client.profiles if row.get("is_current")]
            self.client.current_profile = current_rows[-1] if current_rows else None
            return FakeResult(to_delete)

        rows = self._filtered_profile_rows()
        if self.order_column is not None:
            rows.sort(
                key=lambda row: row.get(self.order_column) or "",
                reverse=self.order_desc,
            )
        return FakeResult(rows)


class FakeRpc:
    def __init__(self, client: "FakeSupabase", name: str, params: dict[str, Any]) -> None:
        self.client = client
        self.name = name
        self.params = params

    def execute(self) -> FakeResult:
        self.client.calls.append(("rpc_execute", self.name, self.params))
        if self.client.fail_rpc:
            raise RuntimeError("rpc failed")
        if self.name != "replace_current_dim_atleta":
            return FakeResult([])

        user_id = self.params["p_user_id"]
        profile = self.params["p_profile"]
        rows = list(self.client.profiles)
        if self.client.current_profile and all(
            row.get("biometria_id") != self.client.current_profile.get("biometria_id")
            for row in rows
        ):
            rows.append(self.client.current_profile)

        for row in rows:
            if row.get("user_id") == user_id and row.get("is_current"):
                row.update({"is_current": False, "valid_to": "rpc-now"})

        inserted = {
            "biometria_id": f"bio-{len(self.client.inserted_profiles) + 1}",
            "user_id": user_id,
            **profile,
            "is_current": True,
        }
        rows.append(inserted)
        self.client.profiles = rows
        self.client.inserted_profiles.append(inserted)
        self.client.current_profile = inserted
        return FakeResult([inserted])


class FakeSupabase:
    def __init__(self, user_id: str = "auth-user") -> None:
        self.auth = FakeAuth(user_id)
        self.calls: list[tuple[Any, ...]] = []
        self.current_profile: dict[str, Any] | None = None
        self.profiles: list[dict[str, Any]] = []
        self.display_name: str | None = "Ada"
        self.inserted_profiles: list[dict[str, Any]] = []
        self.deleted_profiles: list[dict[str, Any]] = []
        self.closed_payloads: list[dict[str, Any]] = []
        self.fail_insert = False
        self.fail_close = False
        self.fail_delete = False
        self.fail_rpc = False
        self.fail_profile_read = False

    def table(self, name: str) -> FakeTable:
        self.calls.append(("table", name))
        return FakeTable(self, name)

    def rpc(self, name: str, params: dict[str, Any]) -> FakeRpc:
        self.calls.append(("rpc", name, params))
        return FakeRpc(self, name, params)


@pytest.fixture()
def profile_client(monkeypatch: pytest.MonkeyPatch) -> tuple[TestClient, FakeSupabase]:
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


def valid_setup_payload(**overrides: Any) -> dict[str, Any]:
    payload = {
        "display_name": "Ada",
        "genero": "mujer",
        "edad": 29,
        "peso": 62.0,
        "altura": 168.0,
        "hombros": 102.0,
        "pecho": 92.0,
        "brazo": 29.0,
        "antebrazo": 24.0,
        "cintura": 72.0,
        "cadera": 102.0,
        "gluteo": 104.0,
        "pierna": 58.0,
        "pantorrilla": 36.0,
        "objetivo_metabolico": "mantenimiento",
        "dias_entrenamiento_semana": 4,
    }
    return payload | overrides


def current_profile(**overrides: Any) -> dict[str, Any]:
    profile = {
        "biometria_id": "bio-current",
        "user_id": "auth-user",
        "genero": "mujer",
        "edad": 29,
        "peso": 62.0,
        "altura": 168.0,
        "hombros": 102.0,
        "pecho": 92.0,
        "brazo": 29.0,
        "antebrazo": 24.0,
        "cintura": 72.0,
        "cadera": 102.0,
        "gluteo": 104.0,
        "pierna": 58.0,
        "pantorrilla": 36.0,
        "objetivo_metabolico": "mantenimiento",
        "dias_entrenamiento_semana": 4,
        "is_current": True,
    }
    return profile | overrides


def history_profile(**overrides: Any) -> dict[str, Any]:
    profile = current_profile(
        biometria_id="bio-history",
        valid_from="2026-06-18T12:00:00Z",
        created_at="2026-06-18T12:00:00Z",
        is_current=False,
    )
    return profile | overrides


def test_profile_me_rejects_missing_token(profile_client: tuple[TestClient, FakeSupabase]) -> None:
    client, _ = profile_client

    response = client.get("/profile/me")

    assert response.status_code == 401


def test_profile_me_returns_controlled_empty_response(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = profile_client
    fake_supabase.current_profile = None

    response = client.get("/profile/me", headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.json() == {"status": "empty", "has_profile": False, "profile": None}


def test_profile_me_returns_current_profile_without_user_id(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = profile_client
    fake_supabase.current_profile = current_profile()

    response = client.get("/profile/me", headers=AUTH_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert body["has_profile"] is True
    assert body["profile"]["display_name"] == "Ada"
    assert body["profile"]["peso"] == 62.0
    assert "user_id" not in body["profile"]


def test_profile_setup_creates_profile_without_client_user_id(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = profile_client
    fake_supabase.current_profile = current_profile()

    response = client.post("/profile/setup", headers=AUTH_HEADERS, json=valid_setup_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["profile"]["display_name"] == "Ada"
    assert body["profile"]["genero"] == "mujer"
    assert body["profile"]["is_current"] is True
    inserted = fake_supabase.inserted_profiles[-1]
    assert inserted["user_id"] == "auth-user"
    assert "display_name" not in inserted
    assert [call[0] for call in fake_supabase.calls if call[0] in {"insert", "update", "delete"}] == []
    assert fake_supabase.calls.count(
        (
            "rpc",
            "replace_current_dim_atleta",
            {
                "p_user_id": "auth-user",
                "p_profile": {
                    "genero": "mujer",
                    "edad": 29,
                    "peso": 62.0,
                    "altura": 168.0,
                    "hombros": 102.0,
                    "pecho": 92.0,
                    "brazo": 29.0,
                    "antebrazo": 24.0,
                    "cintura": 72.0,
                    "cadera": 102.0,
                    "gluteo": 104.0,
                    "pierna": 58.0,
                    "pantorrilla": 36.0,
                    "objetivo_metabolico": "mantenimiento",
                    "dias_entrenamiento_semana": 4,
                },
            },
        )
    ) == 1
    assert [row for row in fake_supabase.profiles if row.get("is_current")] == [inserted]


def test_profile_setup_rpc_failure_keeps_previous_current_open(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = profile_client
    previous = current_profile()
    fake_supabase.current_profile = previous
    fake_supabase.fail_rpc = True

    response = client.post("/profile/setup", headers=AUTH_HEADERS, json=valid_setup_payload())

    assert response.status_code == 500
    assert fake_supabase.current_profile == previous
    assert fake_supabase.closed_payloads == []
    assert fake_supabase.inserted_profiles == []


def test_profile_setup_has_no_compensating_delete_path(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = profile_client
    previous = current_profile()
    fake_supabase.current_profile = previous
    fake_supabase.fail_rpc = True
    fake_supabase.fail_delete = True

    response = client.post("/profile/setup", headers=AUTH_HEADERS, json=valid_setup_payload())

    assert response.status_code == 500
    assert fake_supabase.deleted_profiles == []
    assert fake_supabase.current_profile == previous
    assert [row for row in fake_supabase.profiles if row.get("is_current")] == []


def test_profile_setup_rejects_user_id_body(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, _ = profile_client

    response = client.post(
        "/profile/setup",
        headers=AUTH_HEADERS,
        json=valid_setup_payload(user_id="other-user"),
    )

    assert response.status_code == 422


def test_profile_setup_rejects_invalid_biometrics(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, _ = profile_client

    response = client.post(
        "/profile/setup",
        headers=AUTH_HEADERS,
        json=valid_setup_payload(peso=-1.0),
    )

    assert response.status_code == 422


def test_profile_measurements_create_new_scd2_record(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = profile_client
    fake_supabase.current_profile = current_profile()

    response = client.post(
        "/profile/measurements",
        headers=AUTH_HEADERS,
        json={"peso": 63.5, "cintura": 70.0, "gluteo": 106.0},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["profile"]["peso"] == 63.5
    assert body["profile"]["cintura"] == 70.0
    assert body["profile"]["gluteo"] == 106.0
    inserted = fake_supabase.inserted_profiles[-1]
    assert inserted["user_id"] == "auth-user"
    assert inserted["genero"] == "mujer"
    assert inserted["altura"] == 168.0
    assert inserted["is_current"] is True
    assert [call[0] for call in fake_supabase.calls if call[0] in {"insert", "update", "delete"}] == []
    assert fake_supabase.calls.count(
        (
            "rpc",
            "replace_current_dim_atleta",
            {
                "p_user_id": "auth-user",
                "p_profile": {
                    "genero": "mujer",
                    "edad": 29,
                    "altura": 168.0,
                    "hombros": 102.0,
                    "pecho": 92.0,
                    "brazo": 29.0,
                    "antebrazo": 24.0,
                    "cintura": 70.0,
                    "cadera": 102.0,
                    "gluteo": 106.0,
                    "pierna": 58.0,
                    "pantorrilla": 36.0,
                    "objetivo_metabolico": "mantenimiento",
                    "dias_entrenamiento_semana": 4,
                    "peso": 63.5,
                },
            },
        )
    ) == 1
    assert [row for row in fake_supabase.profiles if row.get("is_current")] == [inserted]


def test_profile_measurements_rpc_failure_keeps_previous_current_open(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = profile_client
    previous = current_profile()
    fake_supabase.current_profile = previous
    fake_supabase.fail_rpc = True

    response = client.post("/profile/measurements", headers=AUTH_HEADERS, json={"peso": 63.5})

    assert response.status_code == 500
    assert fake_supabase.inserted_profiles == []
    assert fake_supabase.deleted_profiles == []
    assert fake_supabase.current_profile == previous
    assert [row for row in fake_supabase.profiles if row.get("is_current")] == []


def test_profile_measurements_do_not_modify_other_user_profile(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = profile_client
    fake_supabase.current_profile = current_profile(user_id="other-user")

    response = client.post(
        "/profile/measurements",
        headers=AUTH_HEADERS,
        json={"peso": 63.5},
    )

    assert response.status_code == 404
    assert fake_supabase.inserted_profiles == []


def test_profile_measurements_reject_user_id_query_and_body(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = profile_client
    fake_supabase.current_profile = current_profile()

    query_response = client.post(
        "/profile/measurements?user_id=other-user",
        headers=AUTH_HEADERS,
        json={"peso": 63.5},
    )
    body_response = client.post(
        "/profile/measurements",
        headers=AUTH_HEADERS,
        json={"user_id": "other-user", "peso": 63.5},
    )

    assert query_response.status_code == 422
    assert body_response.status_code == 422


def test_profile_measurements_reject_invalid_biometrics(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = profile_client
    fake_supabase.current_profile = current_profile()

    response = client.post("/profile/measurements", headers=AUTH_HEADERS, json={"peso": 0})

    assert response.status_code == 422


def test_profile_routes_do_not_print_sensitive_biometrics(
    profile_client: tuple[TestClient, FakeSupabase],
    capsys: pytest.CaptureFixture[str],
) -> None:
    client, _ = profile_client

    response = client.post("/profile/setup", headers=AUTH_HEADERS, json=valid_setup_payload())
    captured = capsys.readouterr()

    assert response.status_code == 200
    assert captured.out == ""
    assert captured.err == ""


def test_profile_history_calculates_female_ratios_and_orders_chronologically(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = profile_client
    fake_supabase.profiles = [
        history_profile(
            biometria_id="newer",
            valid_from="2026-06-18T12:00:00Z",
            hombros=104.0,
            cintura=72.0,
            cadera=96.0,
            is_current=True,
        ),
        history_profile(
            biometria_id="older",
            valid_from="2026-05-18T12:00:00Z",
            hombros=100.0,
            cintura=75.0,
            cadera=100.0,
        ),
    ]

    response = client.get("/profile/history", headers=AUTH_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert body["count"] == 2
    assert [entry["recorded_at"] for entry in body["entries"]] == [
        "2026-05-18T12:00:00Z",
        "2026-06-18T12:00:00Z",
    ]
    assert body["entries"][0]["ratio_simetria"] == 1.0
    assert body["entries"][0]["ratio_curvatura"] == 0.75
    assert body["entries"][1]["ratio_simetria"] == 1.08
    assert body["entries"][1]["ratio_curvatura"] == 0.75
    assert ("eq", "dim_atleta", "user_id", "auth-user") in fake_supabase.calls
    assert ("order", "dim_atleta", "valid_from", False) in fake_supabase.calls


def test_profile_history_calculates_male_ratio_without_curvature(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = profile_client
    fake_supabase.profiles = [
        history_profile(genero="hombre", hombros=138.0, cintura=90.0, cadera=100.0),
    ]

    response = client.get("/profile/history", headers=AUTH_HEADERS)

    assert response.status_code == 200
    entry = response.json()["entries"][0]
    assert entry["ratio_simetria"] == 1.53
    assert entry["ratio_curvatura"] is None


def test_profile_history_returns_controlled_empty_response(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = profile_client
    fake_supabase.profiles = []
    fake_supabase.current_profile = None

    response = client.get("/profile/history", headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.json() == {"status": "empty", "count": 0, "entries": []}


@pytest.mark.parametrize(
    ("headers", "expected_status"),
    [
        ({}, 401),
        ({"Authorization": "Bearer invalid-token"}, 401),
        ({"Authorization": "Bearer expired-token"}, 401),
    ],
)
def test_profile_history_rejects_missing_invalid_or_expired_jwt(
    profile_client: tuple[TestClient, FakeSupabase],
    headers: dict[str, str],
    expected_status: int,
) -> None:
    client, _ = profile_client

    response = client.get("/profile/history", headers=headers)

    assert response.status_code == expected_status


def test_profile_history_rejects_client_user_id_in_query_header_and_body(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, _ = profile_client

    query_response = client.get(
        "/profile/history?user_id=other-user",
        headers=AUTH_HEADERS,
    )
    header_response = client.get(
        "/profile/history",
        headers=AUTH_HEADERS | {"X-User-Id": "other-user"},
    )
    body_response = client.request(
        "GET",
        "/profile/history",
        headers=AUTH_HEADERS,
        json={"user_id": "other-user"},
    )

    assert query_response.status_code == 422
    assert header_response.status_code == 422
    assert body_response.status_code == 422


def test_profile_history_isolates_authenticated_user(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = profile_client
    fake_supabase.profiles = [
        history_profile(biometria_id="own", user_id="auth-user", peso=62.0),
        history_profile(biometria_id="other", user_id="other-user", peso=99.0),
    ]

    response = client.get("/profile/history", headers=AUTH_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 1
    assert body["entries"][0]["peso"] == 62.0
    assert ("eq", "dim_atleta", "user_id", "other-user") not in fake_supabase.calls


def test_profile_history_handles_zero_or_incomplete_measurements(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = profile_client
    fake_supabase.profiles = [
        history_profile(cadera=0.0),
        history_profile(
            biometria_id="missing",
            valid_from="2026-06-19T12:00:00Z",
            hombros=None,
            cintura=None,
            cadera=None,
        ),
    ]

    response = client.get("/profile/history", headers=AUTH_HEADERS)

    assert response.status_code == 200
    for entry in response.json()["entries"]:
        assert entry["ratio_simetria"] is None
        assert entry["ratio_curvatura"] is None


def test_profile_history_response_excludes_internal_identifiers(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = profile_client
    fake_supabase.profiles = [history_profile()]

    response = client.get("/profile/history", headers=AUTH_HEADERS)

    assert response.status_code == 200
    serialized = response.text
    assert "user_id" not in serialized
    assert "biometria_id" not in serialized


def test_profile_history_returns_sanitized_supabase_error(
    profile_client: tuple[TestClient, FakeSupabase],
) -> None:
    client, fake_supabase = profile_client
    fake_supabase.fail_profile_read = True

    response = client.get("/profile/history", headers=AUTH_HEADERS)

    assert response.status_code == 502
    assert response.json() == {"detail": "Could not load biometric history"}
    assert "sensitive database detail" not in response.text


def test_profile_history_does_not_print_sensitive_biometrics(
    profile_client: tuple[TestClient, FakeSupabase],
    capsys: pytest.CaptureFixture[str],
) -> None:
    client, fake_supabase = profile_client
    fake_supabase.profiles = [history_profile()]

    response = client.get("/profile/history", headers=AUTH_HEADERS)
    captured = capsys.readouterr()

    assert response.status_code == 200
    assert captured.out == ""
    assert captured.err == ""
