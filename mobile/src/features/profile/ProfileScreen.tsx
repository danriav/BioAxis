import { Pressable, StyleSheet, Text } from "react-native";

import { MockCard } from "@/components/MockCard";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth/AuthProvider";
import { colors, spacing } from "@/styles/theme";

export function ProfileScreen() {
  const { session, signOut } = useAuth();

  return (
    <Screen
      eyebrow="Perfil"
      title="Atleta"
      description="Sesión Supabase activa. No se muestran tokens."
    >
      <MockCard title="Cuenta" value={session?.user.email ?? "Sandbox"} />
      <Pressable style={styles.button} onPress={() => void signOut()}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
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
