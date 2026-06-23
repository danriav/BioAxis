import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  Dumbbell,
  Flame,
  Layers3,
  Repeat2,
  Sparkles,
  Target,
  Zap
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/AuthProvider";
import {
  buildTrainingSubstitutionPayload,
  buildTrainingPreviewPayload,
  defaultTrainingPreviewPayload,
  deriveTrainingScreenMode,
  formatEquipment,
  formatRange,
  formatRest,
  formatMuscleGroup,
  formatSessionIntent,
  getInitialPreviewDay,
  getSelectedTrainingSession,
  getTrainingSessionsByDay,
  replaceExerciseInPreview,
  statusFromTrainingSubstitutionError,
  statusFromTrainingPreviewError,
  trainingDayOptions,
  trainingExperienceOptions,
  trainingGoalOptions,
  trainingPriorityOptions,
  trainingTimeOptions,
  type TrainingPreviewStatus
} from "@/features/workout/trainingPreviewViewModel";
import {
  postTrainingPreview,
  postTrainingSubstitution,
  type TrainingExperience,
  type TrainingGoal,
  type TrainingPreviewExercise,
  type TrainingPreviewResponse,
  type TrainingPriority
} from "@/lib/api/training-preview";
import { colors, radii, shadows, spacing, typography } from "@/styles/theme";

export function WorkoutScreen() {
  const { session } = useAuth();
  const [daysPerWeek, setDaysPerWeek] = useState(defaultTrainingPreviewPayload.days_per_week);
  const [timeBudgetMinutes, setTimeBudgetMinutes] = useState(defaultTrainingPreviewPayload.time_budget_minutes);
  const [goal, setGoal] = useState<TrainingGoal>(defaultTrainingPreviewPayload.goal);
  const [priority, setPriority] = useState<TrainingPriority>(defaultTrainingPreviewPayload.priority);
  const [experience, setExperience] = useState<TrainingExperience>(defaultTrainingPreviewPayload.experience);
  const [preview, setPreview] = useState<TrainingPreviewResponse | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [showConfiguration, setShowConfiguration] = useState(true);
  const [state, setState] = useState<TrainingPreviewUiState>({
    message: null,
    status: "idle"
  });
  const [substitutingKey, setSubstitutingKey] = useState<string | null>(null);

  async function generatePreview() {
    setState({ message: null, status: "loading" });

    try {
      const nextPreview = await postTrainingPreview(
        session,
        buildTrainingPreviewPayload({
          daysPerWeek,
          experience,
          goal,
          priority,
          timeBudgetMinutes
        })
      );
      setPreview(nextPreview);
      setSelectedDay(getInitialPreviewDay(nextPreview));
      setShowConfiguration(false);
      setState({ message: "Rutina generada.", status: "preview_ready" });
    } catch (error) {
      const mapped = statusFromTrainingPreviewError(error);
      setState({ message: mapped.message, status: mapped.status });
    }
  }

  async function changeExercise(trainingSessionId: string, exercise: TrainingPreviewExercise) {
    if (!preview) {
      return;
    }

    const trainingSession = preview.program.sessions.find((item) => item.session_id === trainingSessionId);
    if (!trainingSession) {
      return;
    }

    const exerciseKey = `${trainingSessionId}-${exercise.order}`;
    setSubstitutingKey(exerciseKey);
    setState({ message: null, status: "preview_ready" });

    try {
      const substitution = await postTrainingSubstitution(
        session,
        buildTrainingSubstitutionPayload({
          exercise,
          experience,
          goal,
          preview,
          priority,
          session: trainingSession
        })
      );

      setPreview(
        replaceExerciseInPreview({
          currentExercise: exercise,
          preview,
          sessionId: trainingSessionId,
          substituteExercise: substitution.substitute_exercise
        })
      );
      setState({ message: "Ejercicio actualizado sin cambiar su prescripción.", status: "preview_ready" });
    } catch (error) {
      const mapped = statusFromTrainingSubstitutionError(error);
      setState({ message: mapped.message, status: mapped.status });
    } finally {
      setSubstitutingKey(null);
    }
  }

  const sessions = getTrainingSessionsByDay(preview);
  const selectedSession = getSelectedTrainingSession(preview, selectedDay);
  const mode = deriveTrainingScreenMode({
    hasPreview: preview !== null,
    status: state.status,
    substitutingKey
  });
  const isGenerating = mode === "generating";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        testID="training-scroll"
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Entrenamiento Kalos</Text>
            <Text style={styles.title}>{preview ? "Tu rutina por días" : "Diseña tu próxima rutina"}</Text>
            <Text style={styles.subtitle}>
              {preview
                ? "Preview temporal generado por el motor Kalos."
                : "Configura lo esencial y deja la prescripción al backend."}
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Dumbbell color={colors.primary} size={24} />
          </View>
        </View>

        {preview && !showConfiguration ? (
          <View style={styles.configurationSummary}>
            <View style={styles.configurationSummaryText}>
              <Text style={styles.summaryLabel}>Configuración activa</Text>
              <Text numberOfLines={2} style={styles.summaryValue}>
                {daysPerWeek} días · {timeBudgetMinutes} min · {getOptionLabel(trainingGoalOptions, goal)}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              style={styles.editConfigurationButton}
              onPress={() => setShowConfiguration(true)}
            >
              <Text style={styles.editConfigurationText}>Editar</Text>
            </Pressable>
          </View>
        ) : null}

        {showConfiguration ? (
          <View style={styles.configurationPanel}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionIcon}>
                <Sparkles color={colors.primary} size={20} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Configuración</Text>
                <Text style={styles.sectionDescription}>Ajusta el plan antes de generarlo</Text>
              </View>
            </View>

            <OptionRow label="Objetivo" options={trainingGoalOptions} selectedValue={goal} onSelect={setGoal} />
            <OptionRow
              label="Prioridad"
              options={trainingPriorityOptions}
              selectedValue={priority}
              onSelect={setPriority}
            />
            <OptionRow
              label="Experiencia"
              options={trainingExperienceOptions}
              selectedValue={experience}
              onSelect={setExperience}
            />

            <View style={styles.numericGrid}>
              <NumericOptionRow
                icon={Layers3}
                label="Días por semana"
                options={trainingDayOptions}
                selectedValue={daysPerWeek}
                suffix=""
                onSelect={setDaysPerWeek}
              />
              <NumericOptionRow
                icon={Clock3}
                label="Duración"
                options={trainingTimeOptions}
                selectedValue={timeBudgetMinutes}
                suffix=" min"
                onSelect={setTimeBudgetMinutes}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={isGenerating}
              style={({ pressed }) => [
                styles.generateButton,
                isGenerating ? styles.disabled : null,
                pressed ? styles.primaryPressed : null
              ]}
              onPress={() => {
                void generatePreview();
              }}
            >
              {isGenerating ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Zap color={colors.background} size={20} fill={colors.background} />
              )}
              <Text style={styles.generateButtonText}>
                {isGenerating ? "Generando rutina" : preview ? "Regenerar rutina" : "Generar rutina"}
              </Text>
              {!isGenerating ? <ArrowRight color={colors.background} size={19} /> : null}
            </Pressable>
          </View>
        ) : null}

        <TrainingFeedback mode={mode} message={state.message} />

        {preview && sessions.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Plan semanal</Text>
                <Text style={styles.sectionDescription}>Selecciona un día para ver sus ejercicios</Text>
              </View>
              <Text style={styles.dayCount}>{sessions.length} días</Text>
            </View>

            <ScrollView
              contentContainerStyle={styles.dayTabs}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {sessions.map((trainingSession) => {
                const selected = selectedDay === trainingSession.day_number;
                return (
                  <Pressable
                    key={trainingSession.session_id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    style={[styles.dayTab, selected ? styles.selectedDayTab : null]}
                    onPress={() => setSelectedDay(trainingSession.day_number)}
                  >
                    <Text style={[styles.dayTabLabel, selected ? styles.selectedDayTabLabel : null]}>
                      Día {trainingSession.day_number}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.dayTabDetail, selected ? styles.selectedDayTabDetail : null]}
                    >
                      {trainingSession.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {selectedSession ? (
          <>
            <View style={styles.sessionHero}>
              <View style={styles.sessionTitleRow}>
                <View style={styles.sessionNumber}>
                  <Text style={styles.sessionNumberText}>{selectedSession.day_number}</Text>
                </View>
                <View style={styles.sessionTitleCopy}>
                  <Text style={styles.sessionEyebrow}>Día {selectedSession.day_number}</Text>
                  <Text style={styles.sessionTitle}>{selectedSession.label}</Text>
                </View>
              </View>

              <Text style={styles.sessionIntent}>{formatSessionIntent(selectedSession.intent)}</Text>
              <Text style={styles.targetMuscles}>
                {selectedSession.target_muscles.map(formatMuscleGroup).join(" · ")}
              </Text>

              <View style={styles.sessionMetrics}>
                <SessionMetric
                  icon={Clock3}
                  label="Duración"
                  value={`${selectedSession.estimated_minutes} min`}
                />
                <View style={styles.metricDivider} />
                <SessionMetric
                  icon={Flame}
                  label="Fatiga"
                  value={`${selectedSession.fatigue_points} pts`}
                />
                <View style={styles.metricDivider} />
                <SessionMetric
                  icon={Dumbbell}
                  label="Ejercicios"
                  value={`${selectedSession.exercises.length}`}
                />
              </View>
            </View>

            <View style={styles.exerciseSectionHeader}>
              <Text style={styles.sectionTitle}>Ejercicios</Text>
              <Text style={styles.sectionDescription}>La sustitución conserva series, reps, RIR y descanso</Text>
            </View>

            <View style={styles.exerciseList}>
              {selectedSession.exercises.map((exercise) => {
                const exerciseKey = `${selectedSession.session_id}-${exercise.order}`;
                const isSubstituting = substitutingKey === exerciseKey;
                return (
                  <ExerciseCard
                    key={`${selectedSession.session_id}-${exercise.exercise_id}-${exercise.order}`}
                    exercise={exercise}
                    isSubstituting={isSubstituting}
                    substitutionDisabled={substitutingKey !== null}
                    onChange={() => {
                      void changeExercise(selectedSession.session_id, exercise);
                    }}
                  />
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function TrainingFeedback({
  message,
  mode
}: {
  message: string | null;
  mode: ReturnType<typeof deriveTrainingScreenMode>;
}) {
  if (mode === "initial") {
    return (
      <View style={styles.initialState}>
        <Target color={colors.primary} size={23} />
        <View style={styles.feedbackCopy}>
          <Text style={styles.feedbackTitle}>Tu plan aún no está generado</Text>
          <Text style={styles.feedbackText}>El preview no se guarda como rutina permanente.</Text>
        </View>
      </View>
    );
  }

  if (mode === "generating") {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator color={colors.primary} size="small" />
        <View style={styles.feedbackCopy}>
          <Text style={styles.feedbackTitle}>Kalos está armando tu semana</Text>
          <Text style={styles.feedbackText}>Aplicando volumen, fatiga y tiempo disponible.</Text>
        </View>
      </View>
    );
  }

  if (mode === "substituting") {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator color={colors.primary} size="small" />
        <View style={styles.feedbackCopy}>
          <Text style={styles.feedbackTitle}>Buscando un ejercicio equivalente</Text>
          <Text style={styles.feedbackText}>La prescripción original se mantendrá intacta.</Text>
        </View>
      </View>
    );
  }

  if (mode === "preview_ready" && message) {
    return (
      <View style={styles.successState}>
        <Sparkles color={colors.success} size={19} />
        <Text style={styles.successText}>{message}</Text>
      </View>
    );
  }

  if (["no_substitute", "network_error", "session_expired", "error"].includes(mode)) {
    return (
      <View style={styles.errorState}>
        <AlertTriangle color={colors.danger} size={21} />
        <View style={styles.feedbackCopy}>
          <Text style={styles.errorTitle}>{getTrainingErrorTitle(mode)}</Text>
          <Text style={styles.errorText}>{message ?? "No pudimos completar la operación."}</Text>
        </View>
      </View>
    );
  }

  return null;
}

function ExerciseCard({
  exercise,
  isSubstituting,
  substitutionDisabled,
  onChange
}: {
  exercise: TrainingPreviewExercise;
  isSubstituting: boolean;
  substitutionDisabled: boolean;
  onChange: () => void;
}) {
  return (
    <View style={[styles.exerciseCard, isSubstituting ? styles.substitutingCard : null]}>
      <View style={styles.exerciseTopRow}>
        <View style={styles.exerciseOrder}>
          <Text style={styles.exerciseOrderText}>{exercise.order}</Text>
        </View>
        <View style={styles.exerciseHeading}>
          <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
          <Text style={styles.exerciseMeta}>
            {formatMuscleGroup(exercise.primary_muscle)} · {formatEquipment(exercise.equipment)}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`Cambiar ${exercise.exercise_name}`}
          accessibilityRole="button"
          disabled={substitutionDisabled}
          style={[styles.changeButton, substitutionDisabled && !isSubstituting ? styles.disabled : null]}
          onPress={onChange}
        >
          {isSubstituting ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Repeat2 color={colors.primary} size={17} />
          )}
          <Text style={styles.changeButtonText}>{isSubstituting ? "Buscando" : "Cambiar"}</Text>
        </Pressable>
      </View>

      <View style={styles.prescriptionGrid}>
        <PrescriptionDatum label="Series" value={`${exercise.sets}`} />
        <PrescriptionDatum label="Reps" value={formatRange(exercise.rep_range)} />
        <PrescriptionDatum label="RIR" value={formatRange(exercise.rir_target)} />
        <PrescriptionDatum label="Descanso" value={formatRest(exercise.rest_seconds)} />
      </View>
    </View>
  );
}

function PrescriptionDatum({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.prescriptionDatum}>
      <Text style={styles.prescriptionLabel}>{label}</Text>
      <Text style={styles.prescriptionValue}>{value}</Text>
    </View>
  );
}

function SessionMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.sessionMetric}>
      <Icon color={colors.primary} size={17} />
      <Text style={styles.sessionMetricValue}>{value}</Text>
      <Text style={styles.sessionMetricLabel}>{label}</Text>
    </View>
  );
}

type OptionRowProps<TValue extends number | string> = {
  label: string;
  onSelect: (value: TValue) => void;
  options: { label: string; value: TValue }[];
  selectedValue: TValue;
};

function OptionRow<TValue extends number | string>({
  label,
  onSelect,
  options,
  selectedValue
}: OptionRowProps<TValue>) {
  return (
    <View style={styles.optionGroup}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const selected = selectedValue === option.value;
          return (
            <Pressable
              key={`${label}-${option.value}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[styles.optionButton, selected ? styles.selectedOption : null]}
              onPress={() => onSelect(option.value)}
            >
              <Text style={[styles.optionText, selected ? styles.selectedOptionText : null]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function NumericOptionRow({
  icon: Icon,
  label,
  onSelect,
  options,
  selectedValue,
  suffix
}: {
  icon: typeof Layers3;
  label: string;
  onSelect: (value: number) => void;
  options: number[];
  selectedValue: number;
  suffix: string;
}) {
  return (
    <View style={styles.numericGroup}>
      <View style={styles.numericLabelRow}>
        <Icon color={colors.primary} size={17} />
        <Text style={styles.optionLabel}>{label}</Text>
      </View>
      <View style={styles.numericOptions}>
        {options.map((option) => {
          const selected = selectedValue === option;
          return (
            <Pressable
              key={`${label}-${option}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[styles.numericButton, selected ? styles.selectedNumericButton : null]}
              onPress={() => onSelect(option)}
            >
              <Text style={[styles.numericText, selected ? styles.selectedNumericText : null]}>
                {option}
                {suffix}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function getOptionLabel<TValue extends string>(
  options: { label: string; value: TValue }[],
  value: TValue
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function getTrainingErrorTitle(mode: ReturnType<typeof deriveTrainingScreenMode>) {
  if (mode === "session_expired") {
    return "Tu sesión expiró";
  }
  if (mode === "network_error") {
    return "No pudimos conectar con Kalos";
  }
  if (mode === "no_substitute") {
    return "Sin alternativa disponible";
  }
  return "No pudimos completar la operación";
}

type TrainingPreviewUiState = {
  message: string | null;
  status: TrainingPreviewStatus;
};

const styles = StyleSheet.create({
  changeButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.sm
  },
  changeButtonText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "900"
  },
  configurationPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg
  },
  configurationSummary: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  configurationSummaryText: {
    flex: 1
  },
  content: {
    gap: spacing.lg,
    paddingBottom: 104,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg
  },
  dayCount: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: "900"
  },
  dayTab: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    minWidth: 104,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  dayTabDetail: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2,
    maxWidth: 92
  },
  dayTabLabel: {
    color: colors.textSubtle,
    fontSize: typography.label,
    fontWeight: "900"
  },
  dayTabs: {
    gap: spacing.sm,
    paddingRight: spacing.lg
  },
  disabled: {
    opacity: 0.48
  },
  editConfigurationButton: {
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  editConfigurationText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "800"
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  errorState: {
    alignItems: "flex-start",
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  errorText: {
    color: colors.textSubtle,
    fontSize: typography.label,
    lineHeight: 18
  },
  errorTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  exerciseHeading: {
    flex: 1,
    minWidth: 0
  },
  exerciseList: {
    gap: spacing.md
  },
  exerciseMeta: {
    color: colors.muted,
    fontSize: typography.caption,
    marginTop: 3
  },
  exerciseName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900",
    lineHeight: 20
  },
  exerciseOrder: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  exerciseOrderText: {
    color: colors.textSubtle,
    fontSize: typography.label,
    fontWeight: "900"
  },
  exerciseSectionHeader: {
    gap: 2,
    marginTop: spacing.xs
  },
  exerciseTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  feedbackCopy: {
    flex: 1,
    gap: 2
  },
  feedbackText: {
    color: colors.muted,
    fontSize: typography.label,
    lineHeight: 18
  },
  feedbackTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  },
  generateButton: {
    ...shadows.elevated,
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: spacing.lg
  },
  generateButtonText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: "900"
  },
  header: {
    alignItems: "center",
    flexDirection: "row"
  },
  headerCopy: {
    flex: 1,
    paddingRight: spacing.md
  },
  headerIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  initialState: {
    alignItems: "flex-start",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderStyle: "dashed",
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  loadingState: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  metricDivider: {
    alignSelf: "stretch",
    backgroundColor: colors.border,
    width: 1
  },
  numericButton: {
    alignItems: "center",
    borderRadius: radii.sm,
    flexBasis: 60,
    flexGrow: 1,
    minHeight: 44,
    justifyContent: "center"
  },
  numericGrid: {
    flexDirection: "column",
    gap: spacing.md
  },
  numericGroup: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  numericLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  numericOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  numericText: {
    color: colors.muted,
    fontSize: typography.caption,
    fontWeight: "800"
  },
  optionButton: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  optionGroup: {
    gap: spacing.sm
  },
  optionLabel: {
    color: colors.textSubtle,
    fontSize: typography.label,
    fontWeight: "800"
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  optionText: {
    color: colors.muted,
    fontSize: typography.label,
    fontWeight: "700"
  },
  prescriptionDatum: {
    alignItems: "center",
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  prescriptionGrid: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    flexDirection: "row",
    paddingVertical: spacing.sm
  },
  prescriptionLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700"
  },
  prescriptionValue: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "900"
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  sectionDescription: {
    color: colors.muted,
    fontSize: typography.caption,
    marginTop: 2
  },
  sectionHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  sectionIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900"
  },
  selectedDayTab: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  selectedDayTabDetail: {
    color: colors.textSubtle
  },
  selectedDayTabLabel: {
    color: colors.primary
  },
  selectedNumericButton: {
    backgroundColor: colors.primary
  },
  selectedNumericText: {
    color: colors.background,
    fontWeight: "900"
  },
  selectedOption: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  selectedOptionText: {
    color: colors.primary,
    fontWeight: "900"
  },
  sessionEyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  sessionHero: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  sessionIntent: {
    color: colors.textSubtle,
    fontSize: typography.body,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  sessionMetric: {
    alignItems: "center",
    flex: 1,
    gap: 2
  },
  sessionMetricLabel: {
    color: colors.muted,
    fontSize: 10
  },
  sessionMetricValue: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "900"
  },
  sessionMetrics: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    flexDirection: "row",
    paddingVertical: spacing.md
  },
  sessionNumber: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  sessionNumberText: {
    color: colors.background,
    fontSize: 20,
    fontWeight: "900"
  },
  sessionTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900"
  },
  sessionTitleCopy: {
    flex: 1
  },
  sessionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  substitutingCard: {
    borderColor: colors.primary
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 21,
    marginTop: spacing.xs
  },
  successState: {
    alignItems: "center",
    backgroundColor: colors.successSoft,
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  successText: {
    color: colors.success,
    flex: 1,
    fontSize: typography.label,
    fontWeight: "800"
  },
  summaryLabel: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  summaryValue: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "800",
    marginTop: 2
  },
  targetMuscles: {
    color: colors.muted,
    fontSize: typography.label,
    lineHeight: 18,
    textTransform: "capitalize"
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900",
    marginTop: 2
  }
});
