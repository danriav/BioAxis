import { MobileApiError } from "@/lib/api/client";
import {
  addNutritionLog,
  deleteNutritionLog,
  searchNutritionFoods,
  updateNutritionLog
} from "@/lib/api/nutrition-foods";

function response(body: unknown, init: ResponseInit) {
  return {
    json: async () => body,
    ok: init.status ? init.status >= 200 && init.status < 300 : true,
    status: init.status ?? 200
  } as Response;
}

type FetchCall = [string, RequestInit];

const foodResults = [
  {
    calories_per_g: 3.89,
    carbs_per_g: 0.66,
    fat_per_g: 0.07,
    id: "food-1",
    name_es: "Avena",
    protein_per_g: 0.17
  }
];

const addPayload = {
  food_id: "food-1",
  meal_slot: "desayuno",
  quantity_g: 100,
  target_date: "2026-06-12"
};

const updatePayload = {
  meal_slot: "cena",
  quantity_g: 125,
  target_date: "2026-06-12"
};

describe("nutrition food search mobile client", () => {
  it("calls /nutrition/search?query= without sending user_id", async () => {
    const fetcher = jest.fn(async () => response(foodResults, { status: 200 }));

    await searchNutritionFoods({ access_token: "mock-token" }, "avena", fetcher);

    const [[url]] = fetcher.mock.calls as unknown as FetchCall[];
    expect(url).toBe("/nutrition/search?query=avena");
    expect(url).not.toContain("user_id");
  });

  it("adds Authorization when searching", async () => {
    const fetcher = jest.fn(async () => response(foodResults, { status: 200 }));

    await searchNutritionFoods({ access_token: "mock-token" }, "avena", fetcher);

    const [, init] = (fetcher.mock.calls as unknown as FetchCall[])[0];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer mock-token");
  });

  it("does not call search backend without a session", async () => {
    const fetcher = jest.fn();

    await expect(searchNutritionFoods(null, "avena", fetcher)).rejects.toMatchObject({
      code: "missing_session"
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("nutrition add-log mobile client", () => {
  it("posts the approved payload without user_id", async () => {
    const fetcher = jest.fn(async () => response({ food_id: "food-1" }, { status: 200 }));

    await addNutritionLog({ access_token: "mock-token" }, addPayload, fetcher);

    const [[url, init]] = fetcher.mock.calls as unknown as FetchCall[];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(url).toBe("/nutrition/add-log");
    expect(body).toEqual(addPayload);
    expect(body).not.toHaveProperty("user_id");
    expect(JSON.stringify(body)).not.toContain("user_id");
  });

  it("adds Authorization when registering food", async () => {
    const fetcher = jest.fn(async () => response({ food_id: "food-1" }, { status: 200 }));

    await addNutritionLog({ access_token: "mock-token" }, addPayload, fetcher);

    const [, init] = (fetcher.mock.calls as unknown as FetchCall[])[0];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer mock-token");
  });

  it("does not call add-log backend without a session", async () => {
    const fetcher = jest.fn();

    await expect(addNutritionLog(null, addPayload, fetcher)).rejects.toMatchObject({
      code: "missing_session"
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [401, "session_expired"],
    [403, "forbidden"],
    [404, "not_found"],
    [422, "validation_error"]
  ] as const)("maps %s to %s", async (status, code) => {
    const fetcher = jest.fn(async () => response({ detail: "error" }, { status }));

    await expect(addNutritionLog({ access_token: "mock-token" }, addPayload, fetcher)).rejects.toMatchObject({
      code,
      status
    } satisfies Partial<MobileApiError>);
  });

  it("maps network failures to network_error", async () => {
    const fetcher = jest.fn(async () => {
      throw new Error("offline");
    });

    await expect(addNutritionLog({ access_token: "mock-token" }, addPayload, fetcher)).rejects.toMatchObject({
      code: "network_error"
    });
  });
});

describe("nutrition edit-log mobile client", () => {
  it("patches /nutrition/logs/{log_id} with the approved payload and without user_id", async () => {
    const fetcher = jest.fn(async () => response({ id: "log-1" }, { status: 200 }));

    await updateNutritionLog({ access_token: "mock-token" }, "log-1", updatePayload, fetcher);

    const [[url, init]] = fetcher.mock.calls as unknown as FetchCall[];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(url).toBe("/nutrition/logs/log-1");
    expect(init.method).toBe("PATCH");
    expect(body).toEqual(updatePayload);
    expect(body).not.toHaveProperty("user_id");
    expect(JSON.stringify(body)).not.toContain("user_id");
  });

  it("adds Authorization when patching a log", async () => {
    const fetcher = jest.fn(async () => response({ id: "log-1" }, { status: 200 }));

    await updateNutritionLog({ access_token: "mock-token" }, "log-1", updatePayload, fetcher);

    const [, init] = (fetcher.mock.calls as unknown as FetchCall[])[0];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer mock-token");
  });

  it("does not call patch backend without a session", async () => {
    const fetcher = jest.fn();

    await expect(updateNutritionLog(null, "log-1", updatePayload, fetcher)).rejects.toMatchObject({
      code: "missing_session"
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [401, "session_expired"],
    [403, "forbidden"],
    [404, "not_found"],
    [422, "validation_error"]
  ] as const)("maps patch %s to %s", async (status, code) => {
    const fetcher = jest.fn(async () => response({ detail: "error" }, { status }));

    await expect(updateNutritionLog({ access_token: "mock-token" }, "log-1", updatePayload, fetcher)).rejects.toMatchObject({
      code,
      status
    } satisfies Partial<MobileApiError>);
  });

  it("maps patch network failures to network_error", async () => {
    const fetcher = jest.fn(async () => {
      throw new Error("offline");
    });

    await expect(updateNutritionLog({ access_token: "mock-token" }, "log-1", updatePayload, fetcher)).rejects.toMatchObject({
      code: "network_error"
    });
  });
});

describe("nutrition delete-log mobile client", () => {
  it("deletes /nutrition/logs/{log_id} without sending user_id", async () => {
    const fetcher = jest.fn(async () => response({ deleted_id: "log-1", status: "success" }, { status: 200 }));

    await deleteNutritionLog({ access_token: "mock-token" }, "log-1", fetcher);

    const [[url, init]] = fetcher.mock.calls as unknown as FetchCall[];
    expect(url).toBe("/nutrition/logs/log-1");
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
    expect(JSON.stringify(init)).not.toContain("user_id");
  });

  it("adds Authorization when deleting a log", async () => {
    const fetcher = jest.fn(async () => response({ deleted_id: "log-1", status: "success" }, { status: 200 }));

    await deleteNutritionLog({ access_token: "mock-token" }, "log-1", fetcher);

    const [, init] = (fetcher.mock.calls as unknown as FetchCall[])[0];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer mock-token");
  });

  it("does not call delete backend without a session", async () => {
    const fetcher = jest.fn();

    await expect(deleteNutritionLog(null, "log-1", fetcher)).rejects.toMatchObject({
      code: "missing_session"
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [401, "session_expired"],
    [403, "forbidden"],
    [404, "not_found"],
    [422, "validation_error"]
  ] as const)("maps delete %s to %s", async (status, code) => {
    const fetcher = jest.fn(async () => response({ detail: "error" }, { status }));

    await expect(deleteNutritionLog({ access_token: "mock-token" }, "log-1", fetcher)).rejects.toMatchObject({
      code,
      status
    } satisfies Partial<MobileApiError>);
  });

  it("maps delete network failures to network_error", async () => {
    const fetcher = jest.fn(async () => {
      throw new Error("offline");
    });

    await expect(deleteNutritionLog({ access_token: "mock-token" }, "log-1", fetcher)).rejects.toMatchObject({
      code: "network_error"
    });
  });
});
