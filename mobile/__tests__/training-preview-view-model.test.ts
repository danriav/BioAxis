import {
  buildTrainingPreviewPayload,
  getSelectedTrainingSession,
  getTrainingSessionsByDay
} from "@/features/workout/trainingPreviewViewModel";
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
            order: 1,
            primary_muscle: "back",
            rep_range: { max: 12, min: 8 },
            rest_seconds: 90,
            rir_target: { max: 2, min: 1 },
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
            order: 1,
            primary_muscle: "chest",
            rep_range: { max: 8, min: 6 },
            rest_seconds: 120,
            rir_target: { max: 2, min: 1 },
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
});
