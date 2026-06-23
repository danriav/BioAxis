import type { Session } from "@supabase/supabase-js";

import { createApiClient } from "@/lib/api/client";
import type { AthleteGender } from "@/lib/api/profile";

export type BiometricHistoryEntry = {
  antebrazo: number | null;
  brazo: number | null;
  cadera: number | null;
  cintura: number | null;
  genero: AthleteGender | null;
  gluteo: number | null;
  hombros: number | null;
  is_current: boolean;
  pantorrilla: number | null;
  pecho: number | null;
  peso: number | null;
  pierna: number | null;
  ratio_curvatura: number | null;
  ratio_simetria: number | null;
  recorded_at: string;
};

export type BiometricHistoryResponse = {
  count: number;
  entries: BiometricHistoryEntry[];
  status: "empty" | "ready";
};

export function getProfileHistory(
  session: Pick<Session, "access_token"> | null,
  fetcher?: typeof fetch
) {
  return createApiClient({ fetcher, session }).getJson<BiometricHistoryResponse>("/profile/history");
}
