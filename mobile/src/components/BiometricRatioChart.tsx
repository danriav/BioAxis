import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

import {
  getBiometricChartLayout,
  type BiometricChartPoint
} from "@/features/dashboard/biometricHistoryViewModel";
import { colors, radii, spacing, typography } from "@/styles/theme";

const SYMMETRY_COLOR = "#33d6c5";
const CURVATURE_COLOR = "#fb7185";

export function BiometricRatioChart({
  curvature,
  height = 180,
  symmetry
}: {
  curvature: BiometricChartPoint[];
  height?: number;
  symmetry: BiometricChartPoint[];
}) {
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.min(680, Math.max(240, windowWidth - 64));
  const dates = Array.from(new Set([...symmetry, ...curvature].map((point) => point.date))).sort(
    (left, right) => Date.parse(left) - Date.parse(right)
  );
  const values = [...symmetry, ...curvature].map((point) => point.value);
  const layout = getBiometricChartLayout(dates.length, chartWidth, height);

  if (values.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No hay ratios disponibles para este historial.</Text>
      </View>
    );
  }

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max((maximum - minimum) * 0.18, 0.03);
  const lower = minimum - padding;
  const range = maximum + padding - lower || 1;
  const indexByDate = new Map(dates.map((date, index) => [date, index]));
  const coordinates = (points: BiometricChartPoint[]) =>
    points.map((point) => {
      const index = indexByDate.get(point.date) ?? 0;
      return {
        date: point.date,
        x:
          layout.horizontalPadding +
          (dates.length === 1 ? layout.drawableWidth / 2 : index * layout.pointSpacing),
        y:
          layout.verticalPadding +
          layout.drawableHeight -
          ((point.value - lower) / range) * layout.drawableHeight
      };
    });
  const symmetryCoordinates = coordinates(symmetry);
  const curvatureCoordinates = coordinates(curvature);

  return (
    <View style={styles.container} testID="biometric-ratio-chart">
      <View style={styles.legend}>
        <Legend color={SYMMETRY_COLOR} label="Simetría" />
        {curvature.length > 0 ? <Legend color={CURVATURE_COLOR} label="Curvatura" /> : null}
      </View>
      <Svg
        accessibilityLabel={`Gráfico conjunto de ratios con ${dates.length} fechas`}
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
        {symmetryCoordinates.length > 1 ? (
          <Polyline
            fill="none"
            points={symmetryCoordinates.map((point) => `${point.x},${point.y}`).join(" ")}
            stroke={SYMMETRY_COLOR}
            strokeLinejoin="round"
            strokeWidth={3.5}
          />
        ) : null}
        {curvatureCoordinates.length > 1 ? (
          <Polyline
            fill="none"
            points={curvatureCoordinates.map((point) => `${point.x},${point.y}`).join(" ")}
            stroke={CURVATURE_COLOR}
            strokeDasharray="7 6"
            strokeLinejoin="round"
            strokeWidth={3}
          />
        ) : null}
        {symmetryCoordinates.map((point, index) => (
          <Circle
            key={`symmetry-${point.date}-${index}`}
            cx={point.x}
            cy={point.y}
            fill={colors.surface}
            r={4.5}
            stroke={SYMMETRY_COLOR}
            strokeWidth={3}
          />
        ))}
        {curvatureCoordinates.map((point, index) => (
          <Circle
            key={`curvature-${point.date}-${index}`}
            cx={point.x}
            cy={point.y}
            fill={colors.surface}
            r={4}
            stroke={CURVATURE_COLOR}
            strokeWidth={2.5}
          />
        ))}
      </Svg>
      <View style={styles.dates}>
        <Text style={styles.dateText}>{symmetry[0]?.label ?? curvature[0]?.label}</Text>
        {dates.length > 1 ? (
          <Text style={styles.dateText}>
            {symmetry[symmetry.length - 1]?.label ?? curvature[curvature.length - 1]?.label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.md
  },
  dates: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  dateText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700"
  },
  empty: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    justifyContent: "center",
    minHeight: 180,
    padding: spacing.lg
  },
  emptyText: {
    color: colors.muted,
    fontSize: typography.label,
    textAlign: "center"
  },
  legend: {
    flexDirection: "row",
    gap: spacing.lg
  },
  legendDot: {
    borderRadius: radii.pill,
    height: 8,
    width: 8
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  legendText: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: "800"
  }
});
