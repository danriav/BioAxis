import type { Session } from "@supabase/supabase-js";

import { createApiClient } from "@/lib/api/client";

export type NutritionLogFoodItem = {
  id: string;
  food_id: string | null;
  food_name: string | null;
  meal_slot: string;
  quantity_g: number;
  consumed_at: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type NutritionDayTotals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type NutritionDayLogs = {
  date: string;
  items: NutritionLogFoodItem[];
  totals: NutritionDayTotals;
  meals?: Record<string, NutritionLogFoodItem[]>;
};

export function getNutritionLogs(
  session: Pick<Session, "access_token"> | null,
  date: string,
  fetcher?: typeof fetch
) {
  const encodedDate = encodeURIComponent(date);
  return createApiClient({ fetcher, session }).getJson<NutritionDayLogs>(
    `/nutrition/logs?date=${encodedDate}`
  );
}
