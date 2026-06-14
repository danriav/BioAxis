import type { Session } from "@supabase/supabase-js";

import { createApiClient } from "@/lib/api/client";

export type NutritionTargets = {
  carbs: number;
  fat: number;
  kcal: number;
  protein: number;
};

export function getNutritionTargets(
  session: Pick<Session, "access_token"> | null,
  fetcher?: typeof fetch
) {
  return createApiClient({ fetcher, session }).getJson<NutritionTargets>("/nutrition/targets/me");
}
