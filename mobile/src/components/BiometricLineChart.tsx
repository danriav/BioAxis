import { useMemo } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

import {
  formatBiometricValue,
  getBiometricChartLayout,
  type BiometricChartPoint
} from "@/features/dashboard/biometricHistoryViewModel";
import { colors, radii, spacing, typography } from "@/styles/theme";

export function BiometricLineChart({
  color,
  height = 164,
  points,
  unit
}: {
  color: string;
  height?: number;
  points: BiometricChartPoint[];
  unit: string;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.min(680, Math.max(240, windowWidth - 64));
  const layout = getBiometricChartLayout(points.length, chartWidth, height);
  const values = points.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;

  const coordinates = useMemo(
    () =>
      points.map((point, index) => ({
        x:
          layout.horizontalPadding +
          (points.length === 1 ? layout.drawableWidth / 2 : index * layout.pointSpacing),
        y:
          layout.verticalPadding +
          layout.drawableHeight -
          ((point.value - minimum) / range) * layout.drawableHeight
      })),
    [layout, minimum, points, range]
  );

  if (points.length === 0) {
    return (
      <View style={styles.emptyChart} testID="biometric-chart-empty">
        <Text style={styles.emptyText}>No hay valores disponibles para esta métrica.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="biometric-line-chart">
      <View style={styles.valueRow}>
        <Text style={styles.currentValue}>
          {formatBiometricValue(points[points.length - 1].value, unit)}
        </Text>
        <Text style={styles.rangeText}>
          {formatBiometricValue(minimum, unit)} – {formatBiometricValue(maximum, unit)}
        </Text>
      </View>
      <Svg
        accessibilityLabel={`Gráfica con ${points.length} registros`}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width="100%"
      >
        {[0, 0.5, 1].map((fraction) => {
          const y = layout.verticalPadding + layout.drawableHeight * fraction;
          return (
            <Line
              key={fraction}
              stroke={colors.border}
              strokeDasharray="5 7"
              strokeWidth={1}
              x1={layout.horizontalPadding}
              x2={layout.width - layout.horizontalPadding}
              y1={y}
              y2={y}
            />
          );
        })}
        {coordinates.length > 1 ? (
          <Polyline
            fill="none"
            points={coordinates.map((point) => `${point.x},${point.y}`).join(" ")}
            stroke={color}
            strokeLinejoin="round"
            strokeWidth={3}
          />
        ) : null}
        {coordinates.map((point, index) => (
          <Circle
            key={`${points[index].date}-${index}`}
            cx={point.x}
            cy={point.y}
            fill={colors.surface}
            r={5}
            stroke={color}
            strokeWidth={3}
          />
        ))}
      </Svg>
      <View style={styles.dateRow}>
        <Text style={styles.dateText}>{points[0].label}</Text>
        {points.length > 1 ? (
          <Text style={styles.dateText}>{points[points.length - 1].label}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.md
  },
  currentValue: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900"
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  dateText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700"
  },
  emptyChart: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    justifyContent: "center",
    minHeight: 164,
    padding: spacing.lg
  },
  emptyText: {
    color: colors.muted,
    fontSize: typography.label,
    lineHeight: 18,
    textAlign: "center"
  },
  rangeText: {
    color: colors.muted,
    fontSize: typography.caption,
    fontWeight: "700"
  },
  valueRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between"
  }
});
