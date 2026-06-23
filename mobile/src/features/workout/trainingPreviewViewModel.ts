import { MobileApiError } from "@/lib/api/client";
import type {
  TrainingEquipment,
  TrainingExperience,
  TrainingGoal,
  TrainingPreviewExercise,
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

export type TrainingScreenMode =
  | "error"
  | "generating"
  | "initial"
  | "network_error"
  | "no_substitute"
  | "preview_ready"
  | "session_expired"
  | "substituting";

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
  { label: "Glúteos/pierna", value: "glutes" },
  { label: "Torso", value: "torso" }
];

export const trainingExperienceOptions: { label: string; value: TrainingExperience }[] = [
  { label: "Principiante", value: "beginner" },
  { label: "Intermedio", value: "intermediate" },
  { label: "Avanzado", value: "advanced" }
];

export const trainingDayOptions = [3, 4, 5];
export const trainingTimeOptions = [45, 60, 75, 90];

export function deriveTrainingScreenMode(input: {
  hasPreview: boolean;
  status: TrainingPreviewStatus;
  substitutingKey: string | null;
}): TrainingScreenMode {
  if (input.substitutingKey) {
    return "substituting";
  }

  if (input.status === "session_expired" || input.status === "missing_session") {
    return "session_expired";
  }

  if (input.status === "network_error") {
    return "network_error";
  }

  if (input.status === "validation_error" && input.hasPreview) {
    return "no_substitute";
  }

  if (input.status === "loading") {
    return "generating";
  }

  if (input.hasPreview) {
    return "preview_ready";
  }

  if (input.status === "idle") {
    return "initial";
  }

  return "error";
}

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
  const wholeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds} s`;
  }

  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes} min ${remainingSeconds} s`;
}

const sessionIntentLabels: Record<string, string> = {
  lower_squat_glute: "Pierna: sentadilla y glúteos",
  lower_hinge_hamstring: "Pierna: bisagra y femorales",
  upper_push_pull: "Empuje y tirón de torso",
  upper_pull_push: "Tirón y empuje de torso",
  push: "Empuje",
  pull: "Tirón"
};

const muscleLabels: Record<string, string> = {
  abductors: "Abductores",
  abs: "Abdomen",
  adductors: "Aductores",
  back: "Espalda",
  biceps: "Bíceps",
  calves: "Pantorrillas",
  cardio: "Cardio",
  chest: "Pecho",
  core: "Core",
  forearms: "Antebrazos",
  glutes: "Glúteos",
  hamstrings: "Femorales",
  lats: "Dorsales",
  quads: "Cuádriceps",
  rear_delts: "Deltoides posteriores",
  shoulders: "Hombros",
  side_delts: "Deltoides laterales",
  triceps: "Tríceps"
};

const equipmentLabels: Record<string, string> = {
  band: "Banda",
  barbell: "Barra",
  bench: "Banco",
  bodyweight: "Peso corporal",
  cable: "Polea",
  cardio_machine: "Máquina de cardio",
  dumbbell: "Mancuernas",
  machine: "Máquina",
  smith: "Máquina Smith"
};

function formatContractLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function formatSessionIntent(intent: string) {
  return sessionIntentLabels[intent] ?? formatContractLabel(intent);
}

export function formatMuscleGroup(muscle: string) {
  return muscleLabels[muscle] ?? formatContractLabel(muscle);
}

export function formatEquipment(equipment: string) {
  return equipmentLabels[equipment] ?? formatContractLabel(equipment);
}

export function formatExercisePrescription(exercise: {
  rep_range: { min: number; max: number };
  rest_seconds: number;
  rir_target: { min: number; max: number };
  sets: number;
}) {
  return `${exercise.sets} sets · ${formatRange(exercise.rep_range)} reps · RIR ${formatRange(
    exercise.rir_target
  )} · descanso ${formatRest(exercise.rest_seconds)}`;
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

export function statusFromTrainingSubstitutionError(error: unknown): {
  message: string;
  status: TrainingPreviewStatus;
} {
  if (error instanceof MobileApiError) {
    if (error.code === "validation_error") {
      return {
        message: "No hay un sustituto disponible para este ejercicio.",
        status: "validation_error"
      };
    }

    const status = error.code === "not_found" ? "unexpected_error" : error.code;
    return {
      message: error.message,
      status
    };
  }

  return {
    message: "No pudimos cambiar el ejercicio.",
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

export function buildTrainingSubstitutionPayload(input: {
  exercise: TrainingPreviewExercise;
  goal: TrainingGoal;
  experience: TrainingExperience;
  preview: TrainingPreviewResponse;
  priority: TrainingPriority;
  session: TrainingPreviewSession;
  equipment?: TrainingEquipment[];
}) {
  const excludedExerciseIds = getTrainingSessionsByDay(input.preview).flatMap((trainingSession) =>
    trainingSession.exercises.map((exercise) => exercise.exercise_id)
  );

  return {
    available_equipment: input.equipment ?? defaultTrainingPreviewPayload.available_equipment,
    constraints: {},
    current_exercise_id: input.exercise.exercise_id,
    current_session: {
      experience: input.experience,
      goal: input.goal,
      intent: input.session.intent,
      label: input.session.label,
      priority: input.priority,
      target_muscles: input.session.target_muscles
    },
    excluded_exercise_ids: excludedExerciseIds,
    fatigue_cost: input.exercise.fatigue_cost,
    movement_pattern: input.exercise.movement_pattern,
    primary_muscle: input.exercise.primary_muscle,
    role: input.exercise.role,
    sets: input.exercise.sets
  };
}

export function replaceExerciseInPreview(input: {
  currentExercise: TrainingPreviewExercise;
  preview: TrainingPreviewResponse;
  sessionId: string;
  substituteExercise: TrainingPreviewExercise;
}) {
  return {
    ...input.preview,
    program: {
      ...input.preview.program,
      sessions: input.preview.program.sessions.map((session) => {
        if (session.session_id !== input.sessionId) {
          return session;
        }

        return {
          ...session,
          exercises: session.exercises.map((exercise) => {
            if (exercise.order !== input.currentExercise.order) {
              return exercise;
            }

            return {
              ...input.substituteExercise,
              order: input.currentExercise.order,
              rep_range: input.currentExercise.rep_range,
              rest_seconds: input.currentExercise.rest_seconds,
              rir_target: input.currentExercise.rir_target,
              sets: input.currentExercise.sets
            };
          })
        };
      })
    }
  };
}
