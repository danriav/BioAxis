import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MockCard } from "@/components/MockCard";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  getDashboardAthleteLabel,
  getDashboardCaloriesCard,
  getDashboardMetricCards,
  getDashboardProfileCards,
  statusFromDashboardError,
  type DashboardStatus
} from "@/features/dashboard/dashboardViewModel";
import { getLocalDateString } from "@/features/nutrition/NutritionScreen";
import { useNutritionTargets } from "@/features/nutrition/useNutritionTargets";
import { getProfileMe, type AthleteProfile } from "@/lib/api/profile";
import { colors, spacing } from "@/styles/theme";

export function DashboardScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const today = getLocalDateString();
  const targetsState = useNutritionTargets();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [state, setState] = useState<DashboardScreenState>({
    message: null,
    status: "loading"
  });

  const loadProfile = useCallback(async () => {
    setState({ message: null, status: "loading" });

    try {
      const response = await getProfileMe(session);
      setProfile(response.profile);
      setState({
        message: response.status === "empty" ? "Completa tu perfil para activar tu resumen." : null,
        status: response.status === "empty" ? "empty" : "ready"
      });
    } catch (error) {
      const mapped = statusFromDashboardError(error);
      setProfile(null);
      setState({ message: mapped.message, status: mapped.status });
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const caloriesCard = getDashboardCaloriesCard(
    targetsState.status === "success" ? targetsState.targets : null
  );

  return (
    <Screen
      eyebrow="Resumen"
      title="Dashboard"
      description="Resumen mobile de tu perfil, objetivos y entrenamiento semanal."
    >
      <MockCard title="Sesión" value={session ? "Activa" : "No disponible"} />
      <MockCard title="Fecha" value={today} />

      {state.status === "loading" ? <MockCard title="Perfil" value="Cargando" /> : null}

      {state.status === "empty" ? (
        <MockCard title="Perfil biométrico" value="Sin perfil">
          <Text style={styles.helpText}>{state.message}</Text>
          <Pressable style={styles.button} onPress={() => router.push("/profile-setup")}>
            <Text style={styles.buttonText}>Completar perfil</Text>
          </Pressable>
        </MockCard>
      ) : null}

      {state.status !== "loading" && state.status !== "ready" && state.status !== "empty" ? (
        <MockCard title="Dashboard" value="No disponible">
          <Text style={styles.helpText}>{state.message ?? "No pudimos cargar tu dashboard."}</Text>
          <Pressable style={styles.button} onPress={() => void loadProfile()}>
            <Text style={styles.buttonText}>Reintentar</Text>
          </Pressable>
        </MockCard>
      ) : null}

      {state.status === "ready" && profile ? (
        <>
          <MockCard title="Atleta" value={getDashboardAthleteLabel(profile)} />
          {getDashboardProfileCards(profile).map((card) => (
            <MockCard key={card.title} title={card.title} value={card.value} />
          ))}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Métricas principales</Text>
            {getDashboardMetricCards(profile).map((card) => (
              <MockCard key={card.title} title={card.title} value={card.value} />
            ))}
          </View>

          <MockCard
            title={caloriesCard.title}
            value={
              targetsState.status === "loading" ? "Cargando" : caloriesCard.value
            }
          >
            {targetsState.status !== "loading" && targetsState.status !== "success"
              ? "Pendiente de nutrición."
              : null}
          </MockCard>

          <Pressable style={styles.button} onPress={() => router.push("/(tabs)/nutrition")}>
            <Text style={styles.buttonText}>Ir a Nutrición</Text>
          </Pressable>
        </>
      ) : null}
    </Screen>
  );
}

type DashboardScreenState = {
  message: string | null;
  status: DashboardStatus;
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md
  },
  buttonText: {
    color: colors.text,
    fontWeight: "800"
  },
  helpText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm
  },
  section: {
    gap: spacing.md
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  }
});
