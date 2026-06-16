import { MobileApiError } from "@/lib/api/client";
import type { AthleteProfile } from "@/lib/api/profile";
import type { NutritionTargets } from "@/lib/api/nutrition-targets";

export type DashboardStatus =
  | "empty"
  | "error"
  | "forbidden"
  | "loading"
  | "missing_session"
  | "network_error"
  | "not_found"
  | "ready"
  | "session_expired"
  | "unexpected_error"
  | "validation_error";

export type DashboardCard = {
  title: string;
  value: string;
};

export function statusFromDashboardError(error: unknown): { message: string; status: DashboardStatus } {
  if (error instanceof MobileApiError) {
    return {
      message: error.message,
      status: error.code
    };
  }

  return {
    message: "No pudimos cargar tu dashboard.",
    status: "error"
  };
}

function formatNumber(value: number | null | undefined, unit: string) {
  return value === null || value === undefined ? "Pendiente" : `${Math.round(value)} ${unit}`;
}

export function getDashboardAthleteLabel(profile: AthleteProfile | null) {
  return profile?.display_name?.trim() || "Atleta Kalos";
}

export function getDashboardProfileCards(profile: AthleteProfile): DashboardCard[] {
  return [
    { title: "Peso actual", value: formatNumber(profile.peso, "kg") },
    { title: "Objetivo", value: profile.objetivo_metabolico ?? "Pendiente" },
    {
      title: "Entrenamiento",
      value:
        profile.dias_entrenamiento_semana === null || profile.dias_entrenamiento_semana === undefined
          ? "Pendiente"
          : `${profile.dias_entrenamiento_semana} días/semana`
    }
  ];
}

export function getDashboardMetricCards(profile: AthleteProfile): DashboardCard[] {
  return [
    { title: "Hombros", value: formatNumber(profile.hombros, "cm") },
    { title: "Cintura", value: formatNumber(profile.cintura, "cm") },
    { title: "Cadera", value: formatNumber(profile.cadera, "cm") }
  ];
}

export function getDashboardCaloriesCard(targets: NutritionTargets | null): DashboardCard {
  if (!targets) {
    return { title: "Calorías objetivo", value: "Pendiente de nutrición" };
  }

  return { title: "Calorías objetivo", value: `${Math.round(targets.kcal)} kcal` };
}
