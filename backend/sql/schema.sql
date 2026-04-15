-- HealthTech Ecosystem — PostgreSQL schema (English identifiers)
-- Timestamps: TIMESTAMPTZ (UTC). UUIDs: gen_random_uuid().
-- Aligns with blueprint.md section 1 and .cursorrules database rules.

-- ─────────────────────────────────────────
-- USERS (aligned with Supabase Auth or standalone app users)
-- ─────────────────────────────────────────
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- USER PROFILES — Anthropometric & preferences
-- ─────────────────────────────────────────
CREATE TABLE user_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  display_name          TEXT NOT NULL,
  birth_date            DATE,
  biological_sex        TEXT CHECK (biological_sex IN ('male', 'female', 'other')),
  preferred_locale      TEXT NOT NULL DEFAULT 'es',

  height_cm             NUMERIC(5, 2),
  weight_kg             NUMERIC(5, 2),
  body_fat_pct          NUMERIC(4, 2),

  femur_length_cm       NUMERIC(5, 2),
  torso_length_cm       NUMERIC(5, 2),
  arm_span_cm           NUMERIC(5, 2),

  fitness_level         TEXT CHECK (fitness_level IN (
                          'beginner', 'intermediate', 'advanced', 'elite'
                        )),
  primary_goal          TEXT CHECK (primary_goal IN (
                          'hypertrophy', 'strength', 'fat_loss',
                          'endurance', 'general_health', 'sport_performance'
                        )),
  gender_focus          TEXT CHECK (gender_focus IN (
                          'upper_body', 'lower_body', 'balanced'
                        )),

  subscription_tier     TEXT NOT NULL DEFAULT 'free' CHECK (
                          subscription_tier IN ('free', 'premium', 'elite')
                        ),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,

  CONSTRAINT user_profiles_user_id_key UNIQUE (user_id)
);

-- ─────────────────────────────────────────
-- MUSCLE GROUPS
-- ─────────────────────────────────────────
CREATE TABLE muscle_groups (
  id          SERIAL PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,
  body_region TEXT NOT NULL CHECK (body_region IN ('upper_body', 'lower_body', 'core'))
);

-- ─────────────────────────────────────────
-- EXERCISES — Core catalog
-- ─────────────────────────────────────────
CREATE TABLE exercises (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  canonical_name        TEXT UNIQUE NOT NULL,
  equipment_type        TEXT CHECK (equipment_type IN (
                          'barbell', 'dumbbell', 'cable', 'machine',
                          'bodyweight', 'resistance_band', 'kettlebell', 'smith_machine'
                        )),
  movement_pattern      TEXT CHECK (movement_pattern IN (
                          'squat', 'hinge', 'push_horizontal', 'push_vertical',
                          'pull_horizontal', 'pull_vertical', 'lunge', 'carry', 'isolation'
                        )),

  primary_muscle_group  INTEGER REFERENCES muscle_groups(id),
  joint_complexity      INTEGER CHECK (joint_complexity BETWEEN 1 AND 3),

  allows_quad_focus     BOOLEAN NOT NULL DEFAULT FALSE,
  allows_glute_focus    BOOLEAN NOT NULL DEFAULT FALSE,

  is_bilateral          BOOLEAN NOT NULL DEFAULT TRUE,
  requires_spotter      BOOLEAN NOT NULL DEFAULT FALSE,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- EXERCISE VARIANTS — Biomechanical setup per focus
-- ─────────────────────────────────────────
CREATE TABLE exercise_variants (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id               UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,

  variant_key               TEXT NOT NULL,

  knee_travel_past_toe      BOOLEAN,
  shin_angle_target_deg     NUMERIC(4, 1),
  hip_hinge_depth_desc      TEXT CHECK (
                              hip_hinge_depth_desc IS NULL OR hip_hinge_depth_desc IN (
                                'minimal', 'moderate', 'deep'
                              )
                            ),
  torso_lean_target_deg     NUMERIC(4, 1),

  stance_width_modifier     TEXT CHECK (
                              stance_width_modifier IS NULL OR stance_width_modifier IN (
                                'narrow', 'hip_width', 'wide', 'sumo'
                              )
                            ),
  foot_elevation_mm         INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT exercise_variants_exercise_variant_key UNIQUE (exercise_id, variant_key)
);

-- ─────────────────────────────────────────
-- EXERCISE TRANSLATIONS (i18n)
-- ─────────────────────────────────────────
CREATE TABLE exercise_translations (
  id             SERIAL PRIMARY KEY,
  exercise_id    UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  locale          TEXT NOT NULL,

  display_name    TEXT NOT NULL,
  description     TEXT,
  execution_cues  TEXT[],

  CONSTRAINT exercise_translations_exercise_locale_key UNIQUE (exercise_id, locale)
);

CREATE TABLE exercise_variant_translations (
  id             SERIAL PRIMARY KEY,
  variant_id     UUID NOT NULL REFERENCES exercise_variants(id) ON DELETE CASCADE,
  locale          TEXT NOT NULL,

  display_name    TEXT NOT NULL,
  setup_cues      TEXT[],

  CONSTRAINT exercise_variant_translations_variant_locale_key UNIQUE (variant_id, locale)
);

CREATE TABLE muscle_group_translations (
  id               SERIAL PRIMARY KEY,
  muscle_group_id  INTEGER NOT NULL REFERENCES muscle_groups(id) ON DELETE CASCADE,
  locale           TEXT NOT NULL,
  display_name     TEXT NOT NULL,
  CONSTRAINT muscle_group_translations_group_locale_key UNIQUE (muscle_group_id, locale)
);

-- ─────────────────────────────────────────
-- TRAINING PLANS
-- ─────────────────────────────────────────
CREATE TABLE training_plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  plan_name           TEXT NOT NULL,
  frequency_days      INTEGER NOT NULL CHECK (frequency_days BETWEEN 3 AND 5),
  duration_weeks      INTEGER NOT NULL DEFAULT 8,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- TRAINING SESSIONS (days within a plan)
-- ─────────────────────────────────────────
CREATE TABLE training_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,

  day_number      INTEGER NOT NULL,
  session_label   TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- SESSION EXERCISES — Prescribed work
-- ─────────────────────────────────────────
CREATE TABLE session_exercises (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  exercise_id               UUID REFERENCES exercises(id),
  variant_id                UUID REFERENCES exercise_variants(id),

  exercise_order            INTEGER NOT NULL,
  prescribed_sets           INTEGER NOT NULL CHECK (prescribed_sets BETWEEN 1 AND 8),
  rep_range_min             INTEGER,
  rep_range_max             INTEGER,
  rir_target                INTEGER CHECK (rir_target BETWEEN 0 AND 4),

  rest_seconds              INTEGER NOT NULL DEFAULT 120,
  weekly_set_contribution   INTEGER NOT NULL DEFAULT 1
);

-- ─────────────────────────────────────────
-- WEEKLY VOLUME CAPS — 20-set/week enforcement (DB layer)
-- ─────────────────────────────────────────
CREATE TABLE weekly_volume_caps (
  id                  SERIAL PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id             UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  muscle_group_id     INTEGER NOT NULL REFERENCES muscle_groups(id),

  week_number         INTEGER NOT NULL,
  total_sets          INTEGER NOT NULL DEFAULT 0,
  cap_sets            INTEGER NOT NULL DEFAULT 20,

  CONSTRAINT weekly_volume_caps_user_plan_muscle_week_key UNIQUE (
    user_id, plan_id, muscle_group_id, week_number
  ),
  CONSTRAINT weekly_volume_cap_check CHECK (total_sets <= cap_sets)
);

-- ─────────────────────────────────────────
-- WORKOUT LOG SESSIONS
-- ─────────────────────────────────────────
CREATE TABLE workout_log_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  training_session_id   UUID REFERENCES training_sessions(id),

  started_at            TIMESTAMPTZ NOT NULL,
  completed_at          TIMESTAMPTZ,
  duration_seconds      INTEGER,
  notes                 TEXT,

  client_id             TEXT,
  synced_at             TIMESTAMPTZ,
  local_version         INTEGER NOT NULL DEFAULT 1,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- WORKOUT LOG SETS
-- ─────────────────────────────────────────
CREATE TABLE workout_log_sets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_session_id        UUID NOT NULL REFERENCES workout_log_sessions(id) ON DELETE CASCADE,
  exercise_id           UUID REFERENCES exercises(id),
  variant_id            UUID REFERENCES exercise_variants(id),

  set_number            INTEGER NOT NULL,
  reps_performed        INTEGER,
  weight_kg             NUMERIC(6, 2),
  rir_actual            INTEGER CHECK (rir_actual BETWEEN 0 AND 10),
  rpe_actual            NUMERIC(3, 1) CHECK (rpe_actual BETWEEN 1 AND 10),

  technique_rating      INTEGER CHECK (technique_rating BETWEEN 1 AND 5),
  pain_flag             BOOLEAN NOT NULL DEFAULT FALSE,

  client_id             TEXT,
  synced_at             TIMESTAMPTZ,
  local_version         INTEGER NOT NULL DEFAULT 1,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- FOOD ITEMS
-- ─────────────────────────────────────────
CREATE TABLE food_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id),
  source                TEXT NOT NULL DEFAULT 'custom' CHECK (
                          source IN ('custom', 'open_food_facts', 'usda')
                        ),
  external_id           TEXT,

  name_es               TEXT NOT NULL,
  name_en               TEXT,
  brand                 TEXT,

  calories_per_100g     NUMERIC(7, 2),
  protein_g             NUMERIC(6, 2),
  carbs_g               NUMERIC(6, 2),
  fat_g                 NUMERIC(6, 2),

  fiber_g               NUMERIC(6, 2),
  sugar_g               NUMERIC(6, 2),
  sodium_mg             NUMERIC(7, 2),
  saturated_fat_g       NUMERIC(6, 2),
  trans_fat_g           NUMERIC(6, 2),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- BASE MEALS
-- ─────────────────────────────────────────
CREATE TABLE base_meals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_name     TEXT NOT NULL,
  meal_slot     TEXT CHECK (meal_slot IN (
                  'breakfast', 'mid_morning', 'lunch', 'snack',
                  'dinner', 'post_workout', 'pre_workout'
                )),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE base_meal_items (
  id              SERIAL PRIMARY KEY,
  base_meal_id    UUID NOT NULL REFERENCES base_meals(id) ON DELETE CASCADE,
  food_item_id    UUID REFERENCES food_items(id),
  amount_g        NUMERIC(7, 2) NOT NULL
);

-- ─────────────────────────────────────────
-- NUTRITION LOGS
-- ─────────────────────────────────────────
CREATE TABLE nutrition_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date              DATE NOT NULL,

  cloned_from_log_id    UUID REFERENCES nutrition_logs(id),

  notes                 TEXT,

  client_id             TEXT,
  synced_at             TIMESTAMPTZ,
  local_version         INTEGER NOT NULL DEFAULT 1,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT nutrition_logs_user_log_date_key UNIQUE (user_id, log_date)
);

-- ─────────────────────────────────────────
-- NUTRITION LOG ENTRIES
-- ─────────────────────────────────────────
CREATE TABLE nutrition_log_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id                UUID NOT NULL REFERENCES nutrition_logs(id) ON DELETE CASCADE,
  food_item_id          UUID REFERENCES food_items(id),
  base_meal_id          UUID REFERENCES base_meals(id),

  meal_slot             TEXT,
  amount_g              NUMERIC(7, 2) NOT NULL,
  entry_time            TIME,

  calories              NUMERIC(7, 2),
  protein_g             NUMERIC(6, 2),
  carbs_g               NUMERIC(6, 2),
  fat_g                 NUMERIC(6, 2),
  fiber_g               NUMERIC(6, 2),
  sugar_g               NUMERIC(6, 2),
  sodium_mg             NUMERIC(7, 2),
  saturated_fat_g       NUMERIC(6, 2),
  trans_fat_g           NUMERIC(6, 2),

  client_id             TEXT,
  synced_at             TIMESTAMPTZ,
  local_version         INTEGER NOT NULL DEFAULT 1,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- NUTRITION TARGETS
-- ─────────────────────────────────────────
CREATE TABLE nutrition_targets (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  effective_date          DATE NOT NULL,

  calories_target         INTEGER,
  protein_g_target        NUMERIC(6, 2),
  carbs_g_target          NUMERIC(6, 2),
  fat_g_target            NUMERIC(6, 2),
  fiber_g_min             NUMERIC(6, 2),
  sugar_g_max             NUMERIC(6, 2),
  sodium_mg_max           NUMERIC(7, 2),
  saturated_fat_g_max     NUMERIC(6, 2),
  trans_fat_g_max         NUMERIC(6, 2) NOT NULL DEFAULT 2.0,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT nutrition_targets_user_effective_date_key UNIQUE (user_id, effective_date)
);

-- ─────────────────────────────────────────
-- SYNC QUEUE
-- ─────────────────────────────────────────
CREATE TABLE sync_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id       TEXT NOT NULL,

  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  operation       TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  payload         JSONB NOT NULL,

  status          TEXT NOT NULL DEFAULT 'pending' CHECK (
                    status IN ('pending', 'processing', 'synced', 'conflict', 'failed')
                  ),
  conflict_data   JSONB,
  retry_count     INTEGER NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);

CREATE INDEX idx_sync_queue_user_status ON sync_queue (user_id, status);
CREATE INDEX idx_sync_queue_entity ON sync_queue (entity_type, entity_id);
