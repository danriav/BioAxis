"""Persistence contract checks across SQL, Supabase SQL, and SQLAlchemy."""

from __future__ import annotations

import re
from pathlib import Path

import app.models  # noqa: F401 - imports all model modules into Base metadata
from app.db.session import Base


BACKEND_ROOT = Path(__file__).resolve().parents[1]
SQL_DIR = BACKEND_ROOT / "sql"

CATALOG_TABLES = {
    "users",
    "muscle_groups",
    "exercises",
    "exercise_variants",
    "exercise_translations",
    "exercise_variant_translations",
    "muscle_group_translations",
}

CHILD_PARENT_POLICIES = {
    "training_sessions_own": "public.training_plans",
    "session_exercises_own": "public.training_sessions",
    "weekly_volume_caps_own": "public.training_plans",
    "workout_log_sessions_own": "public.training_sessions",
    "workout_log_sets_own": "public.workout_log_sessions",
    "base_meal_items_own": "public.base_meals",
    "nutrition_logs_own": "public.nutrition_logs",
    "nutrition_log_entries_own": "public.nutrition_logs",
}

COMPOSITE_TENANT_FKS = [
    "FOREIGN KEY (user_id, plan_id)",
    "FOREIGN KEY (user_id, session_id)",
    "FOREIGN KEY (user_id, log_session_id)",
    "FOREIGN KEY (user_id, base_meal_id)",
    "FOREIGN KEY (user_id, cloned_from_log_id)",
    "FOREIGN KEY (user_id, log_id)",
    "FOREIGN KEY (user_id, training_session_id)",
    "CONSTRAINT nutrition_log_entries_user_base_meal_fk FOREIGN KEY (user_id, base_meal_id)",
]


def _table_names(sql_text: str) -> set[str]:
    return set(re.findall(r"CREATE TABLE (?:public\.)?(\w+)", sql_text))


def _table_blocks(sql_text: str) -> dict[str, str]:
    return dict(re.findall(r"CREATE TABLE (?:public\.)?(\w+) \((.*?)\n\);", sql_text, re.S))


def _policy_block(sql_text: str, policy_name: str) -> str:
    match = re.search(
        rf"CREATE POLICY {policy_name}\b.*?;",
        sql_text,
        flags=re.S,
    )
    assert match is not None, f"Missing policy {policy_name}"
    return match.group(0)


def test_schema_and_supabase_table_names_match_sqlalchemy_metadata() -> None:
    schema = (SQL_DIR / "schema.sql").read_text(encoding="utf-8")
    supabase = (SQL_DIR / "supabase_schema.sql").read_text(encoding="utf-8")
    orm_tables = set(Base.metadata.tables)

    assert _table_names(schema) == _table_names(supabase)
    assert _table_names(schema) == orm_tables


def test_all_user_owned_sql_tables_carry_user_id() -> None:
    schema = (SQL_DIR / "schema.sql").read_text(encoding="utf-8")
    blocks = _table_blocks(schema)
    missing_user_id = [
        table_name
        for table_name, table_sql in blocks.items()
        if table_name not in CATALOG_TABLES and "user_id" not in table_sql
    ]

    assert missing_user_id == []


def test_supabase_has_rls_and_owner_policy_for_user_owned_tables() -> None:
    supabase = (SQL_DIR / "supabase_schema.sql").read_text(encoding="utf-8")
    blocks = _table_blocks(supabase)

    for table_name in blocks:
        assert f"ALTER TABLE public.{table_name} ENABLE ROW LEVEL SECURITY;" in supabase
        if table_name not in CATALOG_TABLES and table_name != "food_items":
            assert f"CREATE POLICY {table_name}_own ON public.{table_name}" in supabase

    assert "CREATE POLICY food_items_select_visible ON public.food_items" in supabase
    assert "CREATE POLICY food_items_insert_own ON public.food_items" in supabase
    assert "CREATE POLICY food_items_update_own ON public.food_items" in supabase


def test_child_rls_policies_validate_parent_ownership() -> None:
    supabase = (SQL_DIR / "supabase_schema.sql").read_text(encoding="utf-8")

    for policy_name, parent_table in CHILD_PARENT_POLICIES.items():
        policy = _policy_block(supabase, policy_name)
        assert "user_id = auth.uid()" in policy
        assert "EXISTS (" in policy
        assert parent_table in policy
        assert "WITH CHECK" in policy

    nutrition_entry_policy = _policy_block(supabase, "nutrition_log_entries_own")
    assert "base_meal_id IS NULL" in nutrition_entry_policy
    assert "public.base_meals" in nutrition_entry_policy
    assert "bm.id = base_meal_id" in nutrition_entry_policy
    assert "bm.user_id = auth.uid()" in nutrition_entry_policy


def test_child_tables_use_composite_tenant_foreign_keys() -> None:
    schema = (SQL_DIR / "schema.sql").read_text(encoding="utf-8")
    supabase = (SQL_DIR / "supabase_schema.sql").read_text(encoding="utf-8")

    for expected_fk in COMPOSITE_TENANT_FKS:
        assert expected_fk in schema
        assert expected_fk in supabase


def test_anthropometric_ranges_are_consistent_in_sql_layers() -> None:
    schema = (SQL_DIR / "schema.sql").read_text(encoding="utf-8")
    supabase = (SQL_DIR / "supabase_schema.sql").read_text(encoding="utf-8")
    expected_ranges = [
        "height_cm BETWEEN 90 AND 250",
        "weight_kg BETWEEN 25 AND 350",
        "body_fat_pct IS NULL OR body_fat_pct BETWEEN 3 AND 70",
        "waist_cm IS NULL OR waist_cm BETWEEN 35 AND 220",
        "hip_cm IS NULL OR hip_cm BETWEEN 45 AND 220",
        "chest_cm IS NULL OR chest_cm BETWEEN 45 AND 220",
        "arm_cm IS NULL OR arm_cm BETWEEN 15 AND 80",
        "thigh_cm IS NULL OR thigh_cm BETWEEN 25 AND 120",
    ]

    for expected_range in expected_ranges:
        assert expected_range in schema
        assert expected_range in supabase


def test_dim_atleta_replacement_rpc_is_backend_only() -> None:
    rpc_sql = (SQL_DIR / "replace_current_dim_atleta_rpc.sql").read_text(encoding="utf-8")
    function_signature = "public.replace_current_dim_atleta(uuid, jsonb)"

    assert "CREATE OR REPLACE FUNCTION public.replace_current_dim_atleta(" in rpc_sql
    assert "p_user_id uuid" in rpc_sql
    assert "p_profile jsonb" in rpc_sql
    assert "SECURITY DEFINER" in rpc_sql
    assert "pg_advisory_xact_lock" in rpc_sql
    assert f"REVOKE ALL ON FUNCTION {function_signature} FROM PUBLIC;" in rpc_sql
    assert f"REVOKE ALL ON FUNCTION {function_signature} FROM anon;" in rpc_sql
    assert f"REVOKE ALL ON FUNCTION {function_signature} FROM authenticated;" in rpc_sql
    assert f"GRANT EXECUTE ON FUNCTION {function_signature} TO service_role;" in rpc_sql
    assert "GRANT EXECUTE ON FUNCTION public.replace_current_dim_atleta(uuid, jsonb) TO anon;" not in rpc_sql
    assert (
        "GRANT EXECUTE ON FUNCTION public.replace_current_dim_atleta(uuid, jsonb) TO authenticated;"
        not in rpc_sql
    )
