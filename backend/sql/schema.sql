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
  biological_sex        TEXT NOT NULL CHECK (biological_sex IN ('male', 'female', 'other')),
  age_years             INTEGER NOT NULL CHECK (age_years BETWEEN 13 AND 100),
  preferred_locale      TEXT NOT NULL DEFAULT 'es',

  height_cm             NUMERIC(5, 2) NOT NULL,
  weight_kg             NUMERIC(6, 2) NOT NULL,
  body_fat_pct          NUMERIC(4, 2),

  femur_length_cm       NUMERIC(5, 2),
  torso_length_cm       NUMERIC(5, 2),
  arm_span_cm           NUMERIC(5, 2),

  fitness_level         TEXT NOT NULL CHECK (fitness_level IN (
                          'beginner', 'intermediate', 'advanced', 'elite'
                        )),
  primary_goal          TEXT NOT NULL CHECK (primary_goal IN (
                          'hypertrophy', 'strength', 'fat_loss', 'maintenance'
                        )),
  training_days_per_week INTEGER NOT NULL DEFAULT 3 CHECK (training_days_per_week BETWEEN 1 AND 7),
  gender_focus          TEXT CHECK (gender_focus IN (
                          'upper_body', 'lower_body', 'balanced'
                        )),

  subscription_tier     TEXT NOT NULL DEFAULT 'free' CHECK (
                          subscription_tier IN ('free', 'premium', 'elite')
                        ),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,

  CONSTRAINT user_profiles_height_cm_check CHECK (height_cm BETWEEN 90 AND 250),
  CONSTRAINT user_profiles_weight_kg_check CHECK (weight_kg BETWEEN 25 AND 350),
  CONSTRAINT user_profiles_body_fat_pct_check CHECK (body_fat_pct IS NULL OR body_fat_pct BETWEEN 3 AND 70),
  CONSTRAINT user_profiles_user_id_key UNIQUE (user_id)
);

CREATE TABLE anthropometric_measurements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id            UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  measured_on           DATE NOT NULL,
  weight_kg             NUMERIC(6, 2) NOT NULL,
  body_fat_pct          NUMERIC(4, 2),
  waist_cm              NUMERIC(5, 2),
  hip_cm                NUMERIC(5, 2),
  chest_cm              NUMERIC(5, 2),
  arm_cm                NUMERIC(5, 2),
  thigh_cm              NUMERIC(5, 2),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT anthropometric_measurements_weight_kg_check CHECK (weight_kg BETWEEN 25 AND 350),
  CONSTRAINT anthropometric_measurements_body_fat_pct_check CHECK (body_fat_pct IS NULL OR body_fat_pct BETWEEN 3 AND 70),
  CONSTRAINT anthropometric_measurements_waist_cm_check CHECK (waist_cm IS NULL OR waist_cm BETWEEN 35 AND 220),
  CONSTRAINT anthropometric_measurements_hip_cm_check CHECK (hip_cm IS NULL OR hip_cm BETWEEN 45 AND 220),
  CONSTRAINT anthropometric_measurements_chest_cm_check CHECK (chest_cm IS NULL OR chest_cm BETWEEN 45 AND 220),
  CONSTRAINT anthropometric_measurements_arm_cm_check CHECK (arm_cm IS NULL OR arm_cm BETWEEN 15 AND 80),
  CONSTRAINT anthropometric_measurements_thigh_cm_check CHECK (thigh_cm IS NULL OR thigh_cm BETWEEN 25 AND 120),
  CONSTRAINT anthropometric_measurements_user_measured_on_key UNIQUE (user_id, measured_on)
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

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  frequency_days      INTEGER NOT NULL CHECK (frequency_days BETWEEN 3 AND 6),
  duration_weeks      INTEGER NOT NULL DEFAULT 8 CHECK (duration_weeks BETWEEN 4 AND 24),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,

  CONSTRAINT training_plans_user_id_id_key UNIQUE (user_id, id)
);

-- ─────────────────────────────────────────
-- TRAINING SESSIONS (days within a plan)
-- ─────────────────────────────────────────
CREATE TABLE training_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id         UUID NOT NULL,

  day_number      INTEGER NOT NULL,
  session_label   TEXT,
  muscle_group_id INTEGER NOT NULL REFERENCES muscle_groups(id),
  prescribed_sets INTEGER NOT NULL CHECK (prescribed_sets BETWEEN 1 AND 8),
  rir_target      INTEGER NOT NULL CHECK (rir_target BETWEEN 0 AND 4),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT training_sessions_day_number_check CHECK (day_number BETWEEN 1 AND 7),
  CONSTRAINT training_sessions_user_id_id_key UNIQUE (user_id, id),
  CONSTRAINT training_sessions_user_plan_day_key UNIQUE (user_id, plan_id, day_number),
  CONSTRAINT training_sessions_user_plan_fk FOREIGN KEY (user_id, plan_id)
    REFERENCES training_plans(user_id, id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- SESSION EXERCISES — Prescribed work
-- ─────────────────────────────────────────
CREATE TABLE session_exercises (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id                UUID NOT NULL,
  exercise_id               UUID REFERENCES exercises(id),
  variant_id                UUID REFERENCES exercise_variants(id),

  exercise_order            INTEGER NOT NULL,
  prescribed_sets           INTEGER NOT NULL CHECK (prescribed_sets BETWEEN 1 AND 8),
  rep_range_min             INTEGER,
  rep_range_max             INTEGER,
  rir_target                INTEGER CHECK (rir_target BETWEEN 0 AND 4),

  rest_seconds              INTEGER NOT NULL DEFAULT 120,
  weekly_set_contribution   INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT session_exercises_user_session_fk FOREIGN KEY (user_id, session_id)
    REFERENCES training_sessions(user_id, id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- WEEKLY VOLUME CAPS — 20-set/week enforcement (DB layer)
-- ─────────────────────────────────────────
CREATE TABLE weekly_volume_caps (
  id                  SERIAL PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id             UUID NOT NULL,
  muscle_group_id     INTEGER NOT NULL REFERENCES muscle_groups(id),

  week_number         INTEGER NOT NULL,
  total_sets          INTEGER NOT NULL DEFAULT 0,
  cap_sets            INTEGER NOT NULL DEFAULT 20,

  CONSTRAINT weekly_volume_caps_user_plan_muscle_week_key UNIQUE (
    user_id, plan_id, muscle_group_id, week_number
  ),
  CONSTRAINT weekly_volume_cap_check CHECK (total_sets <= cap_sets),
  CONSTRAINT weekly_volume_caps_user_plan_fk FOREIGN KEY (user_id, plan_id)
    REFERENCES training_plans(user_id, id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- WORKOUT LOG SESSIONS
-- ─────────────────────────────────────────
CREATE TABLE workout_log_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  training_session_id   UUID,

  started_at            TIMESTAMPTZ NOT NULL,
  completed_at          TIMESTAMPTZ,
  duration_seconds      INTEGER,
  notes                 TEXT,

  client_id             TEXT,
  synced_at             TIMESTAMPTZ,
  local_version         INTEGER NOT NULL DEFAULT 1,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT workout_log_sessions_user_id_id_key UNIQUE (user_id, id),
  CONSTRAINT workout_log_sessions_user_training_session_fk FOREIGN KEY (user_id, training_session_id)
    REFERENCES training_sessions(user_id, id)
);

-- ─────────────────────────────────────────
-- WORKOUT LOG SETS
-- ─────────────────────────────────────────
CREATE TABLE workout_log_sets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_session_id        UUID NOT NULL,
  exercise_id           UUID REFERENCES exercises(id),
  variant_id            UUID REFERENCES exercise_variants(id),

  set_number            INTEGER NOT NULL,
  reps_performed        INTEGER NOT NULL CHECK (reps_performed BETWEEN 1 AND 100),
  weight_kg             NUMERIC(6, 2) NOT NULL CHECK (weight_kg BETWEEN 0 AND 700),
  rir_actual            INTEGER NOT NULL CHECK (rir_actual BETWEEN 0 AND 10),
  rpe_actual            NUMERIC(3, 1) CHECK (rpe_actual BETWEEN 1 AND 10),

  technique_rating      INTEGER CHECK (technique_rating BETWEEN 1 AND 5),
  pain_flag             BOOLEAN NOT NULL DEFAULT FALSE,

  client_id             TEXT,
  synced_at             TIMESTAMPTZ,
  local_version         INTEGER NOT NULL DEFAULT 1,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT workout_log_sets_user_session_fk FOREIGN KEY (user_id, log_session_id)
    REFERENCES workout_log_sessions(user_id, id) ON DELETE CASCADE
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

  calories_per_100g     NUMERIC(7, 2) NOT NULL CHECK (calories_per_100g BETWEEN 0 AND 1000),
  protein_g             NUMERIC(6, 2) NOT NULL CHECK (protein_g BETWEEN 0 AND 100),
  carbs_g               NUMERIC(6, 2) NOT NULL CHECK (carbs_g BETWEEN 0 AND 100),
  fat_g                 NUMERIC(6, 2) NOT NULL CHECK (fat_g BETWEEN 0 AND 100),

  fiber_g               NUMERIC(6, 2),
  sugar_g               NUMERIC(6, 2),
  sodium_mg             NUMERIC(7, 2),
  saturated_fat_g       NUMERIC(6, 2),
  trans_fat_g           NUMERIC(6, 2),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  deleted_at    TIMESTAMPTZ,

  CONSTRAINT base_meals_user_id_id_key UNIQUE (user_id, id)
);

CREATE TABLE base_meal_items (
  id              SERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_meal_id    UUID NOT NULL,
  food_item_id    UUID REFERENCES food_items(id),
  amount_g        NUMERIC(7, 2) NOT NULL,

  CONSTRAINT base_meal_items_user_meal_fk FOREIGN KEY (user_id, base_meal_id)
    REFERENCES base_meals(user_id, id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- NUTRITION LOGS
-- ─────────────────────────────────────────
CREATE TABLE nutrition_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date              DATE NOT NULL,

  cloned_from_log_id    UUID,

  notes                 TEXT,

  client_id             TEXT,
  synced_at             TIMESTAMPTZ,
  local_version         INTEGER NOT NULL DEFAULT 1,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT nutrition_logs_user_id_id_key UNIQUE (user_id, id),
  CONSTRAINT nutrition_logs_user_log_date_key UNIQUE (user_id, log_date),
  CONSTRAINT nutrition_logs_user_cloned_from_fk FOREIGN KEY (user_id, cloned_from_log_id)
    REFERENCES nutrition_logs(user_id, id)
);

-- ─────────────────────────────────────────
-- NUTRITION LOG ENTRIES
-- ─────────────────────────────────────────
CREATE TABLE nutrition_log_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_id                UUID NOT NULL,
  food_item_id          UUID REFERENCES food_items(id),
  base_meal_id          UUID,

  meal_slot             TEXT NOT NULL,
  amount_g              NUMERIC(8, 2) NOT NULL CHECK (amount_g BETWEEN 0.1 AND 10000),
  entry_time            TIME,

  calories              NUMERIC(8, 2) NOT NULL CHECK (calories >= 0),
  protein_g             NUMERIC(7, 2) NOT NULL CHECK (protein_g >= 0),
  carbs_g               NUMERIC(7, 2) NOT NULL CHECK (carbs_g >= 0),
  fat_g                 NUMERIC(7, 2) NOT NULL CHECK (fat_g >= 0),
  fiber_g               NUMERIC(6, 2),
  sugar_g               NUMERIC(6, 2),
  sodium_mg             NUMERIC(7, 2),
  saturated_fat_g       NUMERIC(6, 2),
  trans_fat_g           NUMERIC(6, 2),

  client_id             TEXT,
  synced_at             TIMESTAMPTZ,
  local_version         INTEGER NOT NULL DEFAULT 1,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT nutrition_log_entries_user_log_fk FOREIGN KEY (user_id, log_id)
    REFERENCES nutrition_logs(user_id, id) ON DELETE CASCADE,
  CONSTRAINT nutrition_log_entries_user_base_meal_fk FOREIGN KEY (user_id, base_meal_id)
    REFERENCES base_meals(user_id, id)
);

-- ─────────────────────────────────────────
-- NUTRITION TARGETS
-- ─────────────────────────────────────────
CREATE TABLE nutrition_targets (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  effective_date          DATE NOT NULL,

  calories_target         INTEGER NOT NULL CHECK (calories_target BETWEEN 900 AND 7000),
  protein_g_target        NUMERIC(6, 2) NOT NULL CHECK (protein_g_target BETWEEN 20 AND 400),
  carbs_g_target          NUMERIC(6, 2) NOT NULL CHECK (carbs_g_target BETWEEN 0 AND 900),
  fat_g_target            NUMERIC(6, 2) NOT NULL CHECK (fat_g_target BETWEEN 20 AND 250),
  fiber_g_min             NUMERIC(6, 2),
  sugar_g_max             NUMERIC(6, 2),
  sodium_mg_max           NUMERIC(7, 2),
  saturated_fat_g_max     NUMERIC(6, 2),
  trans_fat_g_max         NUMERIC(6, 2) NOT NULL DEFAULT 2.0,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
CREATE INDEX idx_user_profiles_user_id ON user_profiles (user_id);
CREATE INDEX idx_anthropometric_measurements_user_date ON anthropometric_measurements (user_id, measured_on);
CREATE INDEX idx_training_plans_user_active ON training_plans (user_id, is_active);
CREATE INDEX idx_training_sessions_plan_day ON training_sessions (plan_id, day_number);
CREATE INDEX idx_training_sessions_user_day ON training_sessions (user_id, day_number);
CREATE INDEX idx_session_exercises_user_session ON session_exercises (user_id, session_id);
CREATE INDEX idx_workout_log_sessions_user_started ON workout_log_sessions (user_id, started_at);
CREATE INDEX idx_workout_log_sets_user_session ON workout_log_sets (user_id, log_session_id);
CREATE INDEX idx_food_items_user_name ON food_items (user_id, name_es);
CREATE INDEX idx_base_meals_user_slot ON base_meals (user_id, meal_slot);
CREATE INDEX idx_base_meal_items_user_meal ON base_meal_items (user_id, base_meal_id);
CREATE INDEX idx_nutrition_logs_user_date ON nutrition_logs (user_id, log_date);
CREATE INDEX idx_nutrition_entries_user_log ON nutrition_log_entries (user_id, log_id);
CREATE INDEX idx_nutrition_targets_user_date ON nutrition_targets (user_id, effective_date);
