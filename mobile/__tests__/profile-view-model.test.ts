import {
  defaultProfileSetupForm,
  getFirstProfileFieldError,
  getMetabolicGoalLabel,
  getProfileScreenMode,
  profileCurrentMeasureOptions,
  profileFormFromProfile,
  signOutFromProfile,
  statusFromProfileError,
  validateProfileSetupForm,
  validateProfileSetupStep,
  type ProfileSetupFormInput
} from "@/features/profile/profileViewModel";
import { MobileApiError } from "@/lib/api/client";
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

  it("returns field-level validation for each onboarding context", () => {
    expect(validateProfileSetupStep(defaultProfileSetupForm, 1)).toMatchObject({
      displayName: expect.any(String),
      genero: expect.any(String)
    });
    expect(validateProfileSetupStep({ ...validForm, peso: "" }, 2)).toEqual({
      peso: "Ingresa peso."
    });
    expect(validateProfileSetupStep({ ...validForm, cintura: "" }, 3)).toEqual({
      cintura: "Ingresa cintura."
    });
    expect(validateProfileSetupStep({ ...validForm, pantorrilla: "" }, 4)).toEqual({
      pantorrilla: "Ingresa pantorrilla."
    });
    expect(validateProfileSetupStep(validForm, 5)).toEqual({});
  });

  it("validates age and birth-date alternatives next to their fields", () => {
    expect(validateProfileSetupStep({ ...validForm, edad: "12" }, 1)).toMatchObject({
      edad: "La edad debe estar entre 13 y 100."
    });
    expect(
      validateProfileSetupStep({ ...validForm, edad: "", fechaNacimiento: "1996/04/02" }, 1)
    ).toMatchObject({
      fechaNacimiento: "Usa el formato AAAA-MM-DD."
    });
    expect(validateProfileSetupStep({ ...validForm, edad: "", fechaNacimiento: "1996-04-02" }, 1)).toEqual({});
  });

  it("exposes the first validation message for the visible feedback state", () => {
    expect(getFirstProfileFieldError({ peso: "Ingresa peso.", altura: "Ingresa altura." })).toBe(
      "Ingresa peso."
    );
    expect(getFirstProfileFieldError({})).toBeNull();
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

  it("prefills setup while preserving the required training-days contract value", () => {
    expect(profileFormFromProfile(profile)).toMatchObject({
      altura: "165",
      diasEntrenamientoSemana: "4",
      displayName: "Atleta Sandbox",
      objetivoMetabolico: "mantenimiento",
      peso: "62"
    });
  });

  it("exposes every current profile measure in the required body order", () => {
    expect(profileCurrentMeasureOptions.map((metric) => metric.key)).toEqual([
      "peso",
      "altura",
      "hombros",
      "pecho",
      "brazo",
      "antebrazo",
      "cintura",
      "cadera",
      "gluteo",
      "pierna",
      "pantorrilla"
    ]);
  });

  it("localizes metabolic goals", () => {
    expect(getMetabolicGoalLabel("deficit")).toBe("Déficit");
    expect(getMetabolicGoalLabel("mantenimiento")).toBe("Mantenimiento");
    expect(getMetabolicGoalLabel("superavit")).toBe("Superávit");
    expect(getMetabolicGoalLabel(null)).toBe("Pendiente");
  });

  it("derives complete, incomplete, loading, error and expired-session states", () => {
    expect(getProfileScreenMode({ hasProfile: true, status: "ready" })).toBe("complete");
    expect(getProfileScreenMode({ hasProfile: false, status: "empty" })).toBe("incomplete");
    expect(getProfileScreenMode({ hasProfile: false, status: "loading" })).toBe("loading");
    expect(getProfileScreenMode({ hasProfile: false, status: "network_error" })).toBe("error");
    expect(getProfileScreenMode({ hasProfile: false, status: "session_expired" })).toBe(
      "session_expired"
    );
  });

  it("maps profile API and unexpected errors to visible states", () => {
    expect(statusFromProfileError(new MobileApiError("session_expired", "Sesión expirada", 401))).toEqual({
      message: "Sesión expirada",
      status: "session_expired"
    });
    expect(statusFromProfileError(new Error("offline"))).toEqual({
      message: "No pudimos cargar el perfil.",
      status: "error"
    });
  });

  it("invokes the authenticated sign-out action", async () => {
    const signOut = jest.fn(async () => undefined);

    await signOutFromProfile(signOut);

    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
