import { Redirect, Tabs } from "expo-router";
import { ChartNoAxesCombined, Dumbbell, Salad, UserRound, type LucideIcon } from "lucide-react-native";
import { StyleSheet, View, type ColorValue } from "react-native";

import { useAuth } from "@/features/auth/AuthProvider";
import { colors, radii, tabBarStyle } from "@/styles/theme";

function tabIcon(Icon: LucideIcon) {
  return function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return (
      <View style={[styles.iconContainer, focused ? styles.activeIconContainer : null]}>
        <Icon color={color as string} size={size} strokeWidth={focused ? 2.5 : 2} />
      </View>
    );
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
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 2
        },
        tabBarStyle,
        tabBarItemStyle: { gap: 1 }
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ headerShown: false, title: "Dashboard", tabBarIcon: tabIcon(ChartNoAxesCombined) }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{ headerShown: false, title: "Nutrición", tabBarIcon: tabIcon(Salad) }}
      />
      <Tabs.Screen
        name="workout"
        options={{ headerShown: false, title: "Entrenamiento", tabBarIcon: tabIcon(Dumbbell) }}
      />
      <Tabs.Screen
        name="profile"
        options={{ headerShown: false, title: "Perfil", tabBarIcon: tabIcon(UserRound) }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconContainer: {
    backgroundColor: colors.primarySoft
  },
  iconContainer: {
    alignItems: "center",
    borderRadius: radii.sm,
    height: 30,
    justifyContent: "center",
    width: 44
  }
});
