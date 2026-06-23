import { MobileApiError } from "@/lib/api/client";
import type {
  BiometricHistoryEntry,
  BiometricHistoryResponse
} from "@/lib/api/profile-history";

export type BiometricMetricKey =
  | "peso"
  | "gluteo"
  | "pierna"
  | "pantorrilla"
  | "cintura"
  | "cadera"
  | "hombros"
  | "pecho"
  | "brazo"
  | "antebrazo"
  | "ratio_simetria"
  | "ratio_curvatura";

export type BiometricMetricGroupKey = "general" | "torso" | "brazos" | "piernas" | "ratios";

export type BiometricHistoryStatus =
  | "empty"
  | "error"
  | "loading"
  | "missing_session"
  | "network_error"
  | "ready"
  | "session_expired";

export type BiometricChartPoint = {
  date: string;
  label: string;
  value: number;
};

export const biometricMetricOptions: {
  color: string;
  group: BiometricMetricGroupKey;
  key: BiometricMetricKey;
  label: string;
  shortLabel: string;
  unit: string;
}[] = [
  { color: "#33d6c5", group: "general", key: "peso", label: "Peso", shortLabel: "Peso", unit: "kg" },
  { color: "#f6c85f", group: "torso", key: "hombros", label: "Hombros", shortLabel: "Hombros", unit: "cm" },
  { color: "#3b82f6", group: "torso", key: "pecho", label: "Pecho", shortLabel: "Pecho", unit: "cm" },
  { color: "#67aef7", group: "torso", key: "cintura", label: "Cintura", shortLabel: "Cintura", unit: "cm" },
  { color: "#a78bfa", group: "torso", key: "cadera", label: "Cadera", shortLabel: "Cadera", unit: "cm" },
  { color: "#14b8a6", group: "brazos", key: "brazo", label: "Brazo", shortLabel: "Brazo", unit: "cm" },
  {
    color: "#22c55e",
    group: "brazos",
    key: "antebrazo",
    label: "Antebrazo",
    shortLabel: "Antebrazo",
    unit: "cm"
  },
  { color: "#f43f5e", group: "piernas", key: "gluteo", label: "Glúteo", shortLabel: "Glúteo", unit: "cm" },
  { color: "#ec4899", group: "piernas", key: "pierna", label: "Pierna", shortLabel: "Pierna", unit: "cm" },
  {
    color: "#d946ef",
    group: "piernas",
    key: "pantorrilla",
    label: "Pantorrilla",
    shortLabel: "Pantorrilla",
    unit: "cm"
  },
  {
    color: "#52d39b",
    group: "ratios",
    key: "ratio_simetria",
    label: "Ratio de simetría",
    shortLabel: "Simetría",
    unit: ""
  },
  {
    color: "#ff7a72",
    group: "ratios",
    key: "ratio_curvatura",
    label: "Ratio de curvatura",
    shortLabel: "Curvatura",
    unit: ""
  }
];

export const biometricMetricGroups: {
  key: BiometricMetricGroupKey;
  metrics: BiometricMetricKey[];
  title: string;
}[] = [
  { key: "general", metrics: ["peso"], title: "General" },
  { key: "torso", metrics: ["hombros", "pecho", "cintura", "cadera"], title: "Torso" },
  { key: "brazos", metrics: ["brazo", "antebrazo"], title: "Brazos" },
  { key: "piernas", metrics: ["gluteo", "pierna", "pantorrilla"], title: "Piernas" },
  { key: "ratios", metrics: ["ratio_simetria", "ratio_curvatura"], title: "Ratios" }
];

export const dashboardBodyMeasureGroups: {
  metrics: BiometricMetricKey[];
  title: string;
}[] = [
  { metrics: ["hombros", "pecho", "cintura", "cadera"], title: "Torso" },
  { metrics: ["brazo", "antebrazo"], title: "Brazos" },
  { metrics: ["gluteo", "pierna", "pantorrilla"], title: "Piernas" }
];

export const X_FRAME_TARGET = 1;
export const HOURGLASS_TARGET = 0.7;

export function normalizeBiometricHistory(response: BiometricHistoryResponse) {
  const entries = [...response.entries].sort(
    (left, right) => Date.parse(left.recorded_at) - Date.parse(right.recorded_at)
  );
  return {
    count: entries.length,
    entries,
    isCountConsistent: response.count === entries.length,
    status: entries.length === 0 ? ("empty" as const) : ("ready" as const)
  };
}

export function getBiometricMetric(key: BiometricMetricKey) {
  return biometricMetricOptions.find((metric) => metric.key === key) ?? biometricMetricOptions[0];
}

export function getBiometricMetricsByGroup(group: BiometricMetricGroupKey) {
  return biometricMetricOptions.filter((metric) => metric.group === group);
}

export function getEmptyMetricMessage(metric: BiometricMetricKey) {
  return `Aún no hay registros de ${getBiometricMetric(metric).label.toLowerCase()}.`;
}

export function getBiometricChartPoints(
  entries: BiometricHistoryEntry[],
  metric: BiometricMetricKey
): BiometricChartPoint[] {
  return entries.flatMap((entry) => {
    const value = entry[metric];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return [];
    }
    return [
      {
        date: entry.recorded_at,
        label: formatBiometricDate(entry.recorded_at),
        value
      }
    ];
  });
}

export function getBiometricTrend(points: BiometricChartPoint[]) {
  if (points.length === 0) {
    return { change: null, current: null, direction: "neutral" as const };
  }
  const current = points[points.length - 1].value;
  if (points.length === 1) {
    return { change: null, current, direction: "neutral" as const };
  }
  const change = Number((current - points[0].value).toFixed(2));
  return {
    change,
    current,
    direction: change > 0 ? ("up" as const) : change < 0 ? ("down" as const) : ("neutral" as const)
  };
}

export function getCurrentBiometricEntry(entries: BiometricHistoryEntry[]) {
  return entries.findLast((entry) => entry.is_current) ?? entries[entries.length - 1] ?? null;
}

export function getBiometricAnalysis(entries: BiometricHistoryEntry[]) {
  const current = getCurrentBiometricEntry(entries);
  if (!current) {
    return {
      current: null,
      extremityBalance: null,
      hourglass: null,
      hourglassTarget: HOURGLASS_TARGET,
      xFrame: null,
      xFrameTarget: X_FRAME_TARGET
    };
  }
  const extremityBalance =
    typeof current.brazo === "number" && typeof current.pantorrilla === "number"
      ? Number(Math.abs(current.brazo - current.pantorrilla).toFixed(1))
      : null;
  return {
    current,
    extremityBalance,
    hourglass: current.ratio_curvatura,
    hourglassTarget: HOURGLASS_TARGET,
    xFrame: current.ratio_simetria,
    xFrameTarget: X_FRAME_TARGET
  };
}

export function getRatioChartSeries(entries: BiometricHistoryEntry[]) {
  return {
    curvature: getBiometricChartPoints(entries, "ratio_curvatura"),
    symmetry: getBiometricChartPoints(entries, "ratio_simetria")
  };
}

export function getEvolutionAvailability(points: BiometricChartPoint[]) {
  if (points.length === 0) {
    return "empty" as const;
  }
  if (points.length === 1) {
    return "insufficient" as const;
  }
  return "ready" as const;
}

export function getBiometricChartLayout(pointCount: number, width: number, height: number) {
  const safeWidth = Math.max(240, width);
  const safeHeight = Math.max(120, height);
  const horizontalPadding = 18;
  const verticalPadding = 16;
  const drawableWidth = safeWidth - horizontalPadding * 2;
  const drawableHeight = safeHeight - verticalPadding * 2;
  return {
    drawableHeight,
    drawableWidth,
    height: safeHeight,
    horizontalPadding,
    pointSpacing: pointCount > 1 ? drawableWidth / (pointCount - 1) : 0,
    verticalPadding,
    width: safeWidth
  };
}

export function statusFromBiometricHistoryError(error: unknown): {
  message: string;
  status: BiometricHistoryStatus;
} {
  if (error instanceof MobileApiError) {
    const status =
      error.code === "missing_session" ||
      error.code === "network_error" ||
      error.code === "session_expired"
        ? error.code
        : "error";
    return { message: error.message, status };
  }
  return {
    message: "No pudimos cargar tu progresión biométrica.",
    status: "error"
  };
}

export function formatBiometricDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Fecha pendiente";
  }
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "2-digit"
  });
}

export function formatBiometricValue(value: number, unit: string) {
  const digits = unit ? 1 : 2;
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(digits);
  return unit ? `${formatted} ${unit}` : formatted;
}
