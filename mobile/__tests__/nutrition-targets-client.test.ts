import { MobileApiError } from "@/lib/api/client";
import { getNutritionTargets } from "@/lib/api/nutrition-targets";

function response(body: unknown, init: ResponseInit) {
  return {
    json: async () => body,
    ok: init.status ? init.status >= 200 && init.status < 300 : true,
    status: init.status ?? 200
  } as Response;
}

type FetchCall = [string, RequestInit];

describe("nutrition targets mobile client", () => {
  it("calls /nutrition/targets/me without sending user_id", async () => {
    const fetcher = jest.fn(async () =>
      response({ kcal: 2100, protein: 160, carbs: 220, fat: 70 }, { status: 200 })
    );

    await getNutritionTargets({ access_token: "mock-token" }, fetcher);

    const [[url]] = fetcher.mock.calls as unknown as FetchCall[];
    expect(url).toBe("/nutrition/targets/me");
    expect(url).not.toContain("{user_id}");
    expect(url).not.toContain("user_id");
  });

  it("adds Authorization when a session is present", async () => {
    const fetcher = jest.fn(async () =>
      response({ kcal: 2100, protein: 160, carbs: 220, fat: 70 }, { status: 200 })
    );

    await getNutritionTargets({ access_token: "mock-token" }, fetcher);

    const [, init] = (fetcher.mock.calls as unknown as FetchCall[])[0];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer mock-token");
  });

  it("does not call the backend without a session", async () => {
    const fetcher = jest.fn();

    await expect(getNutritionTargets(null, fetcher)).rejects.toMatchObject({
      code: "missing_session"
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("maps 401 to session_expired", async () => {
    const fetcher = jest.fn(async () => response({ detail: "expired" }, { status: 401 }));

    await expect(getNutritionTargets({ access_token: "expired-token" }, fetcher)).rejects.toMatchObject({
      code: "session_expired",
      status: 401
    } satisfies Partial<MobileApiError>);
  });

  it.each([
    [403, "forbidden"],
    [422, "validation_error"]
  ])("maps %s to %s", async (status, code) => {
    const fetcher = jest.fn(async () => response({ detail: "error" }, { status }));

    await expect(getNutritionTargets({ access_token: "mock-token" }, fetcher)).rejects.toMatchObject({
      code,
      status
    });
  });
});
