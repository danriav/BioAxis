import {
  buildTrainingSubstitutionPayload,
  buildTrainingPreviewPayload,
  deriveTrainingScreenMode,
  formatEquipment,
  formatExercisePrescription,
  formatMuscleGroup,
  formatRest,
  formatSessionIntent,
  getSelectedTrainingSession,
  getTrainingSessionsByDay,
  replaceExerciseInPreview,
  statusFromTrainingSubstitutionError,
  statusFromTrainingPreviewError,
  trainingDayOptions,
  trainingPriorityOptions,
  trainingTimeOptions
} from "@/features/workout/trainingPreviewViewModel";
import { MobileApiError } from "@/lib/api/client";
import type { TrainingPreviewResponse } from "@/lib/api/training-preview";

const preview: TrainingPreviewResponse = {
  contract_version: "kalos_training_plan.v1",
  plan_id: "plan-1",
  program: {
    duration_weeks: 8,
    name: "Kalos Preview",
    sessions: [
      {
        day_number: 2,
        estimated_minutes: 70,
        exercises: [
          {
            equipment: "dumbbell",
            exercise_id: "exercise-2",
            exercise_name: "Remo mancuerna",
            fatigue_cost: "medium",
            movement_pattern: "horizontal_pull",
            order: 1,
            primary_muscle: "back",
            rep_range: { max: 12, min: 8 },
            rest_seconds: 90,
            rir_target: { max: 2, min: 1 },
            role: "primary_accessory",
            secondary_muscles: [],
            sets: 3
          }
        ],
        fatigue_points: 8,
        intent: "pull",
        label: "Pull",
        session_id: "session-2",
        target_muscles: ["back", "biceps"]
      },
      {
        day_number: 1,
        estimated_minutes: 75,
        exercises: [
          {
            equipment: "barbell",
            exercise_id: "exercise-1",
            exercise_name: "Press banca",
            fatigue_cost: "high",
            movement_pattern: "horizontal_push",
            order: 1,
            primary_muscle: "chest",
            rep_range: { max: 8, min: 6 },
            rest_seconds: 120,
            rir_target: { max: 2, min: 1 },
            role: "anchor",
            secondary_muscles: ["triceps"],
            sets: 4
          }
        ],
        fatigue_points: 10,
        intent: "push",
        label: "Push",
        session_id: "session-1",
        target_muscles: ["chest", "shoulders"]
      }
    ],
    split: ["Push", "Pull"]
  },
  quality_checks: {
    status: "pass",
    warnings: []
  }
};

describe("training preview view model", () => {
  it("builds the approved payload without user_id", () => {
    const payload = buildTrainingPreviewPayload({
      daysPerWeek: 4,
      experience: "intermediate",
      goal: "hypertrophy",
      priority: "balanced",
      timeBudgetMinutes: 75
    });

    expect(payload).toMatchObject({
      days_per_week: 4,
      experience: "intermediate",
      goal: "hypertrophy",
      priority: "balanced",
      time_budget_minutes: 75
    });
    expect(payload).not.toHaveProperty("user_id");
    expect(JSON.stringify(payload)).not.toContain("user_id");
  });

  it("groups sessions by day order", () => {
    expect(getTrainingSessionsByDay(preview).map((session) => session.day_number)).toEqual([1, 2]);
  });

  it("returns only the selected day session", () => {
    const selected = getSelectedTrainingSession(preview, 2);

    expect(selected?.day_number).toBe(2);
    expect(selected?.session_id).toBe("session-2");
    expect(selected?.exercises).toHaveLength(1);
  });

  it("uses the MVP option sets approved for mobile", () => {
    expect(trainingDayOptions).toEqual([3, 4, 5]);
    expect(trainingTimeOptions).toEqual([45, 60, 75, 90]);
    expect(trainingPriorityOptions.map((option) => option.value)).toEqual(["balanced", "glutes", "torso"]);
  });

  it("formats exercise prescription with sets reps RIR and rest", () => {
    expect(
      formatExercisePrescription({
        rep_range: { max: 12, min: 8 },
        rest_seconds: 90,
        rir_target: { max: 2, min: 1 },
        sets: 3
      })
    ).toBe("3 sets · 8-12 reps · RIR 1-2 · descanso 1 min 30 s");
  });

  it.each([
    [60, "1 min"],
    [90, "1 min 30 s"],
    [120, "2 min"],
    [150, "2 min 30 s"]
  ] as const)("formats %s rest seconds without rounding", (seconds, expected) => {
    expect(formatRest(seconds)).toBe(expected);
  });

  it("localizes session intent, muscles and equipment without changing contract values", () => {
    const contractValues = {
      equipment: "dumbbell",
      intent: "upper_push_pull",
      muscle: "quads"
    };

    expect(formatSessionIntent(contractValues.intent)).toBe("Empuje y tirón de torso");
    expect(formatMuscleGroup(contractValues.muscle)).toBe("Cuádriceps");
    expect(formatEquipment(contractValues.equipment)).toBe("Mancuernas");
    expect(contractValues).toEqual({
      equipment: "dumbbell",
      intent: "upper_push_pull",
      muscle: "quads"
    });
  });

  it("localizes the approved presentation examples", () => {
    expect(formatMuscleGroup("chest")).toBe("Pecho");
    expect(formatMuscleGroup("back")).toBe("Espalda");
    expect(formatMuscleGroup("glutes")).toBe("Glúteos");
    expect(formatMuscleGroup("rear_delts")).toBe("Deltoides posteriores");
    expect(formatMuscleGroup("side_delts")).toBe("Deltoides laterales");
    expect(formatEquipment("barbell")).toBe("Barra");
    expect(formatEquipment("machine")).toBe("Máquina");
    expect(formatEquipment("cable")).toBe("Polea");
    expect(formatEquipment("bodyweight")).toBe("Peso corporal");
  });

  it("localizes abductors without changing the backend code", () => {
    const muscle = "abductors";

    expect(formatMuscleGroup(muscle)).toBe("Abductores");
    expect(muscle).toBe("abductors");
  });

  it("localizes adductors without changing the backend code", () => {
    const muscle = "adductors";

    expect(formatMuscleGroup(muscle)).toBe("Aductores");
    expect(muscle).toBe("adductors");
  });

  it("maps API errors to visible states", () => {
    expect(statusFromTrainingPreviewError(new MobileApiError("session_expired", "Sesión expirada", 401))).toEqual({
      message: "Sesión expirada",
      status: "session_expired"
    });
    expect(statusFromTrainingPreviewError(new MobileApiError("validation_error", "Solicitud inválida", 422))).toEqual({
      message: "Solicitud inválida",
      status: "validation_error"
    });
    expect(statusFromTrainingPreviewError(new Error("offline"))).toEqual({
      message: "No pudimos generar el preview de entrenamiento.",
      status: "error"
    });
  });

  it("builds substitution payload without user_id", () => {
    const selected = getSelectedTrainingSession(preview, 1);
    const exercise = selected?.exercises[0];

    expect(selected).toBeTruthy();
    expect(exercise).toBeTruthy();

    const payload = buildTrainingSubstitutionPayload({
      exercise: exercise!,
      experience: "intermediate",
      goal: "hypertrophy",
      preview,
      priority: "balanced",
      session: selected!
    });

    expect(payload).toMatchObject({
      current_exercise_id: "exercise-1",
      current_session: {
        experience: "intermediate",
        goal: "hypertrophy",
        intent: "push",
        label: "Push",
        priority: "balanced",
        target_muscles: ["chest", "shoulders"]
      },
      fatigue_cost: "high",
      movement_pattern: "horizontal_push",
      primary_muscle: "chest",
      role: "anchor",
      sets: 4
    });
    expect(payload.excluded_exercise_ids).toEqual(["exercise-1", "exercise-2"]);
    expect(JSON.stringify(payload)).not.toContain("user_id");
  });

  it("replaces only the selected exercise by session and order", () => {
    const selected = getSelectedTrainingSession(preview, 1);
    const currentExercise = selected!.exercises[0];
    const updated = replaceExerciseInPreview({
      currentExercise,
      preview,
      sessionId: "session-1",
      substituteExercise: {
        ...currentExercise,
        equipment: "dumbbell",
        exercise_id: "exercise-3",
        exercise_name: "Press inclinado con mancuernas",
        primary_muscle: "chest"
      }
    });

    expect(getSelectedTrainingSession(updated, 1)?.exercises[0]).toMatchObject({
      exercise_id: "exercise-3",
      exercise_name: "Press inclinado con mancuernas"
    });
    expect(getSelectedTrainingSession(updated, 2)?.exercises[0]).toMatchObject({
      exercise_id: "exercise-2",
      exercise_name: "Remo mancuerna"
    });
  });

  it("preserves sets reps RIR rest and order when replacing exercise", () => {
    const selected = getSelectedTrainingSession(preview, 1);
    const currentExercise = selected!.exercises[0];
    const updated = replaceExerciseInPreview({
      currentExercise,
      preview,
      sessionId: "session-1",
      substituteExercise: {
        ...currentExercise,
        exercise_id: "exercise-3",
        exercise_name: "Press en máquina",
        order: 9,
        rep_range: { max: 20, min: 15 },
        rest_seconds: 45,
        rir_target: { max: 4, min: 3 },
        sets: 2
      }
    });

    expect(getSelectedTrainingSession(updated, 1)?.exercises[0]).toMatchObject({
      exercise_id: "exercise-3",
      order: 1,
      rep_range: { max: 8, min: 6 },
      rest_seconds: 120,
      rir_target: { max: 2, min: 1 },
      sets: 4
    });
  });

  it("maps no-substitute errors to a clear message", () => {
    expect(statusFromTrainingSubstitutionError(new MobileApiError("validation_error", "Backend rejected", 422))).toEqual(
      {
        message: "No hay un sustituto disponible para este ejercicio.",
        status: "validation_error"
      }
    );
  });

  it("derives initial, generating and ready visual modes", () => {
    expect(
      deriveTrainingScreenMode({ hasPreview: false, status: "idle", substitutingKey: null })
    ).toBe("initial");
    expect(
      deriveTrainingScreenMode({ hasPreview: false, status: "loading", substitutingKey: null })
    ).toBe("generating");
    expect(
      deriveTrainingScreenMode({ hasPreview: true, status: "preview_ready", substitutingKey: null })
    ).toBe("preview_ready");
  });

  it("prioritizes substitution state while replacing an exercise", () => {
    expect(
      deriveTrainingScreenMode({
        hasPreview: true,
        status: "preview_ready",
        substitutingKey: "session-1-1"
      })
    ).toBe("substituting");
  });

  it("derives no substitute, network and expired session states", () => {
    expect(
      deriveTrainingScreenMode({ hasPreview: true, status: "validation_error", substitutingKey: null })
    ).toBe("no_substitute");
    expect(
      deriveTrainingScreenMode({ hasPreview: false, status: "network_error", substitutingKey: null })
    ).toBe("network_error");
    expect(
      deriveTrainingScreenMode({ hasPreview: false, status: "session_expired", substitutingKey: null })
    ).toBe("session_expired");
  });
});
