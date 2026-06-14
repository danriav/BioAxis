import {
  deleteFoodLogAndReload,
  updateFoodLogAndReload,
  validateEditFoodLog
} from "@/features/nutrition/editFoodLogViewModel";

function response(body: unknown, init: ResponseInit) {
  return {
    json: async () => body,
    ok: init.status ? init.status >= 200 && init.status < 300 : true,
    status: init.status ?? 200
  } as Response;
}

type FetchCall = [string, RequestInit];

const editInput = {
  logId: "log-1",
  mealSlot: "cena" as const,
  quantityText: "125",
  targetDate: "2026-06-12"
};

describe("nutrition edit food log view model", () => {
  it("validates positive quantity before patching", () => {
    expect(validateEditFoodLog({ ...editInput, quantityText: "0" })).toMatchObject({
      status: "invalid"
    });

    expect(validateEditFoodLog(editInput)).toEqual({
      payload: {
        meal_slot: "cena",
        quantity_g: 125,
        target_date: "2026-06-12"
      },
      status: "valid"
    });
  });

  it("does not call backend or reload when edit quantity is invalid", async () => {
    const fetcher = jest.fn();
    const reloadLogs = jest.fn(async () => null);

    await expect(
      updateFoodLogAndReload(
        { access_token: "mock-token" },
        { ...editInput, quantityText: "-10" },
        reloadLogs,
        fetcher
      )
    ).rejects.toMatchObject({
      code: "validation_error"
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(reloadLogs).not.toHaveBeenCalled();
  });

  it("patches without user_id and reloads logs after success", async () => {
    const fetcher = jest.fn(async () => response({ id: "log-1" }, { status: 200 }));
    const reloadLogs = jest.fn(async () => null);

    await updateFoodLogAndReload({ access_token: "mock-token" }, editInput, reloadLogs, fetcher);

    const [[url, init]] = fetcher.mock.calls as unknown as FetchCall[];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(url).toBe("/nutrition/logs/log-1");
    expect(body).toEqual({
      meal_slot: "cena",
      quantity_g: 125,
      target_date: "2026-06-12"
    });
    expect(body).not.toHaveProperty("user_id");
    expect(reloadLogs).toHaveBeenCalledTimes(1);
  });

  it("deletes without user_id and reloads logs after success", async () => {
    const fetcher = jest.fn(async () => response({ deleted_id: "log-1", status: "success" }, { status: 200 }));
    const reloadLogs = jest.fn(async () => null);

    await deleteFoodLogAndReload({ access_token: "mock-token" }, "log-1", reloadLogs, fetcher);

    const [[url, init]] = fetcher.mock.calls as unknown as FetchCall[];
    expect(url).toBe("/nutrition/logs/log-1");
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
    expect(JSON.stringify(init)).not.toContain("user_id");
    expect(reloadLogs).toHaveBeenCalledTimes(1);
  });
});
