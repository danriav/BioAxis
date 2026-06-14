const PYTHON_API_URL =
  process.env.NEXT_PUBLIC_PYTHON_API_URL || "http://localhost:8000";

export type KalosGoal =
  | "hypertrophy"
  | "recomposition"
  | "fat_loss"
  | "strength_hypertrophy"
  | "general_fitness";

export type KalosPriority = "torso" | "legs" | "glutes" | "balanced";
export type KalosExperience = "beginner" | "intermediate" | "advanced";
export type KalosBiometricFocus = "balanced" | "torso" | "glutes_legs" | "unknown";
export type KalosEquipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "band"
  | "smith"
  | "bench"
  | "cardio_machine";

export type KalosJointStress =
  | "knee"
  | "hip"
  | "lumbar"
  | "shoulder"
  | "elbow"
  | "wrist"
  | "ankle"
  | "neck";

export type KalosConstraints = {
  injuries?: KalosJointStress[];
  pain_areas?: KalosJointStress[];
  excluded_exercise_ids?: string[];
  excluded_movement_patterns?: string[];
  notes?: string | null;
};

export type KalosPreviewRequest = {
  days_per_week: number;
  goal: KalosGoal;
  priority: KalosPriority;
  experience: KalosExperience;
  time_budget_minutes: number;
  available_equipment: KalosEquipment[];
  constraints: KalosConstraints;
};

export type KalosRange = {
  min: number;
  max: number;
};

export type KalosExercise = {
  order: number;
  exercise_id: string;
  exercise_name: string;
  primary_muscle: string;
  secondary_muscles: string[];
  movement_pattern: string;
  role: string;
  sets: number;
  rep_range: KalosRange;
  rir_target: KalosRange;
  rest_seconds: number;
  fatigue_cost: string;
  equipment: KalosEquipment;
  joint_stress: KalosJointStress[];
  substitution_group: string;
  weekly_set_contribution: Record<string, number>;
  repeat_justification: string | null;
  coaching_note: string | null;
};

export type KalosSession = {
  session_id: string;
  day_number: number;
  label: string;
  intent: string;
  target_muscles: string[];
  estimated_minutes: number;
  fatigue_points: number;
  exercises: KalosExercise[];
};

export type KalosQualityChecks = {
  status: "pass" | "warning" | "fail";
  warnings: string[];
  volume_within_limits: boolean;
  frequency_within_limits: boolean;
  fatigue_within_limits: boolean;
  equipment_available: boolean;
  constraints_respected: boolean;
  duplicate_exercises_justified: boolean;
};

export type KalosTrainingPreview = {
  contract_version: "kalos_training_plan.v1";
  plan_id: string;
  input_summary: {
    days_per_week: number;
    goal: KalosGoal;
    priority: KalosPriority;
    experience: KalosExperience;
    time_budget_minutes: number;
    equipment_scope: KalosEquipment[];
    constraints_applied: string[];
    biometric_focus?: KalosBiometricFocus;
  };
  program: {
    name: string;
    duration_weeks: number;
    split: string[];
    weekly_volume_targets: Record<string, number>;
    sessions: KalosSession[];
  };
  quality_checks: KalosQualityChecks;
};

export type KalosSubstitutionRequest = {
  current_exercise_id: string;
  current_session: {
    goal: KalosGoal;
    experience: KalosExperience;
    priority: KalosPriority;
    label: string;
    intent: string;
    target_muscles: string[];
  };
  available_equipment: KalosEquipment[];
  excluded_exercise_ids: string[];
  constraints: KalosConstraints;
  movement_pattern?: string | null;
  role?: string | null;
  primary_muscle?: string | null;
  fatigue_cost?: string | null;
  sets?: number | null;
};

export type KalosSubstitutionResponse = {
  current_exercise_id: string;
  substitute_exercise: KalosExercise;
  equivalence: "exact" | "partial";
  equivalence_score: number;
  warnings: string[];
};

export class TrainingApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TrainingApiError";
  }
}

async function parseError(response: Response): Promise<never> {
  if (response.status === 401) {
    throw new TrainingApiError("Tu sesión expiró. Inicia sesión otra vez.", 401);
  }

  if (response.status === 422) {
    const body = await response.json().catch(() => null) as {
      detail?: { message?: string } | string;
    } | null;
    const detail = typeof body?.detail === "string" ? body.detail : body?.detail?.message;
    throw new TrainingApiError(detail || "No se pudo generar una rutina segura con esos parámetros.", 422);
  }

  throw new TrainingApiError("No se pudo generar el preview de entrenamiento.", response.status);
}

async function request<T>(
  path: string,
  accessToken: string,
  init: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${PYTHON_API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
    });
  } catch {
    throw new TrainingApiError("No pudimos conectar con el backend de entrenamiento. Verifica que FastAPI esté corriendo.", 0);
  }

  if (!response.ok) {
    await parseError(response);
  }

  return response.json() as Promise<T>;
}

export const TrainingService = {
  async previewKalosPlan(
    payload: KalosPreviewRequest,
    accessToken: string,
  ): Promise<KalosTrainingPreview> {
    return request<KalosTrainingPreview>("/training/kalos/preview", accessToken, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async substituteKalosExercise(
    payload: KalosSubstitutionRequest,
    accessToken: string,
  ): Promise<KalosSubstitutionResponse> {
    return request<KalosSubstitutionResponse>("/training/kalos/substitute", accessToken, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
