import { Redirect, Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";

import { useAuth } from "@/features/auth/AuthProvider";
import { colors } from "@/styles/theme";

function tabIcon(label: string) {
  return function Icon({ color }: { color: ColorValue }) {
    return <Text style={{ color, fontSize: 12, fontWeight: "900" }}>{label.slice(0, 1)}</Text>;
  };
}

export default function AuthenticatedTabsLayout() {
  const { status } = useAuth();

  if (status === "loading") {
    return null;
  }

  if (status !== "authenticated") {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border
        }
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Dashboard", tabBarIcon: tabIcon("Dashboard") }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{ title: "Nutrición", tabBarIcon: tabIcon("Nutrición") }}
      />
      <Tabs.Screen
        name="workout"
        options={{ title: "Entrenamiento", tabBarIcon: tabIcon("Entrenamiento") }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Perfil", tabBarIcon: tabIcon("Perfil") }}
      />
    </Tabs>
  );
}
