import {
  getDashboardAthleteLabel,
  getDashboardCaloriesCard,
  getDashboardMetricCards,
  getDashboardProfileCards,
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
  it("formats athlete label and profile cards from real profile response", () => {
    expect(getDashboardAthleteLabel(profile)).toBe("Atleta Sandbox");
    expect(getDashboardProfileCards(profile)).toEqual([
      { title: "Peso actual", value: "62 kg" },
      { title: "Objetivo", value: "superavit" },
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
      { title: "Objetivo", value: "Pendiente" },
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
});
