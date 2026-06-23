import { MobileApiError } from "@/lib/api/client";
import {
  getProfileHistory,
  type BiometricHistoryResponse
} from "@/lib/api/profile-history";

function response(body: unknown, status = 200) {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status
  } as Response;
}

const readyResponse: BiometricHistoryResponse = {
  count: 2,
  entries: [
    {
      antebrazo: 24,
      brazo: 30,
      cadera: 96,
      cintura: 72,
      genero: "mujer",
      gluteo: 101,
      hombros: 104,
      is_current: false,
      pantorrilla: 35,
      pecho: 90,
      peso: 62,
      pierna: 55,
      ratio_curvatura: 0.75,
      ratio_simetria: 1.08,
      recorded_at: "2026-06-01T12:00:00Z"
    },
    {
      antebrazo: 24,
      brazo: 30,
      cadera: 97,
      cintura: 71,
      genero: "mujer",
      gluteo: 102,
      hombros: 105,
      is_current: true,
      pantorrilla: 35,
      pecho: 91,
      peso: 61,
      pierna: 55,
      ratio_curvatura: 0.73,
      ratio_simetria: 1.08,
      recorded_at: "2026-06-18T12:00:00Z"
    }
  ],
  status: "ready"
};

describe("profile history mobile client", () => {
  it("gets authenticated history without user_id", async () => {
    const fetcher = jest.fn(async () => response(readyResponse));

    const result = await getProfileHistory({ access_token: "mock-token" }, fetcher);

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(result).toEqual(readyResponse);
    expect(url).toBe("/profile/history");
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer mock-token");
    expect(url).not.toContain("user_id");
    expect(JSON.stringify(init)).not.toContain("user_id");
  });

  it("supports status empty", async () => {
    const fetcher = jest.fn(async () => response({ count: 0, entries: [], status: "empty" }));

    await expect(getProfileHistory({ access_token: "mock-token" }, fetcher)).resolves.toEqual({
      count: 0,
      entries: [],
      status: "empty"
    });
  });

  it("does not call backend without a token", async () => {
    const fetcher = jest.fn();

    await expect(getProfileHistory(null, fetcher)).rejects.toMatchObject({
      code: "missing_session"
    } satisfies Partial<MobileApiError>);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("maps expired tokens and network errors", async () => {
    const expiredFetcher = jest.fn(async () => response({ detail: "expired" }, 401));
    const offlineFetcher = jest.fn(async () => {
      throw new Error("offline");
    });

    await expect(
      getProfileHistory({ access_token: "expired-token" }, expiredFetcher)
    ).rejects.toMatchObject({ code: "session_expired" });
    await expect(
      getProfileHistory({ access_token: "mock-token" }, offlineFetcher)
    ).rejects.toMatchObject({ code: "network_error" });
  });
});
