import { MobileApiError } from "@/lib/api/client";
import type {
  TrainingEquipment,
  TrainingExperience,
  TrainingGoal,
  TrainingPreviewPayload,
  TrainingPreviewResponse,
  TrainingPreviewSession,
  TrainingPriority
} from "@/lib/api/training-preview";

export type TrainingPreviewStatus =
  | "error"
  | "forbidden"
  | "idle"
  | "loading"
  | "missing_session"
  | "network_error"
  | "preview_ready"
  | "session_expired"
  | "unexpected_error"
  | "validation_error";

export const defaultTrainingPreviewPayload: TrainingPreviewPayload = {
  available_equipment: ["barbell", "dumbbell", "machine", "cable", "bodyweight", "bench"],
  constraints: {},
  days_per_week: 4,
  experience: "intermediate",
  goal: "hypertrophy",
  priority: "balanced",
  time_budget_minutes: 75
};

export const trainingGoalOptions: { label: string; value: TrainingGoal }[] = [
  { label: "Hipertrofia", value: "hypertrophy" },
  { label: "Recomposición", value: "recomposition" },
  { label: "Pérdida de grasa", value: "fat_loss" },
  { label: "Fuerza e hipertrofia", value: "strength_hypertrophy" },
  { label: "Fitness general", value: "general_fitness" }
];

export const trainingPriorityOptions: { label: string; value: TrainingPriority }[] = [
  { label: "Balanceado", value: "balanced" },
  { label: "Torso", value: "torso" },
  { label: "Piernas", value: "legs" },
  { label: "Glúteos", value: "glutes" }
];

export const trainingExperienceOptions: { label: string; value: TrainingExperience }[] = [
  { label: "Principiante", value: "beginner" },
  { label: "Intermedio", value: "intermediate" },
  { label: "Avanzado", value: "advanced" }
];

export const trainingDayOptions = [3, 4, 5, 6];
export const trainingTimeOptions = [45, 60, 75, 90];

export function getTrainingSessionsByDay(preview: TrainingPreviewResponse | null): TrainingPreviewSession[] {
  return [...(preview?.program.sessions ?? [])].sort((a, b) => a.day_number - b.day_number);
}

export function getSelectedTrainingSession(
  preview: TrainingPreviewResponse | null,
  selectedDay: number
): TrainingPreviewSession | null {
  return getTrainingSessionsByDay(preview).find((session) => session.day_number === selectedDay) ?? null;
}

export function getInitialPreviewDay(preview: TrainingPreviewResponse | null) {
  return getTrainingSessionsByDay(preview)[0]?.day_number ?? 1;
}

export function formatRange(range: { min: number; max: number }) {
  return range.min === range.max ? `${range.min}` : `${range.min}-${range.max}`;
}

export function formatRest(seconds: number) {
  return `${Math.round(seconds / 60)} min`;
}

export function statusFromTrainingPreviewError(error: unknown): {
  message: string;
  status: TrainingPreviewStatus;
} {
  if (error instanceof MobileApiError) {
    const status = error.code === "not_found" ? "unexpected_error" : error.code;
    return {
      message: error.message,
      status
    };
  }

  return {
    message: "No pudimos generar el preview de entrenamiento.",
    status: "error"
  };
}

export function buildTrainingPreviewPayload(input: {
  daysPerWeek: number;
  experience: TrainingExperience;
  goal: TrainingGoal;
  priority: TrainingPriority;
  timeBudgetMinutes: number;
  equipment?: TrainingEquipment[];
}): TrainingPreviewPayload {
  return {
    available_equipment: input.equipment ?? defaultTrainingPreviewPayload.available_equipment,
    constraints: {},
    days_per_week: input.daysPerWeek,
    experience: input.experience,
    goal: input.goal,
    priority: input.priority,
    time_budget_minutes: input.timeBudgetMinutes
  };
}
