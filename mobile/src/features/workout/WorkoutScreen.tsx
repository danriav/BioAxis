import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MockCard } from "@/components/MockCard";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  buildTrainingPreviewPayload,
  defaultTrainingPreviewPayload,
  formatRange,
  formatRest,
  getInitialPreviewDay,
  getSelectedTrainingSession,
  getTrainingSessionsByDay,
  statusFromTrainingPreviewError,
  trainingDayOptions,
  trainingExperienceOptions,
  trainingGoalOptions,
  trainingPriorityOptions,
  trainingTimeOptions,
  type TrainingPreviewStatus
} from "@/features/workout/trainingPreviewViewModel";
import { postTrainingPreview, type TrainingExperience, type TrainingGoal, type TrainingPriority, type TrainingPreviewResponse } from "@/lib/api/training-preview";
import { colors, spacing } from "@/styles/theme";

export function WorkoutScreen() {
  const { session } = useAuth();
  const [daysPerWeek, setDaysPerWeek] = useState(defaultTrainingPreviewPayload.days_per_week);
  const [timeBudgetMinutes, setTimeBudgetMinutes] = useState(defaultTrainingPreviewPayload.time_budget_minutes);
  const [goal, setGoal] = useState<TrainingGoal>(defaultTrainingPreviewPayload.goal);
  const [priority, setPriority] = useState<TrainingPriority>(defaultTrainingPreviewPayload.priority);
  const [experience, setExperience] = useState<TrainingExperience>(defaultTrainingPreviewPayload.experience);
  const [preview, setPreview] = useState<TrainingPreviewResponse | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [state, setState] = useState<TrainingPreviewUiState>({
    message: null,
    status: "idle"
  });

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
      setState({ message: "Preview generado.", status: "preview_ready" });
    } catch (error) {
      const mapped = statusFromTrainingPreviewError(error);
      setState({ message: mapped.message, status: mapped.status });
    }
  }

  const sessions = getTrainingSessionsByDay(preview);
  const selectedSession = getSelectedTrainingSession(preview, selectedDay);

  return (
    <Screen
      eyebrow="Entrenamiento"
      title="Preview Kalos"
      description="Genera una propuesta de rutina sin guardarla todavía."
    >
      <MockCard title="Configuración">
        <View style={styles.formStack}>
          <OptionRow
            label="Días por semana"
            options={trainingDayOptions.map((value) => ({ label: `${value}`, value }))}
            selectedValue={daysPerWeek}
            onSelect={setDaysPerWeek}
          />
          <OptionRow
            label="Tiempo por sesión"
            options={trainingTimeOptions.map((value) => ({ label: `${value} min`, value }))}
            selectedValue={timeBudgetMinutes}
            onSelect={setTimeBudgetMinutes}
          />
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
        </View>
      </MockCard>

      <Pressable
        disabled={state.status === "loading"}
        style={[styles.button, state.status === "loading" ? styles.disabledButton : null]}
        onPress={() => {
          void generatePreview();
        }}
      >
        <Text style={styles.buttonText}>{state.status === "loading" ? "Generando" : "Generar preview"}</Text>
      </Pressable>

      {state.message ? (
        <Text style={state.status === "preview_ready" ? styles.successText : styles.errorText}>{state.message}</Text>
      ) : null}

      {sessions.length > 0 ? (
        <View style={styles.dayRow}>
          {sessions.map((trainingSession) => (
            <Pressable
              key={trainingSession.session_id}
              style={[styles.dayButton, selectedDay === trainingSession.day_number ? styles.selectedButton : null]}
              onPress={() => setSelectedDay(trainingSession.day_number)}
            >
              <Text style={selectedDay === trainingSession.day_number ? styles.selectedButtonText : styles.optionText}>
                Día {trainingSession.day_number}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {selectedSession ? (
        <MockCard title={`Día ${selectedSession.day_number}`} value={selectedSession.label}>
          <View style={styles.sessionMeta}>
            <Text style={styles.metaText}>Músculos: {selectedSession.target_muscles.join(", ")}</Text>
            <Text style={styles.metaText}>Duración: {selectedSession.estimated_minutes} min</Text>
            <Text style={styles.metaText}>Fatiga: {selectedSession.fatigue_points}</Text>
          </View>
          <View style={styles.exerciseList}>
            {selectedSession.exercises.map((exercise) => (
              <View key={`${selectedSession.session_id}-${exercise.exercise_id}-${exercise.order}`} style={styles.exerciseRow}>
                <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
                <Text style={styles.metaText}>
                  {exercise.primary_muscle} · {exercise.equipment}
                </Text>
                <Text style={styles.metaText}>
                  {exercise.sets} sets · {formatRange(exercise.rep_range)} reps · RIR{" "}
                  {formatRange(exercise.rir_target)} · descanso {formatRest(exercise.rest_seconds)}
                </Text>
              </View>
            ))}
          </View>
        </MockCard>
      ) : null}
    </Screen>
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
        {options.map((option) => (
          <Pressable
            key={`${label}-${option.value}`}
            style={[styles.optionButton, selectedValue === option.value ? styles.selectedButton : null]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={selectedValue === option.value ? styles.selectedButtonText : styles.optionText}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

type TrainingPreviewUiState = {
  message: string | null;
  status: TrainingPreviewStatus;
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md
  },
  buttonText: {
    color: colors.text,
    fontWeight: "800"
  },
  dayButton: {
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  dayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  disabledButton: {
    opacity: 0.55
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700"
  },
  exerciseList: {
    gap: spacing.sm,
    marginTop: spacing.md
  },
  exerciseName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900"
  },
  exerciseRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.sm
  },
  formStack: {
    gap: spacing.md,
    marginTop: spacing.md
  },
  metaText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  optionButton: {
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  optionGroup: {
    gap: spacing.sm
  },
  optionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800"
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  optionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800"
  },
  selectedButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  selectedButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "900"
  },
  sessionMeta: {
    gap: spacing.xs,
    marginTop: spacing.sm
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "800"
  }
});
