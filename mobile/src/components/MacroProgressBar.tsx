import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "@/styles/theme";

type MacroProgressBarProps = {
  color: string;
  consumed: number;
  label: string;
  target: number;
};

export function MacroProgressBar({ color, consumed, label, target }: MacroProgressBarProps) {
  const progress = target > 0 ? Math.min(Math.max(consumed / target, 0), 1) : 0;

  return (
    <View
      accessibilityLabel={`${label}: ${consumed} de ${target} gramos`}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: target, min: 0, now: consumed }}
      style={styles.container}
    >
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {consumed} <Text style={styles.target}>/ {target} g</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { backgroundColor: color, width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm
  },
  fill: {
    borderRadius: radii.pill,
    height: "100%"
  },
  label: {
    color: colors.textSubtle,
    fontSize: typography.label,
    fontWeight: "700"
  },
  labelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  target: {
    color: colors.muted,
    fontWeight: "600"
  },
  track: {
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    height: 7,
    overflow: "hidden"
  },
  value: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "800"
  }
});
