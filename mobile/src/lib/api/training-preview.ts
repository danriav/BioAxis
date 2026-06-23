import type { Session } from "@supabase/supabase-js";

import { createApiClient } from "@/lib/api/client";

export type TrainingGoal =
  | "fat_loss"
  | "general_fitness"
  | "hypertrophy"
  | "recomposition"
  | "strength_hypertrophy";

export type TrainingPriority = "balanced" | "glutes" | "legs" | "torso";

export type TrainingExperience = "advanced" | "beginner" | "intermediate";

export type TrainingEquipment =
  | "band"
  | "barbell"
  | "bench"
  | "bodyweight"
  | "cable"
  | "cardio_machine"
  | "dumbbell"
  | "machine"
  | "smith";

export type TrainingMovementPattern =
  | "calf_raise"
  | "cardio_hiit"
  | "cardio_liss"
  | "core_flexion"
  | "core_stability"
  | "elbow_extension"
  | "elbow_flexion"
  | "hinge"
  | "hip_abduction"
  | "hip_adduction"
  | "hip_thrust"
  | "horizontal_pull"
  | "horizontal_push"
  | "knee_extension"
  | "knee_flexion"
  | "rear_delt"
  | "shoulder_abduction"
  | "squat"
  | "vertical_pull"
  | "vertical_push";

export type TrainingExerciseRole =
  | "anchor"
  | "cardio"
  | "finisher"
  | "isolation"
  | "primary_accessory"
  | "secondary_accessory"
  | "warmup";

export type TrainingFatigueCost = "high" | "low" | "medium";

export type TrainingPreviewPayload = {
  days_per_week: number;
  goal: TrainingGoal;
  priority: TrainingPriority;
  experience: TrainingExperience;
  time_budget_minutes: number;
  available_equipment: TrainingEquipment[];
  constraints: Record<string, never>;
};

export type TrainingRange = {
  min: number;
  max: number;
};

export type TrainingPreviewExercise = {
  order: number;
  exercise_id: string;
  exercise_name: string;
  primary_muscle: string;
  secondary_muscles: string[];
  sets: number;
  rep_range: TrainingRange;
  rir_target: TrainingRange;
  rest_seconds: number;
  fatigue_cost: TrainingFatigueCost;
  equipment: TrainingEquipment;
  movement_pattern?: TrainingMovementPattern;
  role?: TrainingExerciseRole;
  joint_stress?: string[];
  substitution_group?: string;
  weekly_set_contribution?: Record<string, number>;
  repeat_justification?: string | null;
  coaching_note?: string | null;
};

export type TrainingPreviewSession = {
  session_id: string;
  day_number: number;
  label: string;
  intent: string;
  target_muscles: string[];
  estimated_minutes: number;
  fatigue_points: number;
  exercises: TrainingPreviewExercise[];
};

export type TrainingPreviewResponse = {
  contract_version: "kalos_training_plan.v1";
  plan_id: string;
  program: {
    name: string;
    duration_weeks: number;
    split: string[];
    sessions: TrainingPreviewSession[];
  };
  quality_checks: {
    status: "fail" | "pass" | "warning";
    warnings: string[];
  };
};

export type TrainingSubstitutionSessionContext = {
  goal: TrainingGoal;
  experience: TrainingExperience;
  priority: TrainingPriority;
  label: string;
  intent: string;
  target_muscles: string[];
};

export type TrainingSubstitutionPayload = {
  current_exercise_id: string;
  current_session: TrainingSubstitutionSessionContext;
  available_equipment: TrainingEquipment[];
  excluded_exercise_ids: string[];
  constraints: Record<string, never>;
  movement_pattern?: TrainingMovementPattern;
  role?: TrainingExerciseRole;
  primary_muscle?: string;
  fatigue_cost?: TrainingFatigueCost;
  sets?: number;
};

export type TrainingSubstitutionResponse = {
  current_exercise_id: string;
  substitute_exercise: TrainingPreviewExercise;
  equivalence: "exact" | "partial";
  equivalence_score: number;
  warnings: string[];
};

export function postTrainingPreview(
  session: Pick<Session, "access_token"> | null,
  payload: TrainingPreviewPayload,
  fetcher?: typeof fetch
) {
  return createApiClient({ fetcher, session }).postJson<TrainingPreviewResponse, TrainingPreviewPayload>(
    "/training/kalos/preview",
    payload
  );
}

export function postTrainingSubstitution(
  session: Pick<Session, "access_token"> | null,
  payload: TrainingSubstitutionPayload,
  fetcher?: typeof fetch
) {
  return createApiClient({ fetcher, session }).postJson<TrainingSubstitutionResponse, TrainingSubstitutionPayload>(
    "/training/kalos/substitute",
    payload
  );
}
