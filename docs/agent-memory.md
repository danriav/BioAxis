# Agent Memory

## 2026-05-23 - DevOps documentation normalization

Scope completed:

- Added root `.env.example` as a non-secret inventory of backend and frontend
  configuration keys.
- Documented that runtime files remain `backend/.env` and
  `frontend/.env.local`, matching `docker-compose.yml`.
- Added required documentation files:
  - `docs/architecture.md`
  - `docs/setup.md`
  - `docs/development-guide.md`
  - `docs/deployment.md`
  - `docs/agent-memory.md`

Current repository observations:

- `backend/` already contains functional FastAPI code and must be treated as a
  protected implementation area for scaffolding tasks.
- `frontend/` already contains functional Next.js code and must be treated as a
  protected implementation area for scaffolding tasks.
- Existing docs before this block included `docs/api.md`,
  `docs/database.md`, `docs/security.md`, and `docs/testing.md`.
- `backend/.env.example` already existed and remains the backend-local example.
- No business logic, API contract, or database design changes were made in this
  block.

Operational risks to carry forward:

- Full backend startup currently requires Supabase backend credentials at import
  time through `backend/app/main.py`.
- The frontend references browser-safe Supabase variables and
  `NEXT_PUBLIC_PYTHON_API_URL`.
- The frontend chat route references `GOOGLE_GENERATIVE_AI_API_KEY`; ownership
  of AI paths should remain explicit before deployment.

Recommended next validation:

- Run a secret scan on tracked changes before commit.
- Verify that local startup docs match the active development workflow after
  any future changes to `docker-compose.yml`, backend settings, or frontend
  environment access.

## 2026-05-23 - Persistence contract closure

Scope completed:

- Closed persistence consistency across `backend/sql/schema.sql`,
  `backend/sql/supabase_schema.sql`, SQLAlchemy models, Pydantic schemas, and
  `docs/database.md`.
- Aligned Supabase table names with the canonical backend contract:
  `user_profiles`, `food_items`, `nutrition_logs`,
  `nutrition_log_entries`, `workout_log_sessions`, and `workout_log_sets`.
- Removed legacy Supabase naming from the active contract:
  `body_measurements`, `foods`, `daily_logs`, `daily_log_entries`,
  `workouts`, and `workout_sets`.
- Materialized `user_id` on all user-owned child entities, including
  `training_sessions`, `session_exercises`, `workout_log_sets`,
  `base_meal_items`, and `nutrition_log_entries`.
- Added SQLAlchemy coverage for canonical persistence tables, including
  core sync, exercise catalog, training prescription, base meals, and
  nutrition log entities.
- Added strict Pydantic schemas for newly covered persistence writes.
- Added `backend/tests/test_persistence_contract.py` to compare SQL table names
  against SQLAlchemy metadata, verify `user_id` on user-owned SQL tables,
  verify Supabase RLS policy presence, and lock anthropometric range checks.

Validation result:

- `python -m pytest` from `backend/`: 23 passed.
- Service coverage gate remained above the configured 80% threshold.

Boundaries respected:

- No frontend files were touched.
- No Gemini logic, keys, runtime secrets, or configuration files were changed
  in this persistence closure.

## 2026-05-25 - P0 multi-tenant child ownership closure

Scope completed:

- Fixed the P0 isolation gap where child tables with their own `user_id` could
  still point at a parent row owned by another tenant.
- Added composite tenant foreign keys for critical child relationships:
  `training_sessions`, `session_exercises`, `weekly_volume_caps`,
  `workout_log_sessions`, `workout_log_sets`, `base_meal_items`,
  `nutrition_logs.cloned_from_log_id`, and `nutrition_log_entries`.
- Updated Supabase RLS policies so child tables validate both local
  `user_id = auth.uid()` and parent ownership through `EXISTS` checks in
  `USING` and `WITH CHECK`.
- Updated SQLAlchemy models to mirror the composite tenant foreign keys.
- Extended `backend/tests/test_persistence_contract.py` so it fails if a child
  policy regresses to local `user_id` checks only or if a required composite
  tenant FK is missing.
- Updated `docs/database.md` with the parent ownership rule.

Validation result:

- `python -m pytest` from `backend/`: 25 passed.
- Service coverage gate remained above the configured 80% threshold.

Boundaries respected:

- No frontend files were touched.
- No Gemini logic, runtime secrets, API keys, or configuration files were
  changed in this P0 fix.

## 2026-05-25 - Nutrition entry base meal ownership closure

Scope completed:

- Closed the remaining tenant isolation gap on
  `nutrition_log_entries.base_meal_id`.
- Added the composite FK
  `nutrition_log_entries(user_id, base_meal_id) -> base_meals(user_id, id)`.
- Updated `nutrition_log_entries_own` RLS so non-null `base_meal_id` must pass
  an `EXISTS` ownership check against `public.base_meals`.
- Updated SQLAlchemy with the same composite foreign key.
- Extended `backend/tests/test_persistence_contract.py` to require the
  `nutrition_log_entries_user_base_meal_fk` constraint and the base-meal
  ownership check inside `nutrition_log_entries_own`.

Validation result:

- `python -m pytest` from `backend/`: 25 passed.
- Service coverage gate remained above the configured 80% threshold.

Boundaries respected:

- No frontend files were touched.
- No Gemini logic, runtime secrets, or API keys were changed.

## 2026-05-27 - Real Supabase nutrition contract alignment

Scope completed:

- Documented the provided real Supabase shape in
  `docs/database-introspection.md`.
- Confirmed real `catalog_foods` nutrient column names, including
  `potassium_mg_per_g` and `vitamin_c_mg_per_g`.
- Updated the backend `FoodSearchItem` response contract to mirror real
  `catalog_foods` columns.
- Preserved frontend/backend numeric behavior by allowing Pydantic response
  serialization to coerce valid numeric text from `calories_per_g` into a JSON
  number.
- Confirmed the active `nutrition_logs` persistence payload uses `user_id`,
  `food_id`, `meal_slot`, `quantity_g`, and `consumed_at`.

Open migration proposal:

- `catalog_foods.calories_per_g` is currently `text`, while app calculations
  require a numeric value. Proposed migration is to convert it to
  `double precision` after a read-only audit of non-numeric rows.
- No destructive migration was executed.

Validation result:

- Backend tests were run after the contract update.

## 2026-05-23 - Post-rotation documentation hardening

Scope completed:

- Confirmed the approved local runtime files are `backend/.env` for FastAPI and
  `frontend/.env.local` for Next.js.
- Documented that `backend/app/.env` is forbidden and must not be created,
  copied, mounted, loaded, or used by scripts.
- Added `docs/security-audit-report.md` to capture the Auditor follow-up
  expected by the security-audit workflow.
- Updated setup, security, development, deployment, and testing documentation
  with post-rotation guardrails.
- Updated repository ignore policy to explicitly block `backend/app/.env` while
  preserving committed `.env.example` files.

Incident record:

- A credential-handling incident was acknowledged for Supabase and Gemini
  secrets.
- Supabase and Gemini credentials are recorded as rotated outside the
  repository.
- No credential values are recorded in documentation or examples.
- The Auditor is partially unblocked for documentation and configuration-base
  work only.

Remaining gate:

- Full Auditor unblock still requires a clean secret scan over tracked changes
  and any untracked files intended for commit.
