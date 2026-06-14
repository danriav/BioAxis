import type { Session } from "@supabase/supabase-js";

import { MobileApiError } from "@/lib/api/client";
import {
  deleteNutritionLog,
  updateNutritionLog,
  type UpdateNutritionLogPayload
} from "@/lib/api/nutrition-foods";
import type { NutritionLogFoodItem } from "@/lib/api/nutrition-logs";

import type { AddFoodErrorStatus, MealSlotOption } from "./addFoodViewModel";

export type EditFoodLogInput = {
  logId: string;
  mealSlot: MealSlotOption["value"];
  quantityText: string;
  targetDate: string;
};

export type EditFoodLogValidationResult =
  | {
      payload: UpdateNutritionLogPayload;
      status: "valid";
    }
  | {
      message: string;
      status: "invalid";
    };

export function getEditableMealSlot(mealSlot: string): MealSlotOption["value"] {
  if (mealSlot === "desayuno" || mealSlot === "comida" || mealSlot === "cena" || mealSlot === "snacks") {
    return mealSlot;
  }

  if (mealSlot === "breakfast") {
    return "desayuno";
  }

  if (mealSlot === "lunch") {
    return "comida";
  }

  if (mealSlot === "dinner") {
    return "cena";
  }

  return "snacks";
}

export function createEditFoodLogInput(item: NutritionLogFoodItem, fallbackDate: string): EditFoodLogInput {
  return {
    logId: item.id,
    mealSlot: getEditableMealSlot(item.meal_slot),
    quantityText: String(Math.round(item.quantity_g)),
    targetDate: item.consumed_at || fallbackDate
  };
}

export function validateEditFoodLog(input: EditFoodLogInput): EditFoodLogValidationResult {
  const quantity = Number(input.quantityText.replace(",", "."));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { message: "Ingresa una cantidad positiva en gramos.", status: "invalid" };
  }

  return {
    payload: {
      meal_slot: input.mealSlot,
      quantity_g: quantity,
      target_date: input.targetDate
    },
    status: "valid"
  };
}

export function statusFromFoodLogMutationError(error: unknown): { message: string; status: AddFoodErrorStatus } {
  if (error instanceof MobileApiError) {
    return {
      message: error.message,
      status: error.code
    };
  }

  return {
    message: "No pudimos actualizar el alimento.",
    status: "error"
  };
}

export async function updateFoodLogAndReload(
  session: Pick<Session, "access_token"> | null,
  input: EditFoodLogInput,
  reloadLogs: () => Promise<unknown>,
  fetcher?: typeof fetch
) {
  const validation = validateEditFoodLog(input);
  if (validation.status === "invalid") {
    throw new MobileApiError("validation_error", validation.message, 422);
  }

  await updateNutritionLog(session, input.logId, validation.payload, fetcher);
  await reloadLogs();
}

export async function deleteFoodLogAndReload(
  session: Pick<Session, "access_token"> | null,
  logId: string,
  reloadLogs: () => Promise<unknown>,
  fetcher?: typeof fetch
) {
  await deleteNutritionLog(session, logId, fetcher);
  await reloadLogs();
}
