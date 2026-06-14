import type { Session } from "@supabase/supabase-js";

import { createApiClient } from "@/lib/api/client";

export type FoodSearchItem = {
  id: string | null;
  name_es: string | null;
  calories_per_g?: number | null;
  protein_per_g?: number | null;
  carbs_per_g?: number | null;
  fat_per_g?: number | null;
  default_portion_grams?: number | null;
  category?: string | null;
  variant?: string | null;
};

export type AddNutritionLogPayload = {
  food_id: string;
  meal_slot: string;
  quantity_g: number;
  target_date: string;
};

export type AddNutritionLogResponse = {
  food_id?: string | null;
  meal_slot?: string | null;
  quantity_g?: number | null;
  consumed_at?: string | null;
};

export type UpdateNutritionLogPayload = {
  meal_slot?: string;
  quantity_g?: number;
  target_date?: string;
  consumed_at?: string;
};

export type UpdateNutritionLogResponse = {
  id: string;
  food_id?: string | null;
  meal_slot: string;
  quantity_g: number;
  consumed_at: string;
};

export type DeleteNutritionLogResponse = {
  status: "success";
  deleted_id: string;
};

export function searchNutritionFoods(
  session: Pick<Session, "access_token"> | null,
  query: string,
  fetcher?: typeof fetch
) {
  const encodedQuery = encodeURIComponent(query.trim());
  return createApiClient({ fetcher, session }).getJson<FoodSearchItem[]>(
    `/nutrition/search?query=${encodedQuery}`
  );
}

export function addNutritionLog(
  session: Pick<Session, "access_token"> | null,
  payload: AddNutritionLogPayload,
  fetcher?: typeof fetch
) {
  return createApiClient({ fetcher, session }).postJson<AddNutritionLogResponse, AddNutritionLogPayload>(
    "/nutrition/add-log",
    payload
  );
}

export function updateNutritionLog(
  session: Pick<Session, "access_token"> | null,
  logId: string,
  payload: UpdateNutritionLogPayload,
  fetcher?: typeof fetch
) {
  const encodedLogId = encodeURIComponent(logId);
  return createApiClient({ fetcher, session }).patchJson<UpdateNutritionLogResponse, UpdateNutritionLogPayload>(
    `/nutrition/logs/${encodedLogId}`,
    payload
  );
}

export function deleteNutritionLog(
  session: Pick<Session, "access_token"> | null,
  logId: string,
  fetcher?: typeof fetch
) {
  const encodedLogId = encodeURIComponent(logId);
  return createApiClient({ fetcher, session }).deleteJson<DeleteNutritionLogResponse>(
    `/nutrition/logs/${encodedLogId}`
  );
}
