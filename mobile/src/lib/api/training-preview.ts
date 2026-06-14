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
  fatigue_cost: "high" | "low" | "medium";
  equipment: TrainingEquipment;
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
