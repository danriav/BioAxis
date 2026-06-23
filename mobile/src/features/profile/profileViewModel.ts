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

export type ProfileSetupStep = 1 | 2 | 3 | 4 | 5;
export type ProfileFieldErrors = Partial<Record<keyof ProfileSetupFormInput, string>>;

export type ProfileScreenMode =
  | "complete"
  | "error"
  | "incomplete"
  | "loading"
  | "session_expired";

export type ProfileCurrentMeasureKey = keyof Pick<
  AthleteProfile,
  | "altura"
  | "antebrazo"
  | "brazo"
  | "cadera"
  | "cintura"
  | "gluteo"
  | "hombros"
  | "pantorrilla"
  | "pecho"
  | "peso"
  | "pierna"
>;

export const profileCurrentMeasureOptions: {
  key: ProfileCurrentMeasureKey;
  label: string;
  unit: "cm" | "kg";
}[] = [
  { key: "peso", label: "Peso", unit: "kg" },
  { key: "altura", label: "Altura", unit: "cm" },
  { key: "hombros", label: "Hombros", unit: "cm" },
  { key: "pecho", label: "Pecho", unit: "cm" },
  { key: "brazo", label: "Brazo", unit: "cm" },
  { key: "antebrazo", label: "Antebrazo", unit: "cm" },
  { key: "cintura", label: "Cintura", unit: "cm" },
  { key: "cadera", label: "Cadera", unit: "cm" },
  { key: "gluteo", label: "Glúteo", unit: "cm" },
  { key: "pierna", label: "Pierna", unit: "cm" },
  { key: "pantorrilla", label: "Pantorrilla", unit: "cm" }
];

export const profileSetupSteps: {
  description: string;
  step: ProfileSetupStep;
  title: string;
}[] = [
  { description: "Cómo quieres aparecer en Kalos", step: 1, title: "Identidad" },
  { description: "Tus referencias principales", step: 2, title: "Medidas base" },
  { description: "Medidas de torso y brazos", step: 3, title: "Torso" },
  { description: "Medidas de cadera y piernas", step: 4, title: "Zona inferior" },
  { description: "Objetivo y confirmación", step: 5, title: "Objetivo" }
];

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
  { label: "Déficit", value: "deficit" },
  { label: "Mantenimiento", value: "mantenimiento" },
  { label: "Superávit", value: "superavit" }
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

function validateIdentity(input: ProfileSetupFormInput): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  if (!input.displayName.trim()) {
    errors.displayName = "Ingresa el nombre que quieres mostrar.";
  }
  if (!input.genero) {
    errors.genero = "Selecciona una opción.";
  }

  const ageText = input.edad.trim();
  const birthDate = input.fechaNacimiento.trim();
  const age = ageText ? parseInteger(ageText) : null;
  if (!ageText && !birthDate) {
    errors.edad = "Ingresa tu edad o fecha de nacimiento.";
    errors.fechaNacimiento = "Ingresa tu fecha o utiliza la edad.";
  } else if (ageText && (age === null || age < 13 || age > 100)) {
    errors.edad = "La edad debe estar entre 13 y 100.";
  } else if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    errors.fechaNacimiento = "Usa el formato AAAA-MM-DD.";
  }
  return errors;
}

const metricLabels: Partial<Record<keyof ProfileSetupFormInput, string>> = {
  altura: "altura",
  antebrazo: "antebrazo",
  brazo: "brazo",
  cadera: "cadera",
  cintura: "cintura",
  gluteo: "glúteo",
  hombros: "hombros",
  pantorrilla: "pantorrilla",
  pecho: "pecho",
  peso: "peso",
  pierna: "pierna"
};

function validateMetrics(
  input: ProfileSetupFormInput,
  fields: (keyof ProfileSetupFormInput)[]
): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  fields.forEach((field) => {
    if (parsePositiveNumber(String(input[field] ?? "")) === null) {
      errors[field] = `Ingresa ${metricLabels[field] ?? "un valor válido"}.`;
    }
  });
  return errors;
}

export function validateProfileSetupStep(
  input: ProfileSetupFormInput,
  step: ProfileSetupStep
): ProfileFieldErrors {
  if (step === 1) {
    return validateIdentity(input);
  }
  if (step === 2) {
    return validateMetrics(input, ["peso", "altura"]);
  }
  if (step === 3) {
    return validateMetrics(input, ["hombros", "pecho", "brazo", "antebrazo", "cintura"]);
  }
  if (step === 4) {
    return validateMetrics(input, ["cadera", "gluteo", "pierna", "pantorrilla"]);
  }
  return {};
}

export function getFirstProfileFieldError(errors: ProfileFieldErrors) {
  return Object.values(errors)[0] ?? null;
}

export function validateProfileSetupForm(input: ProfileSetupFormInput): ProfileSetupValidation {
  for (const step of [1, 2, 3, 4] as ProfileSetupStep[]) {
    const error = getFirstProfileFieldError(validateProfileSetupStep(input, step));
    if (error) {
      return { message: error, status: "invalid" };
    }
  }

  const displayName = input.displayName.trim();
  const age = input.edad.trim() ? parseInteger(input.edad.trim()) : null;
  const birthDate = input.fechaNacimiento.trim();
  if (!input.genero) {
    return { message: "Selecciona una opción.", status: "invalid" };
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

export function profileFormFromProfile(profile: AthleteProfile): ProfileSetupFormInput {
  const value = (number: number | null) => (number === null ? "" : String(number));
  return {
    ...defaultProfileSetupForm,
    altura: value(profile.altura),
    antebrazo: value(profile.antebrazo),
    brazo: value(profile.brazo),
    cadera: value(profile.cadera),
    cintura: value(profile.cintura),
    diasEntrenamientoSemana:
      profile.dias_entrenamiento_semana === null ? "3" : String(profile.dias_entrenamiento_semana),
    displayName: profile.display_name ?? "",
    edad: value(profile.edad),
    genero: profile.genero ?? "",
    gluteo: value(profile.gluteo),
    hombros: value(profile.hombros),
    objetivoMetabolico:
      profile.objetivo_metabolico === "deficit" ||
      profile.objetivo_metabolico === "mantenimiento" ||
      profile.objetivo_metabolico === "superavit"
        ? profile.objetivo_metabolico
        : "mantenimiento",
    pantorrilla: value(profile.pantorrilla),
    pecho: value(profile.pecho),
    peso: value(profile.peso),
    pierna: value(profile.pierna)
  };
}

export function getMetabolicGoalLabel(goal: AthleteProfile["objetivo_metabolico"]) {
  return metabolicGoalOptions.find((option) => option.value === goal)?.label ?? "Pendiente";
}

export function getProfileScreenMode(input: {
  hasProfile: boolean;
  status: ProfileUiStatus;
}): ProfileScreenMode {
  if (input.status === "loading" || input.status === "idle") {
    return "loading";
  }
  if (input.status === "session_expired" || input.status === "missing_session") {
    return "session_expired";
  }
  if (input.status === "ready" || input.status === "success") {
    return input.hasProfile ? "complete" : "incomplete";
  }
  if (input.status === "empty") {
    return "incomplete";
  }
  return "error";
}

export async function signOutFromProfile(signOut: () => Promise<void>) {
  await signOut();
}
