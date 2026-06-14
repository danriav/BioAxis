import { saveFoodLogAndReload, validateAddFoodForm } from "@/features/nutrition/addFoodViewModel";

function response(body: unknown, init: ResponseInit) {
  return {
    json: async () => body,
    ok: init.status ? init.status >= 200 && init.status < 300 : true,
    status: init.status ?? 200
  } as Response;
}

type FetchCall = [string, RequestInit];

const food = {
  id: "food-1",
  name_es: "Avena"
};

describe("nutrition add food view model", () => {
  it("validates positive quantity before saving", () => {
    expect(
      validateAddFoodForm({
        food,
        mealSlot: "desayuno",
        quantityText: "0",
        targetDate: "2026-06-12"
      })
    ).toMatchObject({
      status: "invalid"
    });

    expect(
      validateAddFoodForm({
        food,
        mealSlot: "desayuno",
        quantityText: "125.5",
        targetDate: "2026-06-12"
      })
    ).toEqual({
      payload: {
        food_id: "food-1",
        meal_slot: "desayuno",
        quantity_g: 125.5,
        target_date: "2026-06-12"
      },
      status: "valid"
    });
  });

  it("does not send user_id and reloads logs after save", async () => {
    const fetcher = jest.fn(async () => response({ food_id: "food-1" }, { status: 200 }));
    const reloadLogs = jest.fn(async () => null);

    await saveFoodLogAndReload(
      { access_token: "mock-token" },
      {
        food,
        mealSlot: "comida",
        quantityText: "100",
        targetDate: "2026-06-12"
      },
      reloadLogs,
      fetcher
    );

    const [[, init]] = fetcher.mock.calls as unknown as FetchCall[];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({
      food_id: "food-1",
      meal_slot: "comida",
      quantity_g: 100,
      target_date: "2026-06-12"
    });
    expect(body).not.toHaveProperty("user_id");
    expect(reloadLogs).toHaveBeenCalledTimes(1);
  });

  it("does not call backend or reload when quantity is invalid", async () => {
    const fetcher = jest.fn();
    const reloadLogs = jest.fn(async () => null);

    await expect(
      saveFoodLogAndReload(
        { access_token: "mock-token" },
        {
          food,
          mealSlot: "cena",
          quantityText: "-5",
          targetDate: "2026-06-12"
        },
        reloadLogs,
        fetcher
      )
    ).rejects.toMatchObject({
      code: "validation_error"
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(reloadLogs).not.toHaveBeenCalled();
  });
});
