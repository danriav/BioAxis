import { MobileApiError } from "@/lib/api/client";
import {
  createMeasurement,
  getProfileMe,
  setupProfile,
  type MeasurementCreatePayload,
  type ProfileSetupPayload
} from "@/lib/api/profile";

function response(body: unknown, init: ResponseInit) {
  return {
    json: async () => body,
    ok: init.status ? init.status >= 200 && init.status < 300 : true,
    status: init.status ?? 200
  } as Response;
}

type FetchCall = [string, RequestInit];

const setupPayload: ProfileSetupPayload = {
  altura: 165,
  antebrazo: 24,
  brazo: 30,
  cadera: 96,
  cintura: 72,
  dias_entrenamiento_semana: 4,
  display_name: "Atleta Sandbox",
  edad: 28,
  genero: "mujer",
  gluteo: 101,
  hombros: 102,
  objetivo_metabolico: "mantenimiento",
  pantorrilla: 35,
  pecho: 90,
  peso: 62,
  pierna: 55
};

const measurementPayload: MeasurementCreatePayload = {
  cintura: 70,
  gluteo: 102,
  peso: 63
};

describe("profile mobile client", () => {
  it("GET /profile/me uses Authorization and does not send user_id", async () => {
    const fetcher = jest.fn(async () => response({ has_profile: false, profile: null, status: "empty" }, { status: 200 }));

    await getProfileMe({ access_token: "mock-token" }, fetcher);

    const [[url, init]] = fetcher.mock.calls as unknown as FetchCall[];
    const headers = init.headers as Record<string, string>;
    expect(url).toBe("/profile/me");
    expect(init.method).toBe("GET");
    expect(headers.Authorization).toBe("Bearer mock-token");
    expect(url).not.toContain("user_id");
    expect(JSON.stringify(init)).not.toContain("user_id");
  });

  it("POST /profile/setup sends approved payload without user_id", async () => {
    const fetcher = jest.fn(async () => response({ profile: {}, status: "success" }, { status: 200 }));

    await setupProfile({ access_token: "mock-token" }, setupPayload, fetcher);

    const [[url, init]] = fetcher.mock.calls as unknown as FetchCall[];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    const headers = init.headers as Record<string, string>;
    expect(url).toBe("/profile/setup");
    expect(init.method).toBe("POST");
    expect(headers.Authorization).toBe("Bearer mock-token");
    expect(body).toEqual(setupPayload);
    expect(body).not.toHaveProperty("user_id");
    expect(JSON.stringify(body)).not.toContain("user_id");
  });

  it("POST /profile/measurements sends approved payload without user_id", async () => {
    const fetcher = jest.fn(async () => response({ profile: {}, status: "success" }, { status: 200 }));

    await createMeasurement({ access_token: "mock-token" }, measurementPayload, fetcher);

    const [[url, init]] = fetcher.mock.calls as unknown as FetchCall[];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    const headers = init.headers as Record<string, string>;
    expect(url).toBe("/profile/measurements");
    expect(init.method).toBe("POST");
    expect(headers.Authorization).toBe("Bearer mock-token");
    expect(body).toEqual(measurementPayload);
    expect(body).not.toHaveProperty("user_id");
    expect(JSON.stringify(body)).not.toContain("user_id");
  });

  it("does not call backend without a session", async () => {
    const fetcher = jest.fn();

    await expect(getProfileMe(null, fetcher)).rejects.toMatchObject({
      code: "missing_session"
    });
    await expect(setupProfile(null, setupPayload, fetcher)).rejects.toMatchObject({
      code: "missing_session"
    });
    await expect(createMeasurement(null, measurementPayload, fetcher)).rejects.toMatchObject({
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

    await expect(getProfileMe({ access_token: "mock-token" }, fetcher)).rejects.toMatchObject({
      code,
      status
    } satisfies Partial<MobileApiError>);
  });

  it("maps network failures to network_error", async () => {
    const fetcher = jest.fn(async () => {
      throw new Error("offline");
    });

    await expect(getProfileMe({ access_token: "mock-token" }, fetcher)).rejects.toMatchObject({
      code: "network_error"
    });
  });
});
