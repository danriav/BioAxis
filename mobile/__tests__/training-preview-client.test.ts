import { MobileApiError } from "@/lib/api/client";
import {
  postTrainingPreview,
  postTrainingSubstitution,
  type TrainingPreviewPayload,
  type TrainingSubstitutionPayload
} from "@/lib/api/training-preview";

function response(body: unknown, init: ResponseInit) {
  return {
    json: async () => body,
    ok: init.status ? init.status >= 200 && init.status < 300 : true,
    status: init.status ?? 200
  } as Response;
}

type FetchCall = [string, RequestInit];

const payload: TrainingPreviewPayload = {
  available_equipment: ["barbell", "dumbbell", "machine", "cable", "bodyweight", "bench"],
  constraints: {},
  days_per_week: 4,
  experience: "intermediate",
  goal: "hypertrophy",
  priority: "balanced",
  time_budget_minutes: 75
};

const substitutionPayload: TrainingSubstitutionPayload = {
  available_equipment: ["barbell", "dumbbell", "machine"],
  constraints: {},
  current_exercise_id: "exercise-1",
  current_session: {
    experience: "intermediate",
    goal: "hypertrophy",
    intent: "push",
    label: "Upper A",
    priority: "balanced",
    target_muscles: ["chest", "triceps"]
  },
  excluded_exercise_ids: ["exercise-1", "exercise-2"],
  fatigue_cost: "high",
  movement_pattern: "horizontal_push",
  primary_muscle: "chest",
  role: "anchor",
  sets: 4
};

describe("training preview mobile client", () => {
  it("calls /training/kalos/preview without sending user_id", async () => {
    const fetcher = jest.fn(async () => response({ contract_version: "kalos_training_plan.v1" }, { status: 200 }));

    await postTrainingPreview({ access_token: "mock-token" }, payload, fetcher);

    const [[url, init]] = fetcher.mock.calls as unknown as FetchCall[];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(url).toBe("/training/kalos/preview");
    expect(init.method).toBe("POST");
    expect(body).toEqual(payload);
    expect(body).not.toHaveProperty("user_id");
    expect(JSON.stringify(body)).not.toContain("user_id");
  });

  it("adds Authorization when generating preview", async () => {
    const fetcher = jest.fn(async () => response({ contract_version: "kalos_training_plan.v1" }, { status: 200 }));

    await postTrainingPreview({ access_token: "mock-token" }, payload, fetcher);

    const [, init] = (fetcher.mock.calls as unknown as FetchCall[])[0];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer mock-token");
  });

  it("does not call backend without a session", async () => {
    const fetcher = jest.fn();

    await expect(postTrainingPreview(null, payload, fetcher)).rejects.toMatchObject({
      code: "missing_session"
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [401, "session_expired"],
    [403, "forbidden"],
    [422, "validation_error"]
  ] as const)("maps %s to %s", async (status, code) => {
    const fetcher = jest.fn(async () => response({ detail: "error" }, { status }));

    await expect(postTrainingPreview({ access_token: "mock-token" }, payload, fetcher)).rejects.toMatchObject({
      code,
      status
    } satisfies Partial<MobileApiError>);
  });

  it("maps network failures to network_error", async () => {
    const fetcher = jest.fn(async () => {
      throw new Error("offline");
    });

    await expect(postTrainingPreview({ access_token: "mock-token" }, payload, fetcher)).rejects.toMatchObject({
      code: "network_error"
    });
  });
});

describe("training substitution mobile client", () => {
  it("calls /training/kalos/substitute without sending user_id", async () => {
    const fetcher = jest.fn(async () => response({ current_exercise_id: "exercise-1" }, { status: 200 }));

    await postTrainingSubstitution({ access_token: "mock-token" }, substitutionPayload, fetcher);

    const [[url, init]] = fetcher.mock.calls as unknown as FetchCall[];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(url).toBe("/training/kalos/substitute");
    expect(init.method).toBe("POST");
    expect(body).toEqual(substitutionPayload);
    expect(body).not.toHaveProperty("user_id");
    expect(JSON.stringify(body)).not.toContain("user_id");
  });

  it("adds Authorization when requesting a substitution", async () => {
    const fetcher = jest.fn(async () => response({ current_exercise_id: "exercise-1" }, { status: 200 }));

    await postTrainingSubstitution({ access_token: "mock-token" }, substitutionPayload, fetcher);

    const [, init] = (fetcher.mock.calls as unknown as FetchCall[])[0];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer mock-token");
  });

  it("does not call substitution backend without a session", async () => {
    const fetcher = jest.fn();

    await expect(postTrainingSubstitution(null, substitutionPayload, fetcher)).rejects.toMatchObject({
      code: "missing_session"
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [401, "session_expired"],
    [403, "forbidden"],
    [422, "validation_error"]
  ] as const)("maps substitution %s to %s", async (status, code) => {
    const fetcher = jest.fn(async () => response({ detail: "error" }, { status }));

    await expect(
      postTrainingSubstitution({ access_token: "mock-token" }, substitutionPayload, fetcher)
    ).rejects.toMatchObject({
      code,
      status
    } satisfies Partial<MobileApiError>);
  });

  it("maps substitution network failures to network_error", async () => {
    const fetcher = jest.fn(async () => {
      throw new Error("offline");
    });

    await expect(
      postTrainingSubstitution({ access_token: "mock-token" }, substitutionPayload, fetcher)
    ).rejects.toMatchObject({
      code: "network_error"
    });
  });
});
