import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  defaultProfileSetupForm,
  genderOptions,
  metabolicGoalOptions,
  statusFromProfileError,
  validateProfileSetupForm,
  type ProfileSetupFormInput,
  type ProfileUiStatus
} from "@/features/profile/profileViewModel";
import { setupProfile } from "@/lib/api/profile";
import { colors, spacing } from "@/styles/theme";

export function ProfileSetupScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<ProfileSetupFormInput>(defaultProfileSetupForm);
  const [state, setState] = useState<ProfileSetupState>({
    message: null,
    status: "idle"
  });

  function updateField(field: keyof ProfileSetupFormInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
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

  return (
    <Screen
      eyebrow="Perfil"
      title="Setup biometrico"
      description="Completa los datos base para activar objetivos y previews personalizados."
    >
      <View style={styles.form}>
        <ProfileInput label="Nombre" value={form.displayName} onChangeText={(value) => updateField("displayName", value)} />

        <Text style={styles.label}>Genero</Text>
        <View style={styles.optionRow}>
          {genderOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.optionButton, form.genero === option.value ? styles.selectedButton : null]}
              onPress={() => setForm((current) => ({ ...current, genero: option.value }))}
            >
              <Text style={form.genero === option.value ? styles.selectedText : styles.optionText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.row}>
          <ProfileInput
            keyboardType="number-pad"
            label="Edad"
            value={form.edad}
            onChangeText={(value) => updateField("edad", value)}
          />
          <ProfileInput
            label="Nacimiento"
            value={form.fechaNacimiento}
            onChangeText={(value) => updateField("fechaNacimiento", value)}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View style={styles.row}>
          <ProfileInput
            keyboardType="decimal-pad"
            label="Peso kg"
            value={form.peso}
            onChangeText={(value) => updateField("peso", value)}
          />
          <ProfileInput
            keyboardType="decimal-pad"
            label="Altura cm"
            value={form.altura}
            onChangeText={(value) => updateField("altura", value)}
          />
        </View>

        <View style={styles.row}>
          <ProfileInput
            keyboardType="decimal-pad"
            label="Hombros"
            value={form.hombros}
            onChangeText={(value) => updateField("hombros", value)}
          />
          <ProfileInput
            keyboardType="decimal-pad"
            label="Pecho"
            value={form.pecho}
            onChangeText={(value) => updateField("pecho", value)}
          />
        </View>

        <View style={styles.row}>
          <ProfileInput
            keyboardType="decimal-pad"
            label="Brazo"
            value={form.brazo}
            onChangeText={(value) => updateField("brazo", value)}
          />
          <ProfileInput
            keyboardType="decimal-pad"
            label="Antebrazo"
            value={form.antebrazo}
            onChangeText={(value) => updateField("antebrazo", value)}
          />
        </View>

        <View style={styles.row}>
          <ProfileInput
            keyboardType="decimal-pad"
            label="Cintura"
            value={form.cintura}
            onChangeText={(value) => updateField("cintura", value)}
          />
          <ProfileInput
            keyboardType="decimal-pad"
            label="Cadera"
            value={form.cadera}
            onChangeText={(value) => updateField("cadera", value)}
          />
        </View>

        <View style={styles.row}>
          <ProfileInput
            keyboardType="decimal-pad"
            label="Gluteo"
            value={form.gluteo}
            onChangeText={(value) => updateField("gluteo", value)}
          />
          <ProfileInput
            keyboardType="decimal-pad"
            label="Pierna"
            value={form.pierna}
            onChangeText={(value) => updateField("pierna", value)}
          />
        </View>

        <View style={styles.row}>
          <ProfileInput
            keyboardType="decimal-pad"
            label="Pantorrilla"
            value={form.pantorrilla}
            onChangeText={(value) => updateField("pantorrilla", value)}
          />
          <ProfileInput
            keyboardType="number-pad"
            label="Dias entrenamiento"
            value={form.diasEntrenamientoSemana}
            onChangeText={(value) => updateField("diasEntrenamientoSemana", value)}
          />
        </View>

        <Text style={styles.label}>Objetivo metabolico</Text>
        <View style={styles.optionRow}>
          {metabolicGoalOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.optionButton, form.objetivoMetabolico === option.value ? styles.selectedButton : null]}
              onPress={() => setForm((current) => ({ ...current, objetivoMetabolico: option.value }))}
            >
              <Text style={form.objetivoMetabolico === option.value ? styles.selectedText : styles.optionText}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {state.message ? (
          <Text style={state.status === "success" ? styles.successText : styles.errorText}>{state.message}</Text>
        ) : null}

        <Pressable
          disabled={state.status === "loading"}
          style={[styles.button, state.status === "loading" ? styles.disabledButton : null]}
          onPress={() => {
            void submitSetup();
          }}
        >
          <Text style={styles.buttonText}>{state.status === "loading" ? "Guardando" : "Guardar perfil"}</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Cancelar</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

type ProfileSetupState = {
  message: string | null;
  status: ProfileUiStatus;
};

type ProfileInputProps = {
  keyboardType?: "decimal-pad" | "default" | "number-pad";
  label: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
};

function ProfileInput({ keyboardType = "default", label, onChangeText, placeholder, value }: ProfileInputProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md
  },
  buttonText: {
    color: colors.background,
    fontWeight: "900"
  },
  disabledButton: {
    opacity: 0.55
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  form: {
    gap: spacing.md
  },
  input: {
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  inputGroup: {
    flex: 1,
    gap: spacing.xs
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  optionButton: {
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
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
  row: {
    flexDirection: "row",
    gap: spacing.sm
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "800"
  },
  selectedButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  selectedText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "900"
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "800"
  }
});
