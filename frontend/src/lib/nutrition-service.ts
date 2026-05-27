// frontend/src/lib/nutrition-service.ts

const PYTHON_API_URL =
  process.env.NEXT_PUBLIC_PYTHON_API_URL || "http://localhost:8000";

export type NutritionTargets = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type FoodSearchItem = {
  id: string;
  name_es: string;
  variant?: string | null;
  calories_per_g: number | string;
  protein_per_g: number | string;
  carbs_per_g: number | string;
  fat_per_g: number | string;
  potassium_mg_per_g?: number | string | null;
  vitamin_c_mg_per_g?: number | string | null;
  default_portion_grams?: number | null;
};

export type MealLogRequest = {
  food_id: string;
  meal_slot: string;
  quantity_g: number;
  target_date: string;
};

export type SyncNutritionDayRequest = {
  source_date: string;
  target_date: string;
};

export class NutritionApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "NutritionApiError";
  }
}

async function parseError(response: Response): Promise<never> {
  if (response.status === 401) {
    throw new NutritionApiError("Tu sesión expiró. Inicia sesión otra vez.", 401);
  }

  if (response.status === 403) {
    throw new NutritionApiError("No tienes acceso a este recurso.", 403);
  }

  throw new NutritionApiError("No se pudo completar la operación.", response.status);
}

async function request<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${PYTHON_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json() as Promise<T>;
}

export const NutritionService = {
  async getTargets(userId: string, accessToken: string): Promise<NutritionTargets> {
    return request<NutritionTargets>(
      `/nutrition/targets/${encodeURIComponent(userId)}`,
      accessToken,
    );
  },

  async syncYesterdayPlan(
    payload: SyncNutritionDayRequest,
    accessToken: string,
  ): Promise<{ status: "success"; copied_items: number }> {
    return request<{ status: "success"; copied_items: number }>(
      "/nutrition/sync-day",
      accessToken,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  async searchFood(query: string, accessToken: string): Promise<FoodSearchItem[]> {
    return request<FoodSearchItem[]>(
      `/nutrition/search?query=${encodeURIComponent(query)}`,
      accessToken,
      {
        method: "GET",
        headers: {},
      },
    );
  },

  async addFoodLog(
    payload: MealLogRequest,
    accessToken: string,
  ): Promise<unknown> {
    return request<unknown>("/nutrition/add-log", accessToken, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
