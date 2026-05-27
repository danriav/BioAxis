# BioAxis Database Contract

## Scope

This contract covers Phase 2 backend entities for biometric metrics, hypertrophy routines, workout logs, and nutrition records. All user-owned tables must carry `user_id`, including child tables such as log entries and performed sets, and must be queried with a deterministic tenant filter.

## Anthropometric Ranges

Anthropometric data is blocked unless it has logical ranges at both validation and persistence layers:

| Field | Range |
| --- | --- |
| `height_cm` | 90-250 |
| `weight_kg` | 25-350 |
| `body_fat_pct` | 3-70 |
| `waist_cm` | 35-220 |
| `hip_cm` | 45-220 |
| `chest_cm` | 45-220 |
| `arm_cm` | 15-80 |
| `thigh_cm` | 25-120 |

## Core Entities

- `users`: app user identity; in Supabase this mirrors `auth.users`.
- `user_profiles`: current baseline biometrics, sex, age, goal, training frequency.
- `anthropometric_measurements`: dated progress snapshots per user.
- `muscle_groups`, `exercises`, `exercise_variants`, and translation tables: global catalogs, not tenant-owned.
- `training_plans`: generated hypertrophy routine metadata.
- `training_sessions`, `session_exercises`, `weekly_volume_caps`: user-scoped prescribed work and weekly set caps.
- `workout_log_sessions` and `workout_log_sets`: execution history for progression.
- `food_items`, `base_meals`, `base_meal_items`, `nutrition_logs`, `nutrition_log_entries`, `nutrition_targets`: nutrition catalog, reusable meals, daily logs, entries, and generated macro targets.
- `sync_queue`: user-scoped offline synchronization queue.

## SQL and ORM Alignment

`backend/sql/schema.sql`, `backend/sql/supabase_schema.sql`, and SQLAlchemy metadata in `backend/app/models` must expose the same canonical table names. Legacy Supabase aliases such as `body_measurements`, `foods`, `daily_logs`, `daily_log_entries`, `workouts`, and `workout_sets` are not part of the current backend contract.

The following tables are global catalogs and do not require tenant ownership:

- `users`
- `muscle_groups`
- `exercises`
- `exercise_variants`
- `exercise_translations`
- `exercise_variant_translations`
- `muscle_group_translations`

Every other table is user-owned and must include `user_id` directly, even when a parent row already carries `user_id`.

## Parent Ownership

Child tables with their own `user_id` and a foreign key to a user-owned parent must not rely only on local `user_id = auth.uid()`. They must also prove parent ownership. The database contract enforces this in two ways:

- composite tenant foreign keys such as `(user_id, log_id)` to `nutrition_logs(user_id, id)`;
- Supabase RLS policies with `EXISTS` checks against the parent table.

This applies to:

- `training_sessions(user_id, plan_id)` -> `training_plans(user_id, id)`
- `session_exercises(user_id, session_id)` -> `training_sessions(user_id, id)`
- `weekly_volume_caps(user_id, plan_id)` -> `training_plans(user_id, id)`
- `workout_log_sessions(user_id, training_session_id)` -> `training_sessions(user_id, id)`
- `workout_log_sets(user_id, log_session_id)` -> `workout_log_sessions(user_id, id)`
- `base_meal_items(user_id, base_meal_id)` -> `base_meals(user_id, id)`
- `nutrition_logs(user_id, cloned_from_log_id)` -> `nutrition_logs(user_id, id)`
- `nutrition_log_entries(user_id, log_id)` -> `nutrition_logs(user_id, id)`
- `nutrition_log_entries(user_id, base_meal_id)` -> `base_meals(user_id, id)` when `base_meal_id` is present

## Supabase RLS

Supabase must enable row-level security for every table. Root user-owned tables use `user_id = auth.uid()` policies for read/write access. Child user-owned tables also use parent `EXISTS` checks in both `USING` and `WITH CHECK`. `food_items` allows catalog reads with `user_id IS NULL OR user_id = auth.uid()` and restricts writes to the owner. Global catalog tables are readable by authenticated users and remain write-controlled outside client policies.

## Indexing

Frequent access paths are indexed on `user_id` plus temporal or status columns:

- `user_profiles(user_id)`
- `anthropometric_measurements(user_id, measured_on)`
- `training_plans(user_id, is_active)`
- `training_sessions(plan_id, day_number)`
- `training_sessions(user_id, day_number)`
- `session_exercises(user_id, session_id)`
- `workout_log_sessions(user_id, started_at)`
- `workout_log_sets(user_id, log_session_id)`
- `food_items(user_id, name_es)`
- `base_meals(user_id, meal_slot)`
- `base_meal_items(user_id, base_meal_id)`
- `nutrition_logs(user_id, log_date)`
- `nutrition_log_entries(user_id, log_id)`
- `nutrition_targets(user_id, effective_date)`

## Service Boundary

Macronutrient formulas and weekly set caps live in `backend/app/services/hypertrophy_engine.py`. FastAPI routes may orchestrate inputs and outputs, but must not embed hypertrophy math or nutrition formulas directly.

## Contract Tests

`backend/tests/test_persistence_contract.py` validates:

- canonical table names match between `schema.sql`, `supabase_schema.sql`, and SQLAlchemy metadata;
- all user-owned SQL tables carry `user_id`;
- Supabase RLS and owner policies exist for user-owned tables;
- child RLS policies validate parent ownership and are not local-`user_id` only;
- critical child tables use composite tenant foreign keys;
- anthropometric ranges are present in both SQL layers.
