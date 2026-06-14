import { MobileApiError } from "@/lib/api/client";
import { getNutritionLogs } from "@/lib/api/nutrition-logs";

function response(body: unknown, init: ResponseInit) {
  return {
    json: async () => body,
    ok: init.status ? init.status >= 200 && init.status < 300 : true,
    status: init.status ?? 200
  } as Response;
}

type FetchCall = [string, RequestInit];

const emptyDay = {
  date: "2026-06-12",
  items: [],
  meals: { comida: [], cena: [], desayuno: [], snacks: [] },
  totals: { carbs: 0, fat: 0, kcal: 0, protein: 0 }
};

describe("nutrition logs mobile client", () => {
  it("calls /nutrition/logs with date and without user_id", async () => {
    const fetcher = jest.fn(async () => response(emptyDay, { status: 200 }));

    await getNutritionLogs({ access_token: "mock-token" }, "2026-06-12", fetcher);

    const [[url]] = fetcher.mock.calls as unknown as FetchCall[];
    expect(url).toBe("/nutrition/logs?date=2026-06-12");
    expect(url).not.toContain("user_id");
  });

  it("adds Authorization when a session is present", async () => {
    const fetcher = jest.fn(async () => response(emptyDay, { status: 200 }));

    await getNutritionLogs({ access_token: "mock-token" }, "2026-06-12", fetcher);

    const [, init] = (fetcher.mock.calls as unknown as FetchCall[])[0];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer mock-token");
  });

  it("does not call the backend without a session", async () => {
    const fetcher = jest.fn();

    await expect(getNutritionLogs(null, "2026-06-12", fetcher)).rejects.toMatchObject({
      code: "missing_session"
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns empty day totals as zero", async () => {
    const fetcher = jest.fn(async () => response(emptyDay, { status: 200 }));

    await expect(getNutritionLogs({ access_token: "mock-token" }, "2026-06-12", fetcher)).resolves.toMatchObject({
      items: [],
      totals: { carbs: 0, fat: 0, kcal: 0, protein: 0 }
    });
  });

  it("maps 401 to session_expired", async () => {
    const fetcher = jest.fn(async () => response({ detail: "expired" }, { status: 401 }));

    await expect(getNutritionLogs({ access_token: "expired-token" }, "2026-06-12", fetcher)).rejects.toMatchObject({
      code: "session_expired",
      status: 401
    } satisfies Partial<MobileApiError>);
  });

  it("maps 422 to validation_error", async () => {
    const fetcher = jest.fn(async () => response({ detail: "invalid date" }, { status: 422 }));

    await expect(getNutritionLogs({ access_token: "mock-token" }, "bad-date", fetcher)).rejects.toMatchObject({
      code: "validation_error",
      status: 422
    });
  });

  it("maps network failures to network_error", async () => {
    const fetcher = jest.fn(async () => {
      throw new Error("offline");
    });

    await expect(getNutritionLogs({ access_token: "mock-token" }, "2026-06-12", fetcher)).rejects.toMatchObject({
      code: "network_error"
    });
  });
});
