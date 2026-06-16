import type { Session } from "@supabase/supabase-js";

import { createApiClient } from "@/lib/api/client";

export type MetabolicGoal = "deficit" | "mantenimiento" | "superavit";
export type AthleteGender = "hombre" | "mujer";

export type AthleteProfile = {
  altura: number | null;
  antebrazo: number | null;
  biometria_id: string | null;
  brazo: number | null;
  cadera: number | null;
  cintura: number | null;
  dias_entrenamiento_semana: number | null;
  display_name: string | null;
  edad: number | null;
  genero: AthleteGender | null;
  gluteo: number | null;
  hombros: number | null;
  is_current: boolean;
  objetivo_metabolico: MetabolicGoal | string | null;
  pantorrilla: number | null;
  pecho: number | null;
  peso: number | null;
  pierna: number | null;
};

export type ProfileMeResponse = {
  has_profile: boolean;
  profile: AthleteProfile | null;
  status: "empty" | "ready";
};

export type ProfileSetupPayload = {
  altura: number;
  antebrazo: number;
  brazo: number;
  cadera: number;
  cintura: number;
  dias_entrenamiento_semana: number;
  display_name: string;
  edad?: number;
  fecha_nacimiento?: string;
  genero: AthleteGender;
  gluteo: number;
  hombros: number;
  objetivo_metabolico: MetabolicGoal;
  pantorrilla: number;
  pecho: number;
  peso: number;
  pierna: number;
};

export type MeasurementCreatePayload = {
  antebrazo?: number;
  brazo?: number;
  cadera?: number;
  cintura?: number;
  dias_entrenamiento_semana?: number;
  gluteo?: number;
  hombros?: number;
  objetivo_metabolico?: MetabolicGoal;
  pantorrilla?: number;
  pecho?: number;
  peso: number;
  pierna?: number;
};

export type ProfileMutationResponse = {
  profile: AthleteProfile;
  status: "success";
};

export function getProfileMe(session: Pick<Session, "access_token"> | null, fetcher?: typeof fetch) {
  return createApiClient({ fetcher, session }).getJson<ProfileMeResponse>("/profile/me");
}

export function setupProfile(
  session: Pick<Session, "access_token"> | null,
  payload: ProfileSetupPayload,
  fetcher?: typeof fetch
) {
  return createApiClient({ fetcher, session }).postJson<ProfileMutationResponse, ProfileSetupPayload>(
    "/profile/setup",
    payload
  );
}

export function createMeasurement(
  session: Pick<Session, "access_token"> | null,
  payload: MeasurementCreatePayload,
  fetcher?: typeof fetch
) {
  return createApiClient({ fetcher, session }).postJson<ProfileMutationResponse, MeasurementCreatePayload>(
    "/profile/measurements",
    payload
  );
}
