import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/styles/theme";

type MockCardProps = PropsWithChildren<{
  title: string;
  value?: string;
}>;

export function MockCard({ title, value, children }: MockCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {typeof children === "string" ? <Text style={styles.body}>{children}</Text> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md
  },
  title: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  value: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: spacing.xs
  },
  body: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm
  }
});
