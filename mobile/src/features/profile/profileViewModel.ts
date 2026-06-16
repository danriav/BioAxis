import { MobileApiError } from "@/lib/api/client";
import type {
  AthleteProfile,
  AthleteGender,
  MetabolicGoal,
  ProfileSetupPayload
} from "@/lib/api/profile";

export type ProfileUiStatus =
  | "empty"
  | "error"
  | "forbidden"
  | "idle"
  | "loading"
  | "missing_session"
  | "network_error"
  | "not_found"
  | "ready"
  | "session_expired"
  | "success"
  | "unexpected_error"
  | "validation_error";

export type ProfileSetupFormInput = {
  altura: string;
  antebrazo: string;
  brazo: string;
  cadera: string;
  cintura: string;
  diasEntrenamientoSemana: string;
  displayName: string;
  edad: string;
  fechaNacimiento: string;
  genero: AthleteGender | "";
  gluteo: string;
  hombros: string;
  objetivoMetabolico: MetabolicGoal;
  pantorrilla: string;
  pecho: string;
  peso: string;
  pierna: string;
};

export type ProfileSetupValidation =
  | {
      payload: ProfileSetupPayload;
      status: "valid";
    }
  | {
      message: string;
      status: "invalid";
    };

export const defaultProfileSetupForm: ProfileSetupFormInput = {
  altura: "",
  antebrazo: "",
  brazo: "",
  cadera: "",
  cintura: "",
  diasEntrenamientoSemana: "3",
  displayName: "",
  edad: "",
  fechaNacimiento: "",
  genero: "",
  gluteo: "",
  hombros: "",
  objetivoMetabolico: "mantenimiento",
  pantorrilla: "",
  pecho: "",
  peso: "",
  pierna: ""
};

export const genderOptions: { label: string; value: AthleteGender }[] = [
  { label: "Hombre", value: "hombre" },
  { label: "Mujer", value: "mujer" }
];

export const metabolicGoalOptions: { label: string; value: MetabolicGoal }[] = [
  { label: "Deficit", value: "deficit" },
  { label: "Mantenimiento", value: "mantenimiento" },
  { label: "Superavit", value: "superavit" }
];

function parsePositiveNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseInteger(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function requireMetric(input: ProfileSetupFormInput, key: keyof ProfileSetupFormInput, label: string) {
  const value = parsePositiveNumber(String(input[key] ?? ""));
  if (value === null) {
    return { message: `Ingresa ${label}.`, value: null };
  }
  return { message: null, value };
}

export function validateProfileSetupForm(input: ProfileSetupFormInput): ProfileSetupValidation {
  const displayName = input.displayName.trim();
  if (!displayName) {
    return { message: "Ingresa tu nombre.", status: "invalid" };
  }

  if (!input.genero) {
    return { message: "Selecciona genero.", status: "invalid" };
  }

  const age = input.edad.trim() ? parseInteger(input.edad.trim()) : null;
  const birthDate = input.fechaNacimiento.trim();
  if (!age && !birthDate) {
    return { message: "Ingresa edad o fecha de nacimiento.", status: "invalid" };
  }

  if (age !== null && (age < 13 || age > 100)) {
    return { message: "La edad debe estar entre 13 y 100.", status: "invalid" };
  }

  const trainingDays = parseInteger(input.diasEntrenamientoSemana);
  if (trainingDays === null || trainingDays < 0 || trainingDays > 7) {
    return { message: "Los dias de entrenamiento deben estar entre 0 y 7.", status: "invalid" };
  }

  const metricSpecs: [keyof ProfileSetupFormInput, string][] = [
    ["peso", "peso"],
    ["altura", "altura"],
    ["hombros", "hombros"],
    ["pecho", "pecho"],
    ["brazo", "brazo"],
    ["antebrazo", "antebrazo"],
    ["cintura", "cintura"],
    ["cadera", "cadera"],
    ["gluteo", "gluteo"],
    ["pierna", "pierna"],
    ["pantorrilla", "pantorrilla"]
  ];
  const metrics: Record<string, number> = {};

  for (const [key, label] of metricSpecs) {
    const result = requireMetric(input, key, label);
    if (result.value === null) {
      return { message: result.message ?? "Completa tus medidas.", status: "invalid" };
    }
    metrics[key] = result.value;
  }

  const payload: ProfileSetupPayload = {
    altura: metrics.altura,
    antebrazo: metrics.antebrazo,
    brazo: metrics.brazo,
    cadera: metrics.cadera,
    cintura: metrics.cintura,
    dias_entrenamiento_semana: trainingDays,
    display_name: displayName,
    genero: input.genero,
    gluteo: metrics.gluteo,
    hombros: metrics.hombros,
    objetivo_metabolico: input.objetivoMetabolico,
    pantorrilla: metrics.pantorrilla,
    pecho: metrics.pecho,
    peso: metrics.peso,
    pierna: metrics.pierna
  };

  if (age !== null) {
    payload.edad = age;
  } else {
    payload.fecha_nacimiento = birthDate;
  }

  return { payload, status: "valid" };
}

export function statusFromProfileError(error: unknown): { message: string; status: ProfileUiStatus } {
  if (error instanceof MobileApiError) {
    return {
      message: error.message,
      status: error.code
    };
  }

  return {
    message: "No pudimos cargar el perfil.",
    status: "error"
  };
}

export function getProfileSummaryCards(profile: AthleteProfile) {
  return [
    { title: "Peso", value: profile.peso ? `${Math.round(profile.peso)} kg` : "Pendiente" },
    { title: "Altura", value: profile.altura ? `${Math.round(profile.altura)} cm` : "Pendiente" },
    { title: "Objetivo", value: profile.objetivo_metabolico ?? "Pendiente" },
    {
      title: "Entrenamiento",
      value:
        profile.dias_entrenamiento_semana !== null && profile.dias_entrenamiento_semana !== undefined
          ? `${profile.dias_entrenamiento_semana} dias/semana`
          : "Pendiente"
    }
  ];
}
