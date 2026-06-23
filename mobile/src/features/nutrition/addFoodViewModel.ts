import type { Session } from "@supabase/supabase-js";

import { MobileApiError } from "@/lib/api/client";
import { addNutritionLog, type AddNutritionLogPayload, type FoodSearchItem } from "@/lib/api/nutrition-foods";

export type AddFoodErrorStatus =
  | "error"
  | "forbidden"
  | "missing_session"
  | "network_error"
  | "not_found"
  | "session_expired"
  | "unexpected_error"
  | "validation_error";

export type MealSlotOption = {
  label: string;
  value: "desayuno" | "comida" | "cena" | "snacks";
};

export const mealSlotOptions: MealSlotOption[] = [
  { label: "Desayuno", value: "desayuno" },
  { label: "Comida", value: "comida" },
  { label: "Cena", value: "cena" },
  { label: "Snacks", value: "snacks" }
];

export type AddFoodFormInput = {
  food: FoodSearchItem | null;
  mealSlot: MealSlotOption["value"];
  quantityText: string;
  targetDate: string;
};

export type AddFoodValidationResult =
  | {
      payload: AddNutritionLogPayload;
      status: "valid";
    }
  | {
      message: string;
      status: "invalid";
    };

export function getFoodDisplayName(food: FoodSearchItem) {
  return food.name_es ?? "Alimento";
}

export function getFoodMacroSummary(food: FoodSearchItem) {
  const kcalPer100 = Math.round((food.calories_per_g ?? 0) * 100);
  const proteinPer100 = Math.round((food.protein_per_g ?? 0) * 100);

  if (kcalPer100 === 0 && proteinPer100 === 0) {
    return food.category ?? "Catálogo nutricional";
  }

  return `${kcalPer100} kcal / 100 g - ${proteinPer100} g proteína`;
}

export function validateAddFoodForm(input: AddFoodFormInput): AddFoodValidationResult {
  if (!input.food?.id) {
    return { message: "Selecciona un alimento de la búsqueda.", status: "invalid" };
  }

  const quantity = Number(input.quantityText.replace(",", "."));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { message: "Ingresa una cantidad positiva en gramos.", status: "invalid" };
  }

  return {
    payload: {
      food_id: input.food.id,
      meal_slot: input.mealSlot,
      quantity_g: quantity,
      target_date: input.targetDate
    },
    status: "valid"
  };
}

export function statusFromAddFoodError(error: unknown): { message: string; status: AddFoodErrorStatus } {
  if (error instanceof MobileApiError) {
    return {
      message: error.message,
      status: error.code
    };
  }

  return {
    message: "No pudimos registrar el alimento.",
    status: "error"
  };
}

export async function saveFoodLogAndReload(
  session: Pick<Session, "access_token"> | null,
  input: AddFoodFormInput,
  reloadLogs: () => Promise<unknown>,
  fetcher?: typeof fetch
) {
  const validation = validateAddFoodForm(input);
  if (validation.status === "invalid") {
    throw new MobileApiError("validation_error", validation.message, 422);
  }

  await addNutritionLog(session, validation.payload, fetcher);
  await reloadLogs();
}
