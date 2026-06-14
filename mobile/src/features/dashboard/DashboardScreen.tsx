import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { MockCard } from "@/components/MockCard";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth/AuthProvider";
import { getLocalDateString } from "@/features/nutrition/NutritionScreen";
import { useNutritionLogs } from "@/features/nutrition/useNutritionLogs";
import { useNutritionTargets } from "@/features/nutrition/useNutritionTargets";
import { colors, spacing } from "@/styles/theme";

export function DashboardScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const today = getLocalDateString();
  const logsState = useNutritionLogs(today);
  const targetsState = useNutritionTargets();
  const nutritionStatus =
    logsState.status === "success" && targetsState.status === "success"
      ? "Nutrición conectada"
      : logsState.status === "loading" || targetsState.status === "loading"
        ? "Cargando nutrición"
        : "Resumen en preparación";

  return (
    <Screen
      eyebrow="Resumen"
      title="Dashboard"
      description="Vista inicial con estado de sesión y accesos principales."
    >
      <MockCard title="Sesión" value={session?.user.email ? "Activa" : "No disponible"} />
      <MockCard title="Fecha" value={today} />
      <MockCard title="Nutrición" value={nutritionStatus}>
        {logsState.status === "success" && logsState.logs
          ? `${Math.round(logsState.logs.totals.kcal)} kcal registradas hoy.`
          : "Resumen en preparación."}
      </MockCard>
      <Pressable style={styles.button} onPress={() => router.push("/(tabs)/nutrition")}>
        <Text style={styles.buttonText}>Ir a Nutrición</Text>
      </Pressable>
    </Screen>
  );
}

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
  }
});
