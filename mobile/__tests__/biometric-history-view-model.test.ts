import {
  biometricMetricGroups,
  biometricMetricOptions,
  formatBiometricValue,
  getBiometricAnalysis,
  getBiometricChartLayout,
  getBiometricChartPoints,
  getCurrentBiometricEntry,
  getEmptyMetricMessage,
  getEvolutionAvailability,
  getRatioChartSeries,
  getBiometricTrend,
  normalizeBiometricHistory,
  statusFromBiometricHistoryError
} from "@/features/dashboard/biometricHistoryViewModel";
import { MobileApiError } from "@/lib/api/client";
import type {
  BiometricHistoryEntry,
  BiometricHistoryResponse
} from "@/lib/api/profile-history";

const baseEntry: BiometricHistoryEntry = {
  antebrazo: null,
  brazo: null,
  cadera: 96,
  cintura: 72,
  genero: "mujer",
  gluteo: null,
  hombros: 104,
  is_current: false,
  pantorrilla: null,
  pecho: null,
  peso: 62,
  pierna: null,
  ratio_curvatura: 0.75,
  ratio_simetria: 1.08,
  recorded_at: "2026-06-01T12:00:00Z"
};

describe("biometric history view model", () => {
  it("sorts ready entries chronologically and verifies count consistency", () => {
    const response: BiometricHistoryResponse = {
      count: 2,
      entries: [
        { ...baseEntry, is_current: true, peso: 61, recorded_at: "2026-06-18T12:00:00Z" },
        baseEntry
      ],
      status: "ready"
    };

    expect(normalizeBiometricHistory(response)).toMatchObject({
      count: 2,
      isCountConsistent: true,
      status: "ready"
    });
    expect(normalizeBiometricHistory(response).entries.map((entry) => entry.peso)).toEqual([62, 61]);
  });

  it("normalizes empty responses and detects inconsistent counts", () => {
    expect(normalizeBiometricHistory({ count: 0, entries: [], status: "empty" })).toEqual({
      count: 0,
      entries: [],
      isCountConsistent: true,
      status: "empty"
    });
    expect(
      normalizeBiometricHistory({ count: 5, entries: [baseEntry], status: "ready" })
        .isCountConsistent
    ).toBe(false);
  });

  it("filters null measures and ratios without crashing", () => {
    const entries = [
      baseEntry,
      {
        ...baseEntry,
        cadera: null,
        peso: null,
        ratio_curvatura: null,
        recorded_at: "2026-06-18T12:00:00Z"
      }
    ];

    expect(getBiometricChartPoints(entries, "peso")).toHaveLength(1);
    expect(getBiometricChartPoints(entries, "cadera")).toHaveLength(1);
    expect(getBiometricChartPoints(entries, "ratio_curvatura")).toHaveLength(1);
  });

  it("supports male curvature as an empty series", () => {
    const maleEntry = { ...baseEntry, genero: "hombre" as const, ratio_curvatura: null };

    expect(getBiometricChartPoints([maleEntry], "ratio_curvatura")).toEqual([]);
    expect(getBiometricChartPoints([maleEntry], "ratio_simetria")).toHaveLength(1);
  });

  it("builds the female symmetry and curvature series from backend ratios", () => {
    const series = getRatioChartSeries([
      baseEntry,
      {
        ...baseEntry,
        ratio_curvatura: 0.72,
        ratio_simetria: 1.1,
        recorded_at: "2026-06-18T12:00:00Z"
      }
    ]);

    expect(series.symmetry.map((point) => point.value)).toEqual([1.08, 1.1]);
    expect(series.curvature.map((point) => point.value)).toEqual([0.75, 0.72]);
  });

  it("uses backend ratios and exposes web-parity targets without recalculating", () => {
    const current = {
      ...baseEntry,
      brazo: 32,
      is_current: true,
      pantorrilla: 35,
      ratio_curvatura: 0.74,
      ratio_simetria: 1.06
    };

    expect(getBiometricAnalysis([current])).toMatchObject({
      current,
      extremityBalance: 3,
      hourglass: 0.74,
      hourglassTarget: 0.7,
      xFrame: 1.06,
      xFrameTarget: 1
    });
  });

  it("omits hourglass for men and tolerates incomplete extremity measures", () => {
    const current = {
      ...baseEntry,
      brazo: null,
      genero: "hombre" as const,
      is_current: true,
      pantorrilla: 35,
      ratio_curvatura: null,
      ratio_simetria: 1.53
    };

    expect(getBiometricAnalysis([current])).toMatchObject({
      extremityBalance: null,
      hourglass: null,
      xFrame: 1.53
    });
  });

  it("prefers the explicitly current entry over the last chronological row", () => {
    const current = { ...baseEntry, is_current: true, peso: 61 };
    const later = { ...baseEntry, peso: 63, recorded_at: "2026-06-20T12:00:00Z" };

    expect(getCurrentBiometricEntry([current, later])).toBe(current);
  });

  it("calculates current trend from chronological points", () => {
    const points = getBiometricChartPoints(
      [
        baseEntry,
        { ...baseEntry, peso: 60.5, recorded_at: "2026-06-18T12:00:00Z" }
      ],
      "peso"
    );

    expect(getBiometricTrend(points)).toEqual({
      change: -1.5,
      current: 60.5,
      direction: "down"
    });
    expect(getBiometricTrend([])).toEqual({
      change: null,
      current: null,
      direction: "neutral"
    });
  });

  it("keeps chart coordinates inside small Android widths", () => {
    const layout = getBiometricChartLayout(21, 256, 132);

    expect(layout.width).toBe(256);
    expect(layout.height).toBe(132);
    expect(layout.drawableWidth).toBeGreaterThan(0);
    expect(layout.pointSpacing).toBeGreaterThan(0);
    expect(layout.horizontalPadding + layout.drawableWidth).toBeLessThan(layout.width);
  });

  it("supports twenty or more records and repeated dates without losing points", () => {
    const entries = Array.from({ length: 25 }, (_, index) => ({
      ...baseEntry,
      peso: 60 + index / 10,
      recorded_at:
        index < 2
          ? "2026-06-01T12:00:00Z"
          : `2026-06-${String(index).padStart(2, "0")}T12:00:00Z`
    }));
    const normalized = normalizeBiometricHistory({
      count: entries.length,
      entries: [...entries].reverse(),
      status: "ready"
    });

    expect(normalized.entries).toHaveLength(25);
    expect(getBiometricChartPoints(normalized.entries, "peso")).toHaveLength(25);
    expect(normalized.entries[0].recorded_at).toBe("2026-06-01T12:00:00Z");
    expect(normalized.entries[1].recorded_at).toBe("2026-06-01T12:00:00Z");
  });

  it("distinguishes empty, insufficient and ready evolution", () => {
    expect(getEvolutionAvailability([])).toBe("empty");
    expect(getEvolutionAvailability(getBiometricChartPoints([baseEntry], "peso"))).toBe(
      "insufficient"
    );
    expect(
      getEvolutionAvailability(
        getBiometricChartPoints(
          [baseEntry, { ...baseEntry, recorded_at: "2026-06-18T12:00:00Z" }],
          "peso"
        )
      )
    ).toBe("ready");
  });

  it("exposes the complete laboratory metric selector", () => {
    expect(biometricMetricOptions.map((metric) => metric.key)).toEqual([
      "peso",
      "hombros",
      "pecho",
      "cintura",
      "cadera",
      "brazo",
      "antebrazo",
      "gluteo",
      "pierna",
      "pantorrilla",
      "ratio_simetria",
      "ratio_curvatura"
    ]);
  });

  it("groups every progression selector metric by body context", () => {
    expect(biometricMetricGroups).toEqual([
      { key: "general", metrics: ["peso"], title: "General" },
      { key: "torso", metrics: ["hombros", "pecho", "cintura", "cadera"], title: "Torso" },
      { key: "brazos", metrics: ["brazo", "antebrazo"], title: "Brazos" },
      { key: "piernas", metrics: ["gluteo", "pierna", "pantorrilla"], title: "Piernas" },
      { key: "ratios", metrics: ["ratio_simetria", "ratio_curvatura"], title: "Ratios" }
    ]);
    expect(new Set(biometricMetricGroups.flatMap((group) => group.metrics))).toEqual(
      new Set(biometricMetricOptions.map((metric) => metric.key))
    );
  });

  it("returns a specific empty state for metrics without history", () => {
    expect(getBiometricChartPoints([baseEntry], "pantorrilla")).toEqual([]);
    expect(getEmptyMetricMessage("pantorrilla")).toBe("Aún no hay registros de pantorrilla.");
  });

  it("formats measures and ratios with their appropriate precision", () => {
    expect(formatBiometricValue(62, "kg")).toBe("62 kg");
    expect(formatBiometricValue(61.25, "kg")).toBe("61.3 kg");
    expect(formatBiometricValue(1.08, "")).toBe("1.08");
  });

  it("maps missing, expired, network and unexpected errors", () => {
    expect(
      statusFromBiometricHistoryError(new MobileApiError("missing_session", "Sin sesión"))
    ).toMatchObject({ status: "missing_session" });
    expect(
      statusFromBiometricHistoryError(new MobileApiError("session_expired", "Expirada", 401))
    ).toMatchObject({ status: "session_expired" });
    expect(
      statusFromBiometricHistoryError(new MobileApiError("network_error", "Sin red"))
    ).toMatchObject({ status: "network_error" });
    expect(statusFromBiometricHistoryError(new Error("boom"))).toEqual({
      message: "No pudimos cargar tu progresión biométrica.",
      status: "error"
    });
  });
});
