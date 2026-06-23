import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Ruler,
  Scale,
  Sparkles,
  Target,
  UserRound
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/AuthProvider";
import {
  defaultProfileSetupForm,
  genderOptions,
  getFirstProfileFieldError,
  metabolicGoalOptions,
  profileFormFromProfile,
  profileSetupSteps,
  statusFromProfileError,
  validateProfileSetupForm,
  validateProfileSetupStep,
  type ProfileFieldErrors,
  type ProfileSetupFormInput,
  type ProfileSetupStep,
  type ProfileUiStatus
} from "@/features/profile/profileViewModel";
import { getProfileMe, setupProfile } from "@/lib/api/profile";
import { colors, radii, spacing, typography } from "@/styles/theme";

export function ProfileSetupScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<ProfileSetupFormInput>(defaultProfileSetupForm);
  const [step, setStep] = useState<ProfileSetupStep>(1);
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [isUpdate, setIsUpdate] = useState(false);
  const [state, setState] = useState<ProfileSetupState>({ message: null, status: "loading" });

  useEffect(() => {
    let mounted = true;
    async function loadCurrentProfile() {
      try {
        const response = await getProfileMe(session);
        if (!mounted) {
          return;
        }
        if (response.profile) {
          setForm(profileFormFromProfile(response.profile));
          setIsUpdate(true);
        }
        setState({ message: null, status: "idle" });
      } catch (error) {
        if (!mounted) {
          return;
        }
        const mapped = statusFromProfileError(error);
        setState({ message: mapped.message, status: mapped.status });
      }
    }
    void loadCurrentProfile();
    return () => {
      mounted = false;
    };
  }, [session]);

  function updateField(field: keyof ProfileSetupFormInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (state.status === "validation_error") {
      setState({ message: null, status: "idle" });
    }
  }

  function goNext() {
    const nextErrors = validateProfileSetupStep(form, step);
    const firstError = getFirstProfileFieldError(nextErrors);
    if (firstError) {
      setErrors(nextErrors);
      setState({ message: firstError, status: "validation_error" });
      return;
    }
    setErrors({});
    setState({ message: null, status: "idle" });
    setStep((current) => Math.min(5, current + 1) as ProfileSetupStep);
  }

  function goBack() {
    if (step === 1) {
      router.back();
      return;
    }
    setErrors({});
    setState({ message: null, status: "idle" });
    setStep((current) => Math.max(1, current - 1) as ProfileSetupStep);
  }

  async function submitSetup() {
    const validation = validateProfileSetupForm(form);
    if (validation.status === "invalid") {
      setState({ message: validation.message, status: "validation_error" });
      return;
    }

    setState({ message: null, status: "loading" });
    try {
      await setupProfile(session, validation.payload);
      setState({ message: "Perfil guardado.", status: "success" });
      router.replace("/(tabs)/profile");
    } catch (error) {
      const mapped = statusFromProfileError(error);
      setState({ message: mapped.message, status: mapped.status });
    }
  }

  const currentStep = profileSetupSteps[step - 1];
  const isSaving = state.status === "loading" && step === 5;
  const isInitialLoading = state.status === "loading" && step === 1 && !isUpdate;
  const sessionExpired = state.status === "session_expired" || state.status === "missing_session";

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.centerTitle}>Preparando tu perfil</Text>
          <Text style={styles.centerText}>Cargando tus datos actuales.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (sessionExpired) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <AlertTriangle color={colors.danger} size={30} />
          <Text style={styles.centerTitle}>Tu sesión expiró</Text>
          <Text style={styles.centerText}>{state.message}</Text>
          <Pressable style={styles.outlineButton} onPress={() => router.replace("/login")}>
            <Text style={styles.outlineButtonText}>Volver al acceso</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.topBar}>
          <Pressable accessibilityLabel="Volver" style={styles.backButton} onPress={goBack}>
            <ArrowLeft color={colors.text} size={21} />
          </Pressable>
          <View style={styles.topBarCopy}>
            <Text style={styles.eyebrow}>{isUpdate ? "Actualizar perfil" : "Configurar perfil"}</Text>
            <Text style={styles.topTitle}>{currentStep.title}</Text>
          </View>
          <Text style={styles.stepCount}>{step}/5</Text>
        </View>

        <Progress step={step} />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          testID="profile-setup-scroll"
        >
          <View style={styles.stepHeading}>
            <View style={styles.stepIcon}>
              <StepIcon step={step} />
            </View>
            <View style={styles.stepHeadingCopy}>
              <Text style={styles.stepTitle}>{currentStep.title}</Text>
              <Text style={styles.stepDescription}>{currentStep.description}</Text>
            </View>
          </View>

          {step === 1 ? (
            <IdentityStep errors={errors} form={form} updateField={updateField} />
          ) : null}
          {step === 2 ? (
            <BaseMetricsStep errors={errors} form={form} updateField={updateField} />
          ) : null}
          {step === 3 ? (
            <TorsoStep errors={errors} form={form} updateField={updateField} />
          ) : null}
          {step === 4 ? (
            <LowerBodyStep errors={errors} form={form} updateField={updateField} />
          ) : null}
          {step === 5 ? <GoalStep form={form} setForm={setForm} /> : null}

          {state.status === "validation_error" && state.message ? (
            <View style={styles.feedbackError}>
              <AlertTriangle color={colors.danger} size={18} />
              <Text style={styles.feedbackErrorText}>{state.message}</Text>
            </View>
          ) : null}

          {state.status !== "idle" &&
          state.status !== "loading" &&
          state.status !== "validation_error" &&
          state.status !== "success" &&
          state.message ? (
            <View style={styles.feedbackError}>
              <AlertTriangle color={colors.danger} size={18} />
              <Text style={styles.feedbackErrorText}>{state.message}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            style={styles.secondaryButton}
            onPress={goBack}
          >
            <ArrowLeft color={colors.text} size={18} />
            <Text style={styles.secondaryButtonText}>{step === 1 ? "Cancelar" : "Atrás"}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            style={[styles.primaryButton, isSaving ? styles.disabled : null]}
            onPress={() => {
              if (step === 5) {
                void submitSetup();
              } else {
                goNext();
              }
            }}
          >
            {isSaving ? <ActivityIndicator color={colors.background} size="small" /> : null}
            <Text style={styles.primaryButtonText}>
              {isSaving ? "Guardando" : step === 5 ? "Guardar perfil" : "Siguiente"}
            </Text>
            {!isSaving ? (
              step === 5 ? (
                <Check color={colors.background} size={19} />
              ) : (
                <ArrowRight color={colors.background} size={19} />
              )
            ) : null}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Progress({ step }: { step: ProfileSetupStep }) {
  return (
    <View style={styles.progressTrack}>
      {profileSetupSteps.map((item) => (
        <View
          key={item.step}
          style={[styles.progressSegment, item.step <= step ? styles.progressSegmentActive : null]}
        />
      ))}
    </View>
  );
}

function StepIcon({ step }: { step: ProfileSetupStep }) {
  if (step === 1) return <UserRound color={colors.primary} size={23} />;
  if (step === 2) return <Scale color={colors.primary} size={23} />;
  if (step === 3) return <Ruler color={colors.primary} size={23} />;
  if (step === 4) return <Activity color={colors.primary} size={23} />;
  return <Target color={colors.primary} size={23} />;
}

function IdentityStep({
  errors,
  form,
  updateField
}: StepProps) {
  return (
    <View style={styles.panel}>
      <ProfileInput
        error={errors.displayName}
        label="Nombre visible"
        placeholder="Ej. Atleta Kalos"
        value={form.displayName}
        onChangeText={(value) => updateField("displayName", value)}
      />
      <OptionGroup
        error={errors.genero}
        label="Género"
        options={genderOptions}
        selected={form.genero}
        onSelect={(value) => updateField("genero", value)}
      />
      <View style={styles.inputRow}>
        <ProfileInput
          error={errors.edad}
          keyboardType="number-pad"
          label="Edad"
          placeholder="28"
          suffix="años"
          value={form.edad}
          onChangeText={(value) => updateField("edad", value)}
        />
        <ProfileInput
          error={errors.fechaNacimiento}
          label="Nacimiento"
          placeholder="AAAA-MM-DD"
          value={form.fechaNacimiento}
          onChangeText={(value) => updateField("fechaNacimiento", value)}
        />
      </View>
      <Text style={styles.helper}>Puedes usar edad o fecha de nacimiento; no necesitas completar ambas.</Text>
    </View>
  );
}

function BaseMetricsStep({ errors, form, updateField }: StepProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.callout}>
        <Sparkles color={colors.primary} size={18} />
        <Text style={styles.calloutText}>Usa tus medidas actuales. Podrás actualizarlas después.</Text>
      </View>
      <View style={styles.inputRow}>
        <ProfileInput
          error={errors.peso}
          keyboardType="decimal-pad"
          label="Peso"
          placeholder="62"
          suffix="kg"
          value={form.peso}
          onChangeText={(value) => updateField("peso", value)}
        />
        <ProfileInput
          error={errors.altura}
          keyboardType="decimal-pad"
          label="Altura"
          placeholder="165"
          suffix="cm"
          value={form.altura}
          onChangeText={(value) => updateField("altura", value)}
        />
      </View>
    </View>
  );
}

function TorsoStep({ errors, form, updateField }: StepProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.helper}>Mide el contorno en centímetros, sin comprimir la cinta.</Text>
      <MetricRows
        errors={errors}
        fields={[
          ["hombros", "Hombros"],
          ["pecho", "Pecho"],
          ["brazo", "Brazo"],
          ["antebrazo", "Antebrazo"],
          ["cintura", "Cintura"]
        ]}
        form={form}
        updateField={updateField}
      />
    </View>
  );
}

function LowerBodyStep({ errors, form, updateField }: StepProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.helper}>Registra cada contorno en centímetros.</Text>
      <MetricRows
        errors={errors}
        fields={[
          ["cadera", "Cadera"],
          ["gluteo", "Glúteo"],
          ["pierna", "Pierna"],
          ["pantorrilla", "Pantorrilla"]
        ]}
        form={form}
        updateField={updateField}
      />
    </View>
  );
}

function MetricRows({
  errors,
  fields,
  form,
  updateField
}: StepProps & { fields: [keyof ProfileSetupFormInput, string][] }) {
  return (
    <View style={styles.metricFields}>
      {fields.map(([field, label]) => (
        <ProfileInput
          key={field}
          error={errors[field]}
          keyboardType="decimal-pad"
          label={label}
          placeholder="0"
          suffix="cm"
          value={String(form[field])}
          onChangeText={(value) => updateField(field, value)}
        />
      ))}
    </View>
  );
}

function GoalStep({
  form,
  setForm
}: {
  form: ProfileSetupFormInput;
  setForm: React.Dispatch<React.SetStateAction<ProfileSetupFormInput>>;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.optionLabel}>Objetivo metabólico</Text>
      <View style={styles.goalOptions}>
        {metabolicGoalOptions.map((option) => {
          const selected = form.objetivoMetabolico === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[styles.goalOption, selected ? styles.goalOptionSelected : null]}
              onPress={() =>
                setForm((current) => ({ ...current, objetivoMetabolico: option.value }))
              }
            >
              <View style={[styles.radio, selected ? styles.radioSelected : null]}>
                {selected ? <Check color={colors.background} size={13} /> : null}
              </View>
              <Text style={[styles.goalOptionText, selected ? styles.goalOptionTextSelected : null]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.review}>
        <Text style={styles.reviewTitle}>Resumen</Text>
        <ReviewRow label="Nombre" value={form.displayName || "Pendiente"} />
        <ReviewRow label="Peso" value={form.peso ? `${form.peso} kg` : "Pendiente"} />
        <ReviewRow label="Altura" value={form.altura ? `${form.altura} cm` : "Pendiente"} />
        <ReviewRow
          label="Objetivo"
          value={
            metabolicGoalOptions.find((option) => option.value === form.objetivoMetabolico)?.label ??
            "Pendiente"
          }
        />
      </View>
      <Text style={styles.privacyText}>
        Al guardar, reemplazaremos tu perfil actual y conservaremos el historial de forma segura.
      </Text>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

function OptionGroup<TValue extends string>({
  error,
  label,
  onSelect,
  options,
  selected
}: {
  error?: string;
  label: string;
  onSelect: (value: TValue) => void;
  options: { label: string; value: TValue }[];
  selected: TValue | "";
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const isSelected = selected === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              style={[styles.optionButton, isSelected ? styles.optionButtonSelected : null]}
              onPress={() => onSelect(option.value)}
            >
              <Text style={[styles.optionText, isSelected ? styles.optionTextSelected : null]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function ProfileInput({
  error,
  keyboardType = "default",
  label,
  onChangeText,
  placeholder,
  suffix,
  value
}: ProfileInputProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={[styles.inputShell, error ? styles.inputShellError : null]}>
        <TextInput
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.disabled}
          style={styles.input}
          value={value}
        />
        {suffix ? <Text style={styles.inputSuffix}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

type ProfileSetupState = {
  message: string | null;
  status: ProfileUiStatus;
};

type StepProps = {
  errors: ProfileFieldErrors;
  form: ProfileSetupFormInput;
  updateField: (field: keyof ProfileSetupFormInput, value: string) => void;
};

type ProfileInputProps = {
  error?: string;
  keyboardType?: "decimal-pad" | "default" | "number-pad";
  label: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  value: string;
};

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  callout: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  calloutText: {
    color: colors.textSubtle,
    flex: 1,
    fontSize: typography.label,
    lineHeight: 18
  },
  centerState: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    padding: spacing.xl
  },
  centerText: {
    color: colors.muted,
    fontSize: typography.body,
    textAlign: "center"
  },
  centerTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900",
    textAlign: "center"
  },
  content: {
    flexGrow: 1,
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl
  },
  disabled: {
    opacity: 0.55
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  feedbackError: {
    alignItems: "flex-start",
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  feedbackErrorText: {
    color: colors.textSubtle,
    flex: 1,
    fontSize: typography.label,
    lineHeight: 18
  },
  fieldError: {
    color: colors.danger,
    fontSize: typography.caption,
    lineHeight: 16
  },
  footer: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  goalOption: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md
  },
  goalOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  goalOptionText: {
    color: colors.textSubtle,
    fontSize: typography.body,
    fontWeight: "800"
  },
  goalOptionTextSelected: {
    color: colors.primary
  },
  goalOptions: {
    gap: spacing.sm
  },
  helper: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 17
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  inputGroup: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0
  },
  inputRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  inputShell: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row"
  },
  inputShellError: {
    borderColor: colors.danger
  },
  inputSuffix: {
    color: colors.muted,
    fontSize: typography.label,
    fontWeight: "800",
    paddingRight: spacing.md
  },
  keyboardView: {
    flex: 1
  },
  metricFields: {
    gap: spacing.md
  },
  optionButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    minHeight: 46,
    justifyContent: "center"
  },
  optionButtonSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  optionLabel: {
    color: colors.textSubtle,
    fontSize: typography.label,
    fontWeight: "800"
  },
  optionRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  optionText: {
    color: colors.muted,
    fontSize: typography.label,
    fontWeight: "800"
  },
  optionTextSelected: {
    color: colors.primary
  },
  outlineButton: {
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.xl
  },
  outlineButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    flex: 1.45,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 52
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: "900"
  },
  privacyText: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 17
  },
  progressSegment: {
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    flex: 1,
    height: 4
  },
  progressSegmentActive: {
    backgroundColor: colors.primary
  },
  progressTrack: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg
  },
  radio: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    width: 22
  },
  radioSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  review: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    gap: spacing.xs,
    padding: spacing.md
  },
  reviewLabel: {
    color: colors.muted,
    fontSize: typography.label
  },
  reviewRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 30
  },
  reviewTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900",
    marginBottom: spacing.xs
  },
  reviewValue: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "800"
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 52
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "900"
  },
  stepCount: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: "900"
  },
  stepDescription: {
    color: colors.muted,
    fontSize: typography.label,
    lineHeight: 18,
    marginTop: 2
  },
  stepHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  stepHeadingCopy: {
    flex: 1
  },
  stepIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  stepTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900"
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg
  },
  topBarCopy: {
    flex: 1
  },
  topTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900",
    marginTop: 2
  }
});
