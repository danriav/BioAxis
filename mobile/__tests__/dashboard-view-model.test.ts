import {
  deriveDashboardState,
  formatDashboardGoal,
  getDashboardAthleteLabel,
  getDashboardCaloriesCard,
  getDashboardMetricCards,
  getDashboardNutritionSummary,
  getDashboardProfileCards,
  getDashboardTrainingSummary,
  statusFromDashboardError
} from "@/features/dashboard/dashboardViewModel";
import { MobileApiError } from "@/lib/api/client";
import type { AthleteProfile } from "@/lib/api/profile";

const profile: AthleteProfile = {
  altura: 162,
  antebrazo: 26,
  biometria_id: "bio-1",
  brazo: 32,
  cadera: 98,
  cintura: 74,
  dias_entrenamiento_semana: 3,
  display_name: "Atleta Sandbox",
  edad: 30,
  genero: "mujer",
  gluteo: 103,
  hombros: 104,
  is_current: true,
  objetivo_metabolico: "superavit",
  pantorrilla: 37,
  pecho: 92,
  peso: 62,
  pierna: 57
};

describe("dashboard view model", () => {
  const readySources = {
    logsMessage: null,
    logsStatus: "success" as const,
    profileMessage: null,
    profileStatus: "ready" as const,
    targetsMessage: null,
    targetsStatus: "success" as const
  };

  it("formats athlete label and profile cards from real profile response", () => {
    expect(getDashboardAthleteLabel(profile)).toBe("Atleta Sandbox");
    expect(getDashboardProfileCards(profile)).toEqual([
      { title: "Peso actual", value: "62 kg" },
      { title: "Objetivo", value: "Superávit" },
      { title: "Entrenamiento", value: "3 días/semana" }
    ]);
  });

  it("formats main biometric metrics without exposing full biometrics", () => {
    expect(getDashboardMetricCards(profile)).toEqual([
      { title: "Hombros", value: "104 cm" },
      { title: "Cintura", value: "74 cm" },
      { title: "Cadera", value: "98 cm" }
    ]);
  });

  it("uses a neutral athlete label and pending values when fields are missing", () => {
    const emptyishProfile = {
      ...profile,
      cadera: null,
      cintura: null,
      dias_entrenamiento_semana: null,
      display_name: null,
      hombros: null,
      objetivo_metabolico: null,
      peso: null
    };

    expect(getDashboardAthleteLabel(emptyishProfile)).toBe("Atleta Kalos");
    expect(getDashboardProfileCards(emptyishProfile)).toEqual([
      { title: "Peso actual", value: "Pendiente" },
      { title: "Objetivo", value: "Objetivo pendiente" },
      { title: "Entrenamiento", value: "Pendiente" }
    ]);
    expect(getDashboardMetricCards(emptyishProfile)).toEqual([
      { title: "Hombros", value: "Pendiente" },
      { title: "Cintura", value: "Pendiente" },
      { title: "Cadera", value: "Pendiente" }
    ]);
  });

  it("shows calories from backend targets or pending nutrition state", () => {
    expect(getDashboardCaloriesCard({ carbs: 220, fat: 70, kcal: 2100, protein: 160 })).toEqual({
      title: "Calorías objetivo",
      value: "2100 kcal"
    });
    expect(getDashboardCaloriesCard(null)).toEqual({
      title: "Calorías objetivo",
      value: "Pendiente de nutrición"
    });
  });

  it("builds today's nutrition progress only from backend totals and targets", () => {
    expect(
      getDashboardNutritionSummary(
        { carbs: 88, fat: 12, kcal: 613, protein: 42 },
        { carbs: 220, fat: 70, kcal: 2100, protein: 160 }
      )
    ).toEqual({
      consumed: 613,
      progress: 613 / 2100,
      remaining: 1487,
      target: 2100
    });
    expect(getDashboardNutritionSummary(null, { carbs: 220, fat: 70, kcal: 2100, protein: 160 })).toBeNull();
    expect(
      getDashboardNutritionSummary(
        { carbs: 300, fat: 120, kcal: 2600, protein: 190 },
        { carbs: 220, fat: 70, kcal: 2100, protein: 160 }
      )
    ).toMatchObject({
      progress: 1,
      remaining: 0
    });
  });

  it("formats honest training and metabolic goal summaries", () => {
    expect(formatDashboardGoal("superavit")).toBe("Superávit");
    expect(formatDashboardGoal("recomposicion")).toBe("Recomposición");
    expect(formatDashboardGoal(null)).toBe("Objetivo pendiente");
    expect(getDashboardTrainingSummary(profile)).toEqual({
      detail: "Genera un preview cuando quieras entrenar.",
      value: "3 días por semana"
    });
    expect(getDashboardTrainingSummary(null)).toMatchObject({
      value: "Frecuencia pendiente"
    });
  });

  it("maps API errors into dashboard states", () => {
    expect(statusFromDashboardError(new MobileApiError("session_expired", "Sesion expirada", 401))).toEqual({
      message: "Sesion expirada",
      status: "session_expired"
    });
    expect(statusFromDashboardError(new Error("boom"))).toEqual({
      message: "No pudimos cargar tu dashboard.",
      status: "error"
    });
  });

  it("prioritizes logs session expiration over a ready profile", () => {
    expect(
      deriveDashboardState({
        ...readySources,
        logsMessage: "Sesión expirada",
        logsStatus: "session_expired"
      })
    ).toEqual({
      message: "Sesión expirada",
      status: "session_expired"
    });
  });

  it("surfaces target network errors over a ready profile", () => {
    expect(
      deriveDashboardState({
        ...readySources,
        targetsMessage: "Backend no disponible",
        targetsStatus: "network_error"
      })
    ).toEqual({
      message: "Backend no disponible",
      status: "network_error"
    });
  });

  it("keeps dashboard loading while nutrition is loading", () => {
    expect(
      deriveDashboardState({
        ...readySources,
        logsStatus: "loading"
      })
    ).toEqual({
      message: null,
      status: "loading"
    });
  });

  it("is ready when nutrition succeeds without registered foods", () => {
    expect(deriveDashboardState(readySources)).toEqual({
      message: null,
      status: "ready"
    });
    expect(
      getDashboardNutritionSummary(
        { carbs: 0, fat: 0, kcal: 0, protein: 0 },
        { carbs: 220, fat: 70, kcal: 2100, protein: 160 }
      )
    ).toMatchObject({
      consumed: 0,
      remaining: 2100
    });
  });

  it("is ready when profile, logs and targets all succeed", () => {
    expect(deriveDashboardState(readySources).status).toBe("ready");
  });

  it("prioritizes session expiration over loading", () => {
    expect(
      deriveDashboardState({
        ...readySources,
        logsStatus: "loading",
        targetsMessage: "Sesión expirada",
        targetsStatus: "session_expired"
      })
    ).toEqual({
      message: "Sesión expirada",
      status: "session_expired"
    });
  });
});
