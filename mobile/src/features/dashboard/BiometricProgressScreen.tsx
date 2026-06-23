import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ChartNoAxesCombined,
  RefreshCw,
  TrendingDown,
  TrendingUp
} from "lucide-react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BiometricLineChart } from "@/components/BiometricLineChart";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  biometricMetricGroups,
  formatBiometricDate,
  formatBiometricValue,
  getEmptyMetricMessage,
  getEvolutionAvailability,
  getBiometricChartPoints,
  getBiometricMetric,
  getBiometricTrend,
  normalizeBiometricHistory,
  statusFromBiometricHistoryError,
  type BiometricHistoryStatus,
  type BiometricMetricKey
} from "@/features/dashboard/biometricHistoryViewModel";
import {
  getProfileHistory,
  type BiometricHistoryEntry
} from "@/lib/api/profile-history";
import { colors, radii, spacing, typography } from "@/styles/theme";

export function BiometricProgressScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [entries, setEntries] = useState<BiometricHistoryEntry[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<BiometricMetricKey>("peso");
  const [state, setState] = useState<ProgressState>({ message: null, status: "loading" });

  const loadHistory = useCallback(async () => {
    setState({ message: null, status: "loading" });
    try {
      const response = normalizeBiometricHistory(await getProfileHistory(session));
      setEntries(response.entries);
      setState({
        message: response.status === "empty" ? "Aún no hay registros biométricos para comparar." : null,
        status: response.status
      });
    } catch (error) {
      const mapped = statusFromBiometricHistoryError(error);
      setEntries([]);
      setState(mapped);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory])
  );

  const metric = getBiometricMetric(selectedMetric);
  const points = getBiometricChartPoints(entries, selectedMetric);
  const trend = getBiometricTrend(points);
  const availability = getEvolutionAvailability(points);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable accessibilityLabel="Volver" style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.text} size={21} />
        </Pressable>
        <View style={styles.topBarCopy}>
          <Text style={styles.eyebrow}>Laboratorio de métricas</Text>
          <Text style={styles.title}>Progresión detallada</Text>
        </View>
        <Pressable
          accessibilityLabel="Actualizar progresión"
          disabled={state.status === "loading"}
          style={styles.refreshButton}
          onPress={() => void loadHistory()}
        >
          <RefreshCw color={colors.textSubtle} size={19} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {state.status === "loading" ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.stateTitle}>Cargando progresión</Text>
            <Text style={styles.stateText}>Consultando tu historial seguro.</Text>
          </View>
        ) : null}

        {state.status === "empty" ? (
          <View style={styles.centerState}>
            <View style={styles.stateIcon}>
              <ChartNoAxesCombined color={colors.primary} size={27} />
            </View>
            <Text style={styles.stateTitle}>Sin historial todavía</Text>
            <Text style={styles.stateText}>{state.message}</Text>
          </View>
        ) : null}

        {!["loading", "empty", "ready"].includes(state.status) ? (
          <View style={styles.errorState}>
            <AlertTriangle color={colors.danger} size={23} />
            <View style={styles.stateCopy}>
              <Text style={styles.stateTitle}>
                {state.status === "session_expired" || state.status === "missing_session"
                  ? "Tu sesión expiró"
                  : "No pudimos cargar tu progresión"}
              </Text>
              <Text style={styles.stateText}>{state.message}</Text>
            </View>
            <Pressable style={styles.retryButton} onPress={() => void loadHistory()}>
              <RefreshCw color={colors.text} size={17} />
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {state.status === "ready" ? (
          <>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Registros</Text>
                <Text style={styles.summaryValue}>{entries.length}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryDates}>
                <Text style={styles.summaryLabel}>Periodo</Text>
                <Text style={styles.summaryDate}>
                  {formatBiometricDate(entries[0].recorded_at)} –{" "}
                  {formatBiometricDate(entries[entries.length - 1].recorded_at)}
                </Text>
              </View>
            </View>

            <View style={styles.metricSelector} testID="biometric-metric-selector">
              {biometricMetricGroups.map((group) => (
                <View key={group.key} style={styles.metricGroup}>
                  <Text style={styles.metricGroupTitle}>{group.title}</Text>
                  <View style={styles.metricTabs}>
                    {group.metrics.map((metricKey) => {
                      const option = getBiometricMetric(metricKey);
                      const selected = selectedMetric === option.key;
                      return (
                        <Pressable
                          key={option.key}
                          accessibilityRole="tab"
                          accessibilityState={{ selected }}
                          style={[styles.metricTab, selected ? styles.metricTabSelected : null]}
                          onPress={() => setSelectedMetric(option.key)}
                        >
                          <Text style={[styles.metricTabText, selected ? styles.metricTabTextSelected : null]}>
                            {option.shortLabel}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartEyebrow}>Evolución cronológica</Text>
                  <Text style={styles.chartTitle}>{metric.label}</Text>
                </View>
                <TrendBadge change={trend.change} direction={trend.direction} unit={metric.unit} />
              </View>
              <BiometricLineChart color={metric.color} points={points} unit={metric.unit} />
              {availability === "empty" ? (
                <Text style={styles.nullNote}>
                  {getEmptyMetricMessage(selectedMetric)}
                </Text>
              ) : null}
              {availability === "insufficient" ? (
                <Text style={styles.insufficientNote}>
                  Se necesita otro registro para calcular la evolución neta.
                </Text>
              ) : null}
            </View>

            <View style={styles.sectionHeader}>
              <CalendarDays color={colors.primary} size={20} />
              <View>
                <Text style={styles.sectionTitle}>Historial</Text>
                <Text style={styles.sectionDescription}>Del registro más antiguo al más reciente</Text>
              </View>
            </View>

            <View style={styles.timeline}>
              {points.map((point, index) => (
                <View key={`${point.date}-${index}`} style={styles.timelineRow}>
                  <View style={styles.timelineRail}>
                    <View style={[styles.timelineDot, { borderColor: metric.color }]} />
                    {index < points.length - 1 ? <View style={styles.timelineLine} /> : null}
                  </View>
                  <View style={styles.timelineCopy}>
                    <Text style={styles.timelineDate}>{point.label}</Text>
                    <Text style={styles.timelineValue}>
                      {formatBiometricValue(point.value, metric.unit)}
                    </Text>
                  </View>
                  {index === points.length - 1 ? <Text style={styles.currentBadge}>Actual</Text> : null}
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function TrendBadge({
  change,
  direction,
  unit
}: {
  change: number | null;
  direction: "down" | "neutral" | "up";
  unit: string;
}) {
  if (change === null) {
    return <Text style={styles.neutralTrend}>Sin evolución</Text>;
  }
  const Icon = direction === "down" ? TrendingDown : TrendingUp;
  const tone =
    direction === "down"
      ? { backgroundColor: colors.dangerSoft, color: colors.danger }
      : direction === "up"
        ? { backgroundColor: colors.primarySoft, color: colors.primary }
        : { backgroundColor: colors.surfaceMuted, color: colors.muted };
  return (
    <View style={[styles.trendBadge, { backgroundColor: tone.backgroundColor }]}>
      {direction !== "neutral" ? <Icon color={tone.color} size={15} /> : null}
      <Text style={[styles.trendText, { color: tone.color }]}>
        {change > 0 ? "+" : ""}
        {formatBiometricValue(change, unit)}
      </Text>
    </View>
  );
}

type ProgressState = {
  message: string | null;
  status: BiometricHistoryStatus;
};

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  centerState: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xxxl
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  chartEyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  chartHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  chartTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900",
    marginTop: 2
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxxl
  },
  currentBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  errorState: {
    alignItems: "flex-start",
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    padding: spacing.lg
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  metricTab: {
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  metricTabSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  metricTabText: {
    color: colors.muted,
    fontSize: typography.label,
    fontWeight: "800"
  },
  metricTabTextSelected: {
    color: colors.primary
  },
  metricTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricGroup: {
    gap: spacing.sm
  },
  metricGroupTitle: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  metricSelector: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  neutralTrend: {
    color: colors.muted,
    fontSize: typography.caption,
    fontWeight: "800"
  },
  nullNote: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 17
  },
  insufficientNote: {
    color: colors.warning,
    fontSize: typography.caption,
    lineHeight: 17
  },
  refreshButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  retryButton: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.md
  },
  retryText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "800"
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  sectionDescription: {
    color: colors.muted,
    fontSize: typography.caption,
    marginTop: 2
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900"
  },
  stateCopy: {
    flex: 1
  },
  stateIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  stateText: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 21,
    textAlign: "center"
  },
  stateTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900",
    textAlign: "center"
  },
  summaryDate: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "800",
    marginTop: 2
  },
  summaryDates: {
    flex: 1
  },
  summaryDivider: {
    alignSelf: "stretch",
    backgroundColor: colors.border,
    width: 1
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: typography.caption,
    fontWeight: "700"
  },
  summaryRow: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.lg,
    padding: spacing.lg
  },
  summaryValue: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900"
  },
  timeline: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg
  },
  timelineCopy: {
    flex: 1
  },
  timelineDate: {
    color: colors.muted,
    fontSize: typography.caption
  },
  timelineDot: {
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 3,
    height: 14,
    width: 14
  },
  timelineLine: {
    backgroundColor: colors.border,
    flex: 1,
    width: 2
  },
  timelineRail: {
    alignItems: "center",
    alignSelf: "stretch",
    width: 18
  },
  timelineRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64
  },
  timelineValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900",
    marginTop: 3
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900",
    marginTop: 2
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg
  },
  topBarCopy: {
    flex: 1
  },
  trendBadge: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  trendText: {
    fontSize: typography.caption,
    fontWeight: "900"
  }
});
