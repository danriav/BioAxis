import { MobileApiError } from "@/lib/api/client";
import type { AthleteProfile } from "@/lib/api/profile";
import type { NutritionDayTotals } from "@/lib/api/nutrition-logs";
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

export type DashboardNutritionSummary = {
  consumed: number;
  progress: number;
  remaining: number;
  target: number;
};

type DashboardSourceStatus = DashboardStatus | "success";

type DeriveDashboardStateInput = {
  logsMessage: string | null;
  logsStatus: DashboardSourceStatus;
  profileMessage: string | null;
  profileStatus: DashboardStatus;
  targetsMessage: string | null;
  targetsStatus: DashboardSourceStatus;
};

export type DerivedDashboardState = {
  message: string | null;
  status: DashboardStatus;
};

export function deriveDashboardState({
  profileStatus,
  profileMessage,
  logsStatus,
  logsMessage,
  targetsStatus,
  targetsMessage
}: DeriveDashboardStateInput): DerivedDashboardState {
  const sources = [
    { message: profileMessage, status: profileStatus },
    { message: logsMessage, status: logsStatus },
    { message: targetsMessage, status: targetsStatus }
  ];

  for (const status of ["session_expired", "missing_session"] as const) {
    const source = sources.find((candidate) => candidate.status === status);
    if (source) {
      return { message: source.message, status };
    }
  }

  const forbidden = sources.find((source) => source.status === "forbidden");
  if (forbidden) {
    return { message: forbidden.message, status: "forbidden" };
  }

  for (const status of [
    "network_error",
    "unexpected_error",
    "error",
    "not_found",
    "validation_error"
  ] as const) {
    const source = sources.find((candidate) => candidate.status === status);
    if (source) {
      return { message: source.message, status };
    }
  }

  if (sources.some((source) => source.status === "loading")) {
    return { message: null, status: "loading" };
  }

  if (profileStatus === "empty") {
    return { message: profileMessage, status: "empty" };
  }

  return { message: null, status: "ready" };
}

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

export function formatDashboardGoal(goal: string | null | undefined) {
  if (!goal) {
    return "Objetivo pendiente";
  }

  const labels: Record<string, string> = {
    deficit: "Déficit",
    hipertrofia: "Hipertrofia",
    mantenimiento: "Mantenimiento",
    recomposicion: "Recomposición",
    superavit: "Superávit"
  };

  return labels[goal.toLowerCase()] ?? `${goal.charAt(0).toUpperCase()}${goal.slice(1)}`;
}

export function getDashboardAthleteLabel(profile: AthleteProfile | null) {
  return profile?.display_name?.trim() || "Atleta Kalos";
}

export function getDashboardProfileCards(profile: AthleteProfile): DashboardCard[] {
  return [
    { title: "Peso actual", value: formatNumber(profile.peso, "kg") },
    { title: "Objetivo", value: formatDashboardGoal(profile.objetivo_metabolico) },
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

export function getDashboardNutritionSummary(
  totals: NutritionDayTotals | null,
  targets: NutritionTargets | null
): DashboardNutritionSummary | null {
  if (!totals || !targets) {
    return null;
  }

  const consumed = Math.max(0, Math.round(totals.kcal));
  const target = Math.max(0, Math.round(targets.kcal));

  return {
    consumed,
    progress: target > 0 ? Math.min(consumed / target, 1) : 0,
    remaining: Math.max(target - consumed, 0),
    target
  };
}

export function getDashboardTrainingSummary(profile: AthleteProfile | null) {
  const days = profile?.dias_entrenamiento_semana;

  return {
    detail: "Genera un preview cuando quieras entrenar.",
    value:
      days === null || days === undefined
        ? "Frecuencia pendiente"
        : `${days} ${days === 1 ? "día" : "días"} por semana`
  };
}
