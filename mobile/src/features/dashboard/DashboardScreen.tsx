import { useFocusEffect, useRouter } from "expo-router";
import {
  ArrowRight,
  ChartNoAxesCombined,
  Dumbbell,
  RefreshCw,
  Ruler,
  Salad,
  Scale,
  Target,
  UserRound,
  Zap
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BiometricRatioChart } from "@/components/BiometricRatioChart";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  dashboardBodyMeasureGroups,
  formatBiometricValue,
  getBiometricAnalysis,
  getBiometricMetric,
  getRatioChartSeries,
  normalizeBiometricHistory,
  statusFromBiometricHistoryError,
  type BiometricMetricKey,
  type BiometricHistoryStatus
} from "@/features/dashboard/biometricHistoryViewModel";
import {
  deriveDashboardState,
  formatDashboardGoal,
  getDashboardAthleteLabel,
  getDashboardNutritionSummary,
  getDashboardTrainingSummary,
  statusFromDashboardError,
  type DashboardStatus
} from "@/features/dashboard/dashboardViewModel";
import { getLocalDateString } from "@/features/nutrition/NutritionScreen";
import { useNutritionLogs } from "@/features/nutrition/useNutritionLogs";
import { useNutritionTargets } from "@/features/nutrition/useNutritionTargets";
import { getProfileMe, type AthleteProfile } from "@/lib/api/profile";
import {
  getProfileHistory,
  type BiometricHistoryEntry
} from "@/lib/api/profile-history";
import { colors, radii, spacing, typography } from "@/styles/theme";

export function DashboardScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const today = getLocalDateString();
  const targetsState = useNutritionTargets();
  const logsState = useNutritionLogs(today);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [profileState, setProfileState] = useState<DashboardScreenState>({
    message: null,
    status: "loading"
  });
  const [history, setHistory] = useState<BiometricHistoryEntry[]>([]);
  const [historyState, setHistoryState] = useState<BiometricHistoryScreenState>({
    message: null,
    status: "loading"
  });
  const compact = width < 380;

  const loadProfile = useCallback(async () => {
    setProfileState({ message: null, status: "loading" });

    try {
      const response = await getProfileMe(session);
      setProfile(response.profile);
      setProfileState({
        message: response.status === "empty" ? "Completa tu perfil para activar tu resumen." : null,
        status: response.status === "empty" ? "empty" : "ready"
      });
    } catch (error) {
      const mapped = statusFromDashboardError(error);
      setProfile(null);
      setProfileState({ message: mapped.message, status: mapped.status });
    }
  }, [session]);

  const loadHistory = useCallback(async () => {
    setHistoryState({ message: null, status: "loading" });
    try {
      const normalized = normalizeBiometricHistory(await getProfileHistory(session));
      setHistory(normalized.entries);
      setHistoryState({
        message: normalized.status === "empty" ? "Actualiza tu perfil para iniciar la evolución." : null,
        status: normalized.status
      });
    } catch (error) {
      const mapped = statusFromBiometricHistoryError(error);
      setHistory([]);
      setHistoryState(mapped);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
      void loadHistory();
    }, [loadHistory, loadProfile])
  );

  const nutritionSummary = getDashboardNutritionSummary(
    logsState.status === "success" ? logsState.logs?.totals ?? null : null,
    targetsState.status === "success" ? targetsState.targets : null
  );
  const trainingSummary = getDashboardTrainingSummary(profile);
  const dashboardState = deriveDashboardState({
    logsMessage: logsState.errorMessage,
    logsStatus: logsState.status,
    profileMessage: profileState.message,
    profileStatus: profileState.status,
    targetsMessage: targetsState.errorMessage,
    targetsStatus: targetsState.status
  });
  const canShowNutritionFallback =
    dashboardState.status === "ready" &&
    logsState.status === "success" &&
    targetsState.status === "success" &&
    nutritionSummary === null;

  function reloadDashboard() {
    void loadProfile();
    void loadHistory();
    void logsState.reload();
    void targetsState.reload();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        testID="dashboard-scroll"
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Hoy en Kalos</Text>
            <Text style={styles.title}>Tu día, de un vistazo</Text>
            <Text style={styles.date}>{formatDashboardDate(today)}</Text>
          </View>
          <Pressable
            accessibilityLabel="Actualizar dashboard"
            accessibilityRole="button"
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
            onPress={reloadDashboard}
          >
            <RefreshCw color={colors.textSubtle} size={20} />
          </Pressable>
        </View>

        {dashboardState.status === "loading" ? (
          <View accessibilityLabel="Cargando dashboard" style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Preparando tu resumen</Text>
          </View>
        ) : null}

        {dashboardState.status === "empty" ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <UserRound color={colors.primary} size={28} />
            </View>
            <Text style={styles.emptyTitle}>Completa tu perfil</Text>
            <Text style={styles.emptyText}>{dashboardState.message}</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.primaryButton}
              onPress={() => router.push("/profile-setup")}
            >
              <Text style={styles.primaryButtonText}>Configurar perfil</Text>
              <ArrowRight color={colors.background} size={18} />
            </Pressable>
          </View>
        ) : null}

        {dashboardState.status !== "loading" &&
        dashboardState.status !== "ready" &&
        dashboardState.status !== "empty" ? (
          <View style={styles.errorState}>
            <Text style={styles.errorTitle}>No pudimos cargar tu resumen</Text>
            <Text style={styles.errorText}>
              {dashboardState.message ?? "Intenta de nuevo en unos momentos."}
            </Text>
            <Pressable accessibilityRole="button" style={styles.retryButton} onPress={reloadDashboard}>
              <RefreshCw color={colors.text} size={17} />
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {dashboardState.status === "ready" && profile ? (
          <>
            <View style={styles.welcomeRow}>
              <View style={styles.avatar}>
                <UserRound color={colors.primary} size={23} />
              </View>
              <View style={styles.welcomeCopy}>
                <Text style={styles.welcomeLabel}>Hola</Text>
                <Text numberOfLines={1} style={styles.athleteName}>
                  {getDashboardAthleteLabel(profile)}
                </Text>
              </View>
              <View style={styles.goalBadge}>
                <Target color={colors.primary} size={15} />
                <Text numberOfLines={1} style={styles.goalText}>
                  {formatDashboardGoal(profile.objetivo_metabolico)}
                </Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Resumen de hoy</Text>
              <Text style={styles.sectionHint}>Datos reales del backend</Text>
            </View>

            <View style={[styles.dailyGrid, compact ? styles.compactGrid : null]}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.dailyPanel,
                  compact ? styles.compactPanel : null,
                  pressed ? styles.pressed : null
                ]}
                onPress={() => router.push("/(tabs)/nutrition")}
              >
                <View style={styles.panelHeader}>
                  <View style={[styles.panelIcon, styles.nutritionIcon]}>
                    <Salad color={colors.primary} size={21} />
                  </View>
                  <ArrowRight color={colors.muted} size={18} />
                </View>
                <Text style={styles.panelLabel}>Nutrición</Text>
                {nutritionSummary ? (
                  <>
                    <Text style={styles.panelValue}>
                      {nutritionSummary.consumed}
                      <Text style={styles.panelValueMuted}> / {nutritionSummary.target} kcal</Text>
                    </Text>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${nutritionSummary.progress * 100}%` }
                        ]}
                      />
                    </View>
                    <Text style={styles.panelDetail}>
                      {nutritionSummary.remaining} kcal disponibles
                    </Text>
                  </>
                ) : canShowNutritionFallback ? (
                  <DashboardPanelFallback
                    loading={false}
                    text="Abre Nutrición para revisar tu día."
                  />
                ) : null}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.dailyPanel,
                  compact ? styles.compactPanel : null,
                  pressed ? styles.pressed : null
                ]}
                onPress={() => router.push("/(tabs)/workout")}
              >
                <View style={styles.panelHeader}>
                  <View style={[styles.panelIcon, styles.trainingIcon]}>
                    <Dumbbell color={colors.carbs} size={21} />
                  </View>
                  <ArrowRight color={colors.muted} size={18} />
                </View>
                <Text style={styles.panelLabel}>Entrenamiento</Text>
                <Text style={styles.panelValue}>{trainingSummary.value}</Text>
                <Text style={styles.panelDetail}>{trainingSummary.detail}</Text>
              </Pressable>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Perfil actual</Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => router.push("/(tabs)/profile")}
              >
                <Text style={styles.textAction}>Ver perfil</Text>
              </Pressable>
            </View>

            <View style={styles.profileSummary}>
              <ProfileDatum
                icon={Scale}
                label="Peso"
                value={profile.peso === null ? "Pendiente" : `${Math.round(profile.peso)} kg`}
              />
              <View style={styles.verticalDivider} />
              <ProfileDatum
                icon={Dumbbell}
                label="Frecuencia"
                value={
                  profile.dias_entrenamiento_semana === null
                    ? "Pendiente"
                    : `${profile.dias_entrenamiento_semana} días`
                }
              />
              <View style={styles.verticalDivider} />
              <ProfileDatum
                icon={Target}
                label="Objetivo"
                value={formatDashboardGoal(profile.objetivo_metabolico)}
              />
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Progresión biométrica</Text>
                <Text style={styles.sectionDescription}>Historial real de tu perfil</Text>
              </View>
              {historyState.status === "ready" ? (
                <Pressable onPress={() => router.push("/biometric-progress")}>
                  <Text style={styles.textAction}>Ver detalle</Text>
                </Pressable>
              ) : null}
            </View>

            <DashboardBiometricProgress
              entries={history}
              message={historyState.message}
              onOpen={() => router.push("/biometric-progress")}
              onRegister={() => router.push("/profile-setup")}
              onRetry={() => void loadHistory()}
              status={historyState.status}
            />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Accesos rápidos</Text>
            </View>
            <View style={styles.quickActions}>
              <QuickAction
                icon={Salad}
                label="Registrar comida"
                onPress={() => router.push("/(tabs)/nutrition")}
              />
              <QuickAction
                icon={Dumbbell}
                label="Generar preview"
                onPress={() => router.push("/(tabs)/workout")}
              />
              <QuickAction
                icon={ChartNoAxesCombined}
                label="Actualizar perfil"
                onPress={() => router.push("/profile-setup")}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function DashboardPanelFallback({ loading, text }: { loading: boolean; text: string }) {
  return (
    <View style={styles.panelFallback}>
      {loading ? <ActivityIndicator color={colors.primary} size="small" /> : null}
      <Text style={styles.panelDetail}>{loading ? "Cargando nutrición" : text}</Text>
    </View>
  );
}

function ProfileDatum({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Scale;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.profileDatum}>
      <Icon color={colors.primary} size={18} />
      <Text style={styles.profileLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.profileValue}>
        {value}
      </Text>
    </View>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onPress
}: {
  icon: typeof Salad;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.quickAction, pressed ? styles.pressed : null]}
      onPress={onPress}
    >
      <View style={styles.quickIcon}>
        <Icon color={colors.primary} size={20} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
      <ArrowRight color={colors.muted} size={17} />
    </Pressable>
  );
}

function DashboardBiometricProgress({
  entries,
  message,
  onOpen,
  onRegister,
  onRetry,
  status
}: {
  entries: BiometricHistoryEntry[];
  message: string | null;
  onOpen: () => void;
  onRegister: () => void;
  onRetry: () => void;
  status: BiometricHistoryStatus;
}) {
  if (status === "loading") {
    return (
      <View style={styles.progressState}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.progressStateText}>Cargando historial</Text>
      </View>
    );
  }

  if (status === "empty") {
    return (
      <View style={styles.progressState}>
        <ChartNoAxesCombined color={colors.primary} size={25} />
        <Text style={styles.progressStateTitle}>Sin evolución todavía</Text>
        <Text style={styles.progressStateText}>{message}</Text>
      </View>
    );
  }

  if (status !== "ready") {
    return (
      <View style={styles.progressError}>
        <Text style={styles.progressStateTitle}>Historial no disponible</Text>
        <Text style={styles.progressStateText}>{message ?? "Intenta nuevamente."}</Text>
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <RefreshCw color={colors.text} size={17} />
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const analysis = getBiometricAnalysis(entries);
  const ratios = getRatioChartSeries(entries);
  const current = analysis.current;

  return (
    <View style={styles.progressCard}>
      <View style={styles.progressCardHeader}>
        <View>
          <Text style={styles.progressCardEyebrow}>{entries.length} registros</Text>
          <Text style={styles.progressCardTitle}>Análisis bio-estético</Text>
        </View>
        <Text style={styles.progressChange}>Cronológico</Text>
      </View>

      <BiometricRatioChart
        curvature={ratios.curvature}
        height={150}
        symmetry={ratios.symmetry}
      />

      <View style={styles.currentMeasures}>
        <CurrentMeasure label="Hombros" value={current?.hombros ?? null} />
        <View style={styles.measureDivider} />
        <CurrentMeasure label="Cintura" value={current?.cintura ?? null} />
        <View style={styles.measureDivider} />
        <CurrentMeasure label="Cadera" value={current?.cadera ?? null} />
      </View>

      <BodyMeasureMap current={current} />

      <View style={styles.ratioCards}>
        <RatioCard
          color={colors.primary}
          icon={Target}
          label="X-Frame Index"
          target={analysis.xFrameTarget}
          value={analysis.xFrame}
        />
        {analysis.hourglass !== null ? (
          <RatioCard
            color={colors.danger}
            icon={Zap}
            label="Hourglass Ratio"
            target={analysis.hourglassTarget}
            value={analysis.hourglass}
          />
        ) : null}
      </View>

      <View style={styles.balanceRow}>
        <Ruler color={colors.primary} size={18} />
        <View style={styles.balanceCopy}>
          <Text style={styles.balanceLabel}>Balance de extremidades</Text>
          <Text style={styles.balanceText}>Diferencia brazo–pantorrilla</Text>
        </View>
        <Text style={styles.balanceValue}>
          {analysis.extremityBalance === null
            ? "Pendiente"
            : formatBiometricValue(analysis.extremityBalance, "cm")}
        </Text>
      </View>

      <Pressable accessibilityRole="button" style={styles.progressPrimaryAction} onPress={onOpen}>
        <Text style={styles.progressPrimaryText}>Progresión detallada</Text>
        <ArrowRight color={colors.background} size={18} />
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.progressSecondaryAction} onPress={onRegister}>
        <Text style={styles.progressSecondaryText}>Registrar nueva biometría</Text>
      </Pressable>
    </View>
  );
}

function BodyMeasureMap({ current }: { current: BiometricHistoryEntry | null }) {
  return (
    <View style={styles.bodyMap}>
      <View style={styles.bodyMapHeader}>
        <View>
          <Text style={styles.bodyMapTitle}>Mapa corporal</Text>
          <Text style={styles.bodyMapSubtitle}>Medidas actuales disponibles</Text>
        </View>
        <Ruler color={colors.primary} size={18} />
      </View>
      <View style={styles.bodyMapGroups}>
        {dashboardBodyMeasureGroups.map((group) => (
          <View key={group.title} style={styles.bodyMapGroup}>
            <Text style={styles.bodyMapGroupTitle}>{group.title}</Text>
            <View style={styles.bodyMapGrid}>
              {group.metrics.map((metric) => (
                <BodyMeasureChip current={current} key={metric} metric={metric} />
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function BodyMeasureChip({
  current,
  metric
}: {
  current: BiometricHistoryEntry | null;
  metric: BiometricMetricKey;
}) {
  const option = getBiometricMetric(metric);
  const value = current?.[metric];
  return (
    <View style={styles.bodyMeasureChip}>
      <Text numberOfLines={1} style={styles.bodyMeasureLabel}>
        {option.shortLabel}
      </Text>
      <Text style={styles.bodyMeasureValue}>
        {typeof value === "number" ? formatBiometricValue(value, option.unit) : "Pendiente"}
      </Text>
    </View>
  );
}

function CurrentMeasure({ label, value }: { label: string; value: number | null }) {
  return (
    <View style={styles.currentMeasure}>
      <Text style={styles.currentMeasureLabel}>{label}</Text>
      <Text style={styles.currentMeasureValue}>
        {value === null ? "—" : formatBiometricValue(value, "cm")}
      </Text>
    </View>
  );
}

function RatioCard({
  color,
  icon: Icon,
  label,
  target,
  value
}: {
  color: string;
  icon: typeof Target;
  label: string;
  target: number;
  value: number | null;
}) {
  return (
    <View style={styles.ratioCard}>
      <View style={styles.ratioHeading}>
        <Icon color={color} size={16} />
        <Text style={styles.ratioLabel}>{label}</Text>
      </View>
      <View style={styles.ratioValues}>
        <View>
          <Text style={styles.ratioCaption}>Actual</Text>
          <Text style={styles.ratioCurrent}>{value === null ? "—" : value.toFixed(2)}</Text>
        </View>
        <View style={styles.ratioDivider} />
        <View>
          <Text style={styles.ratioCaption}>Meta</Text>
          <Text style={[styles.ratioTarget, { color }]}>{target.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

export function formatDashboardDate(dateString: string) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    weekday: "long"
  });
}

type DashboardScreenState = {
  message: string | null;
  status: DashboardStatus;
};

type BiometricHistoryScreenState = {
  message: string | null;
  status: BiometricHistoryStatus;
};

const styles = StyleSheet.create({
  athleteName: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900"
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  balanceCopy: {
    flex: 1
  },
  balanceLabel: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "900"
  },
  balanceRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  balanceText: {
    color: colors.muted,
    fontSize: typography.caption,
    marginTop: 2
  },
  balanceValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  },
  bodyMap: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  bodyMapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  bodyMapGroup: {
    gap: spacing.sm
  },
  bodyMapGroups: {
    gap: spacing.md
  },
  bodyMapGroupTitle: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  bodyMapHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  bodyMapSubtitle: {
    color: colors.muted,
    fontSize: typography.caption,
    marginTop: 2
  },
  bodyMapTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  },
  bodyMeasureChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    minWidth: 92,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  bodyMeasureLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  bodyMeasureValue: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "900",
    marginTop: 3
  },
  compactGrid: {
    flexDirection: "column"
  },
  compactPanel: {
    width: "100%"
  },
  content: {
    gap: spacing.lg,
    paddingBottom: 104,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg
  },
  currentMeasure: {
    alignItems: "center",
    flex: 1,
    gap: 3
  },
  currentMeasureLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  currentMeasures: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    flexDirection: "row",
    paddingVertical: spacing.md
  },
  currentMeasureValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  },
  dailyGrid: {
    flexDirection: "row",
    gap: spacing.md
  },
  dailyPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    minHeight: 190,
    padding: spacing.lg
  },
  date: {
    color: colors.muted,
    fontSize: typography.label,
    marginTop: spacing.xs,
    textTransform: "capitalize"
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl
  },
  emptyText: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 21,
    maxWidth: 290,
    textAlign: "center"
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900",
    marginTop: spacing.xs
  },
  errorState: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  errorText: {
    color: colors.textSubtle,
    fontSize: typography.body,
    lineHeight: 21
  },
  errorTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900"
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  goalBadge: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: spacing.xs,
    maxWidth: 132,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  goalText: {
    color: colors.primary,
    flexShrink: 1,
    fontSize: typography.caption,
    fontWeight: "800"
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  headerCopy: {
    flex: 1,
    paddingRight: spacing.md
  },
  horizontalDivider: {
    backgroundColor: colors.border,
    bottom: 0,
    height: 1,
    left: 0,
    position: "absolute",
    right: 0
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  loadingState: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    gap: spacing.md,
    padding: spacing.xxxl
  },
  loadingText: {
    color: colors.textSubtle,
    fontSize: typography.body
  },
  metricLabel: {
    color: colors.textSubtle,
    fontSize: typography.body,
    fontWeight: "700"
  },
  metricLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  metricRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    position: "relative"
  },
  metricValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  },
  metricsPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg
  },
  nutritionIcon: {
    backgroundColor: colors.primarySoft
  },
  panelDetail: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 17,
    marginTop: spacing.sm
  },
  panelFallback: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  panelHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  panelIcon: {
    alignItems: "center",
    borderRadius: radii.sm,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  panelLabel: {
    color: colors.textSubtle,
    fontSize: typography.label,
    fontWeight: "800",
    marginTop: spacing.md
  },
  panelValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: spacing.xs
  },
  panelValueMuted: {
    color: colors.muted,
    fontSize: typography.caption,
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.78
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  progressCardEyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  progressCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  progressCardTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900",
    marginTop: 2
  },
  progressChange: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  progressError: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  progressFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  progressFooterText: {
    color: colors.textSubtle,
    fontSize: typography.label,
    fontWeight: "800"
  },
  progressPrimaryAction: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 50
  },
  progressPrimaryText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: "900"
  },
  progressSecondaryAction: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 46
  },
  progressSecondaryText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "900"
  },
  progressState: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl
  },
  progressStateText: {
    color: colors.muted,
    fontSize: typography.label,
    lineHeight: 18,
    textAlign: "center"
  },
  progressStateTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  },
  measureDivider: {
    alignSelf: "stretch",
    backgroundColor: colors.border,
    width: 1
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: "900"
  },
  profileDatum: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
    paddingHorizontal: spacing.xs
  },
  profileLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700"
  },
  profileSummary: {
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 112,
    paddingVertical: spacing.lg
  },
  profileValue: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "900",
    textAlign: "center"
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: "100%"
  },
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    height: 7,
    marginTop: spacing.md,
    overflow: "hidden"
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.md
  },
  quickActions: {
    gap: spacing.sm
  },
  quickIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  quickLabel: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: "800"
  },
  ratioCaption: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  ratioCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
    padding: spacing.md
  },
  ratioCards: {
    flexDirection: "row",
    gap: spacing.sm
  },
  ratioCurrent: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900"
  },
  ratioDivider: {
    alignSelf: "stretch",
    backgroundColor: colors.border,
    width: 1
  },
  ratioHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  ratioLabel: {
    color: colors.textSubtle,
    flex: 1,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  ratioTarget: {
    fontSize: typography.title,
    fontWeight: "900"
  },
  ratioValues: {
    flexDirection: "row",
    gap: spacing.md
  },
  retryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
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
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 11
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900"
  },
  textAction: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: "800"
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900",
    marginTop: 2
  },
  trainingIcon: {
    backgroundColor: "#132e48"
  },
  verticalDivider: {
    alignSelf: "stretch",
    backgroundColor: colors.border,
    width: 1
  },
  welcomeCopy: {
    flex: 1
  },
  welcomeLabel: {
    color: colors.muted,
    fontSize: typography.caption
  },
  welcomeRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  }
});
