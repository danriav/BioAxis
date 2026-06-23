import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { colors, typography } from "@/styles/theme";

type CircularProgressProps = {
  consumed: number;
  progress: number;
  size?: number;
  target: number;
};

export function CircularProgress({ consumed, progress, size = 164, target }: CircularProgressProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedProgress = Math.max(0, Math.min(progress, 1));
  const offset = circumference * (1 - normalizedProgress);

  return (
    <View
      accessibilityLabel={`${consumed} de ${target} kilocalorías consumidas`}
      accessibilityRole="progressbar"
      accessibilityValue={{
        max: target,
        min: 0,
        now: consumed
      }}
      style={[styles.container, { height: size, width: size }]}
      testID="calorie-progress"
    >
      <Svg height={size} width={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          origin={`${size / 2}, ${size / 2}`}
          r={radius}
          rotation="-90"
          stroke={colors.primary}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </Svg>
      <View pointerEvents="none" style={styles.content}>
        <Text style={styles.value}>{consumed}</Text>
        <Text style={styles.unit}>de {target} kcal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center"
  },
  content: {
    alignItems: "center",
    position: "absolute"
  },
  svg: {
    position: "absolute"
  },
  unit: {
    color: colors.muted,
    fontSize: typography.caption,
    marginTop: 2
  },
  value: {
    color: colors.text,
    fontSize: typography.display,
    fontWeight: "900"
  }
});
