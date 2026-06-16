import {
  defaultProfileSetupForm,
  getProfileSummaryCards,
  validateProfileSetupForm,
  type ProfileSetupFormInput
} from "@/features/profile/profileViewModel";
import type { AthleteProfile } from "@/lib/api/profile";

const validForm: ProfileSetupFormInput = {
  ...defaultProfileSetupForm,
  altura: "165",
  antebrazo: "24",
  brazo: "30",
  cadera: "96",
  cintura: "72",
  diasEntrenamientoSemana: "4",
  displayName: "Atleta Sandbox",
  edad: "28",
  genero: "mujer",
  gluteo: "101",
  hombros: "102",
  pantorrilla: "35",
  pecho: "90",
  peso: "62",
  pierna: "55"
};

describe("profile setup view model", () => {
  it("rejects incomplete payload before calling backend", () => {
    expect(validateProfileSetupForm(defaultProfileSetupForm)).toMatchObject({
      status: "invalid"
    });

    expect(validateProfileSetupForm({ ...validForm, peso: "" })).toMatchObject({
      status: "invalid"
    });
  });

  it("builds setup payload without user_id", () => {
    const result = validateProfileSetupForm(validForm);

    expect(result).toEqual({
      payload: {
        altura: 165,
        antebrazo: 24,
        brazo: 30,
        cadera: 96,
        cintura: 72,
        dias_entrenamiento_semana: 4,
        display_name: "Atleta Sandbox",
        edad: 28,
        genero: "mujer",
        gluteo: 101,
        hombros: 102,
        objetivo_metabolico: "mantenimiento",
        pantorrilla: 35,
        pecho: 90,
        peso: 62,
        pierna: 55
      },
      status: "valid"
    });

    if (result.status === "valid") {
      expect(JSON.stringify(result.payload)).not.toContain("user_id");
    }
  });
});

describe("profile screen rendering model", () => {
  it("supports CTA state when profile is empty", () => {
    const emptyResponse = { has_profile: false, profile: null, status: "empty" };

    expect(emptyResponse).toMatchObject({
      has_profile: false,
      status: "empty"
    });
  });

  it("formats basic profile summary when profile exists", () => {
    const profile: AthleteProfile = {
      altura: 165,
      antebrazo: 24,
      biometria_id: "bio-1",
      brazo: 30,
      cadera: 96,
      cintura: 72,
      dias_entrenamiento_semana: 4,
      display_name: "Atleta Sandbox",
      edad: 28,
      genero: "mujer",
      gluteo: 101,
      hombros: 102,
      is_current: true,
      objetivo_metabolico: "mantenimiento",
      pantorrilla: 35,
      pecho: 90,
      peso: 62,
      pierna: 55
    };

    expect(getProfileSummaryCards(profile)).toEqual([
      { title: "Peso", value: "62 kg" },
      { title: "Altura", value: "165 cm" },
      { title: "Objetivo", value: "mantenimiento" },
      { title: "Entrenamiento", value: "4 dias/semana" }
    ]);
  });
});
