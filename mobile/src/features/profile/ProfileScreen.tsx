import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { MockCard } from "@/components/MockCard";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  getProfileSummaryCards,
  statusFromProfileError,
  type ProfileUiStatus
} from "@/features/profile/profileViewModel";
import { getProfileMe, type AthleteProfile } from "@/lib/api/profile";
import { colors, spacing } from "@/styles/theme";

export function ProfileScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [state, setState] = useState<ProfileScreenState>({
    message: null,
    status: "loading"
  });

  const loadProfile = useCallback(async () => {
    setState({ message: null, status: "loading" });

    try {
      const response = await getProfileMe(session);
      setProfile(response.profile);
      setState({
        message: response.status === "empty" ? "Completa tu perfil para personalizar Kalos." : null,
        status: response.status === "empty" ? "empty" : "ready"
      });
    } catch (error) {
      const mapped = statusFromProfileError(error);
      setProfile(null);
      setState({ message: mapped.message, status: mapped.status });
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  return (
    <Screen
      eyebrow="Perfil"
      title="Atleta"
      description="Sesion Supabase activa. No se muestran tokens."
    >
      <MockCard title="Cuenta" value={session ? "Sesion activa" : "No disponible"} />

      {state.status === "loading" ? <MockCard title="Perfil" value="Cargando" /> : null}

      {state.message ? (
        <Text style={state.status === "ready" || state.status === "success" ? styles.successText : styles.helpText}>
          {state.message}
        </Text>
      ) : null}

      {state.status === "empty" ? (
        <MockCard title="Perfil biometrico" value="Sin perfil">
          <Pressable style={styles.button} onPress={() => router.push("/profile-setup")}>
            <Text style={styles.buttonText}>Completar perfil</Text>
          </Pressable>
        </MockCard>
      ) : null}

      {state.status === "ready" && profile ? (
        <>
          <MockCard title="Perfil biometrico" value={profile.display_name ?? "Listo"} />
          {getProfileSummaryCards(profile).map((card) => (
            <MockCard key={card.title} title={card.title} value={card.value} />
          ))}
          <Pressable style={styles.button} onPress={() => router.push("/profile-setup")}>
            <Text style={styles.buttonText}>Actualizar setup</Text>
          </Pressable>
        </>
      ) : null}

      <Pressable style={styles.button} onPress={() => void signOut()}>
        <Text style={styles.buttonText}>Cerrar sesion</Text>
      </Pressable>
    </Screen>
  );
}

type ProfileScreenState = {
  message: string | null;
  status: ProfileUiStatus;
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
  helpText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "800"
  }
});
