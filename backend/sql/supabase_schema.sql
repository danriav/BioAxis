-- =============================================================================
-- HealthTech Ecosystem — Supabase SQL (derived from blueprint.md)
-- Run in Supabase SQL Editor (requires auth schema).
--
-- Physical tables:
--   public.users              — 1:1 with auth.users; premium via subscription_tier
--   public.body_measurements  — anthropometry & preferences (ex user_profiles body)
--   public.muscle_groups      — catalog FK for exercises.primary_muscle_group
--   public.foods              — food catalog (ex food_items)
--   public.daily_logs         — daily nutrition header (ex nutrition_logs)
--   public.daily_log_entries  — line items (ex nutrition_log_entries)
--   public.exercises          — catalog + focus_variant (quad / glute / neutral)
--   public.workouts           — workout sessions (ex workout_log_sessions)
--   public.workout_sets       — performed sets (ex workout_log_sets)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Lookup: muscle groups (blueprint §1.2 — required FK target for exercises)
-- -----------------------------------------------------------------------------
CREATE TABLE public.muscle_groups (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  body_region TEXT NOT NULL CHECK (body_region IN ('upper_body', 'lower_body', 'core'))
);

-- -----------------------------------------------------------------------------
-- Users — premium status on row; id mirrors auth.users
-- -----------------------------------------------------------------------------
CREATE TABLE public.users (
  id                  UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email               TEXT NOT NULL UNIQUE,
  subscription_tier   TEXT NOT NULL DEFAULT 'free' CHECK (
                        subscription_tier IN ('free', 'premium', 'elite')
                      ),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- Body measurements — demographics + anthropometry + fitness prefs
-- (maps blueprint user_profiles body / preference fields)
-- -----------------------------------------------------------------------------
CREATE TABLE public.body_measurements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,

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

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,

  CONSTRAINT body_measurements_user_id_key UNIQUE (user_id)
);

-- -----------------------------------------------------------------------------
-- Foods — custom + external sources (maps blueprint food_items)
-- -----------------------------------------------------------------------------
CREATE TABLE public.foods (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES public.users (id),
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

-- -----------------------------------------------------------------------------
-- Daily logs — one row per user per calendar day (maps nutrition_logs)
-- -----------------------------------------------------------------------------
CREATE TABLE public.daily_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  log_date              DATE NOT NULL,

  cloned_from_log_id    UUID REFERENCES public.daily_logs (id),

  notes                 TEXT,

  client_id             TEXT,
  synced_at             TIMESTAMPTZ,
  local_version         INTEGER NOT NULL DEFAULT 1,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT daily_logs_user_log_date_key UNIQUE (user_id, log_date)
);

-- -----------------------------------------------------------------------------
-- Daily log entries — food lines + denormalized nutrients (maps nutrition_log_entries)
-- -----------------------------------------------------------------------------
CREATE TABLE public.daily_log_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id                UUID NOT NULL REFERENCES public.daily_logs (id) ON DELETE CASCADE,
  food_id               UUID REFERENCES public.foods (id),

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

-- -----------------------------------------------------------------------------
-- Exercises — catalog + focus_variant (default / primary biomechanical focus)
-- -----------------------------------------------------------------------------
CREATE TABLE public.exercises (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  canonical_name        TEXT NOT NULL UNIQUE,
  equipment_type        TEXT CHECK (equipment_type IN (
                          'barbell', 'dumbbell', 'cable', 'machine',
                          'bodyweight', 'resistance_band', 'kettlebell', 'smith_machine'
                        )),
  movement_pattern      TEXT CHECK (movement_pattern IN (
                          'squat', 'hinge', 'push_horizontal', 'push_vertical',
                          'pull_horizontal', 'pull_vertical', 'lunge', 'carry', 'isolation'
                        )),

  primary_muscle_group  INTEGER REFERENCES public.muscle_groups (id),
  joint_complexity      INTEGER CHECK (joint_complexity BETWEEN 1 AND 3),

  allows_quad_focus     BOOLEAN NOT NULL DEFAULT FALSE,
  allows_glute_focus    BOOLEAN NOT NULL DEFAULT FALSE,

  focus_variant         TEXT CHECK (
                          focus_variant IS NULL OR focus_variant IN (
                            'quad_focus', 'glute_focus', 'neutral'
                          )
                        ),

  is_bilateral          BOOLEAN NOT NULL DEFAULT TRUE,
  requires_spotter      BOOLEAN NOT NULL DEFAULT FALSE,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Workouts — logged session (maps workout_log_sessions)
-- -----------------------------------------------------------------------------
CREATE TABLE public.workouts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,

  started_at            TIMESTAMPTZ NOT NULL,
  completed_at          TIMESTAMPTZ,
  duration_seconds      INTEGER,
  notes                 TEXT,

  client_id             TEXT,
  synced_at             TIMESTAMPTZ,
  local_version         INTEGER NOT NULL DEFAULT 1,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Workout sets — performed work (maps workout_log_sets)
-- -----------------------------------------------------------------------------
CREATE TABLE public.workout_sets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id            UUID NOT NULL REFERENCES public.workouts (id) ON DELETE CASCADE,
  exercise_id           UUID REFERENCES public.exercises (id),

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

-- =============================================================================
-- Row Level Security (Supabase)
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muscle_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

-- Catalog read for signed-in users (writes via service role / admin)
CREATE POLICY muscle_groups_select_authenticated
  ON public.muscle_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY exercises_select_authenticated
  ON public.exercises FOR SELECT
  TO authenticated
  USING (true);

-- User-owned rows
CREATE POLICY users_select_own ON public.users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY users_insert_own ON public.users FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY users_update_own ON public.users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY body_measurements_select_own ON public.body_measurements FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY body_measurements_insert_own ON public.body_measurements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY body_measurements_update_own ON public.body_measurements FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY foods_select_visible ON public.foods FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY foods_insert_own ON public.foods FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY foods_update_own ON public.foods FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY daily_logs_select_own ON public.daily_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY daily_logs_insert_own ON public.daily_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY daily_logs_update_own ON public.daily_logs FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY daily_log_entries_select_own ON public.daily_log_entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.daily_logs dl WHERE dl.id = log_id AND dl.user_id = auth.uid()));
CREATE POLICY daily_log_entries_insert_own ON public.daily_log_entries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.daily_logs dl WHERE dl.id = log_id AND dl.user_id = auth.uid()));
CREATE POLICY daily_log_entries_update_own ON public.daily_log_entries FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.daily_logs dl WHERE dl.id = log_id AND dl.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.daily_logs dl WHERE dl.id = log_id AND dl.user_id = auth.uid()));

CREATE POLICY workouts_select_own ON public.workouts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY workouts_insert_own ON public.workouts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY workouts_update_own ON public.workouts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY workout_sets_select_own ON public.workout_sets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));
CREATE POLICY workout_sets_insert_own ON public.workout_sets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));
CREATE POLICY workout_sets_update_own ON public.workout_sets FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));

-- =============================================================================
-- Optional: keep public.users in sync on signup (email from auth.users)
-- =============================================================================
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS TRIGGER
-- LANGUAGE plpgsql
-- SECURITY DEFINER SET search_path = public
-- AS $$
-- BEGIN
--   INSERT INTO public.users (id, email)
--   VALUES (NEW.id, NEW.email);
--   RETURN NEW;
-- END;
-- $$;
--
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
