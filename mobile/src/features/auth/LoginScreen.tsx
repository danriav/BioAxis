import { Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth/AuthProvider";
import { colors, spacing } from "@/styles/theme";

export function LoginScreen() {
  const { error, signIn, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (status === "authenticated") {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  const handleSubmit = () => {
    void signIn(email.trim(), password);
  };

  return (
    <Screen
      eyebrow="Kalos Mobile"
      title="Login sandbox"
      description="Inicia sesión con un usuario sandbox de Supabase Auth."
    >
      <View style={styles.form}>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="sandbox@kalos.test"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={email}
        />
        <TextInput
          onChangeText={setPassword}
          placeholder="Password sandbox"
          placeholderTextColor={colors.muted}
          secureTextEntry
          style={styles.input}
          value={password}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          disabled={status === "loading" || !email || !password}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.button,
            (pressed || status === "loading" || !email || !password) && styles.buttonDisabled
          ]}
        >
          <Text style={styles.buttonText}>
            {status === "loading" ? "Validando..." : "Ingresar"}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md
  },
  buttonDisabled: {
    opacity: 0.55
  },
  buttonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  }
});
