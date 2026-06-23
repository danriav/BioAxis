import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  LogOut,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  UserRound
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

import { useAuth } from "@/features/auth/AuthProvider";
import {
  getMetabolicGoalLabel,
  getProfileScreenMode,
  profileCurrentMeasureOptions,
  signOutFromProfile,
  statusFromProfileError,
  type ProfileUiStatus
} from "@/features/profile/profileViewModel";
import { getProfileMe, type AthleteProfile } from "@/lib/api/profile";
import { colors, radii, spacing, typography } from "@/styles/theme";

export function ProfileScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [state, setState] = useState<ProfileScreenState>({ message: null, status: "loading" });

  const loadProfile = useCallback(async () => {
    setState({ message: null, status: "loading" });
    try {
      const response = await getProfileMe(session);
      setProfile(response.profile);
      setState({
        message: response.status === "empty" ? "Faltan tus datos base para personalizar la experiencia." : null,
        status: response.status === "empty" ? "empty" : "ready"
      });
    } catch (error) {
      const mapped = statusFromProfileError(error);
      setProfile(null);
      setState({ message: mapped.message, status: mapped.status });
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const mode = getProfileScreenMode({ hasProfile: profile !== null, status: state.status });
  const athleteName = profile?.display_name?.trim() || "Atleta Kalos";

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOutFromProfile(signOut);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <UserRound color={colors.primary} size={30} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Perfil</Text>
            <Text style={styles.title}>{athleteName}</Text>
            <Text style={styles.subtitle}>Tu cuenta y datos esenciales, en un solo lugar.</Text>
          </View>
        </View>

        {mode === "loading" ? <LoadingProfile /> : null}

        {mode === "incomplete" ? (
          <View style={styles.incompleteState}>
            <View style={styles.stateIcon}>
              <Activity color={colors.warning} size={23} />
            </View>
            <View style={styles.stateCopy}>
              <Text style={styles.stateTitle}>Perfil biométrico incompleto</Text>
              <Text style={styles.stateText}>{state.message}</Text>
            </View>
            <PrimaryAction label="Completar perfil" onPress={() => router.push("/profile-setup")} />
          </View>
        ) : null}

        {mode === "error" || mode === "session_expired" ? (
          <View style={styles.errorState}>
            <AlertTriangle color={colors.danger} size={22} />
            <View style={styles.stateCopy}>
              <Text style={styles.stateTitle}>
                {mode === "session_expired" ? "Tu sesión expiró" : "No pudimos cargar tu perfil"}
              </Text>
              <Text style={styles.stateText}>{state.message ?? "Intenta nuevamente."}</Text>
            </View>
            {mode === "error" ? <PrimaryAction label="Reintentar" onPress={() => void loadProfile()} /> : null}
          </View>
        ) : null}

        {mode === "complete" && profile ? (
          <>
            <Section icon={ShieldCheck} title="Cuenta">
              <InfoRow label="Estado de cuenta" value="Activa" />
              <InfoRow label="Sesión" value="Protegida" valueTone="success" />
              <InfoRow label="Perfil biométrico" value="Completo" valueTone="success" />
            </Section>

            <Section icon={Scale} title="Datos físicos">
              <PhysicalMetricGrid profile={profile} />
              <Text style={styles.privacyNote}>
                Mostramos las medidas actuales sin exponer identificadores ni historial completo.
              </Text>
            </Section>

            <Section icon={Target} title="Objetivo">
              <View style={styles.goalRow}>
                <View style={styles.goalIcon}>
                  <Target color={colors.primary} size={21} />
                </View>
                <View style={styles.stateCopy}>
                  <Text style={styles.infoLabel}>Objetivo metabólico</Text>
                  <Text style={styles.goalValue}>{getMetabolicGoalLabel(profile.objetivo_metabolico)}</Text>
                </View>
              </View>
            </Section>

            <Section icon={SlidersHorizontal} title="Preferencias">
              <InfoRow label="Unidades" value="Sistema métrico" />
              <InfoRow label="Resumen de perfil" value="Datos esenciales" />
            </Section>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.updateButton, pressed ? styles.pressed : null]}
              onPress={() => router.push("/profile-setup")}
            >
              <View style={styles.updateButtonIcon}>
                <UserRound color={colors.primary} size={20} />
              </View>
              <View style={styles.stateCopy}>
                <Text style={styles.updateButtonTitle}>Actualizar perfil</Text>
                <Text style={styles.updateButtonText}>Revisa tus datos biométricos y objetivo</Text>
              </View>
              <ChevronRight color={colors.muted} size={20} />
            </Pressable>
          </>
        ) : null}

        <Section icon={ShieldCheck} title="Seguridad">
          <Text style={styles.securityText}>
            Cerrar sesión elimina el acceso activo en este dispositivo.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={signingOut}
            style={({ pressed }) => [
              styles.signOutButton,
              signingOut ? styles.disabled : null,
              pressed ? styles.dangerPressed : null
            ]}
            onPress={() => void handleSignOut()}
          >
            {signingOut ? (
              <ActivityIndicator color={colors.danger} size="small" />
            ) : (
              <LogOut color={colors.danger} size={19} />
            )}
            <Text style={styles.signOutText}>{signingOut ? "Cerrando sesión" : "Cerrar sesión"}</Text>
          </Pressable>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function LoadingProfile() {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator color={colors.primary} />
      <View style={styles.stateCopy}>
        <Text style={styles.stateTitle}>Cargando perfil</Text>
        <Text style={styles.stateText}>Preparando tu resumen.</Text>
      </View>
    </View>
  );
}

function Section({
  children,
  icon: Icon,
  title
}: {
  children: React.ReactNode;
  icon: typeof ShieldCheck;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Icon color={colors.primary} size={18} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({
  label,
  value,
  valueTone = "default"
}: {
  label: string;
  value: string;
  valueTone?: "default" | "success";
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueRow}>
        {valueTone === "success" ? <CheckCircle2 color={colors.success} size={15} /> : null}
        <Text style={[styles.infoValue, valueTone === "success" ? styles.successValue : null]}>{value}</Text>
      </View>
    </View>
  );
}

function PhysicalMetricGrid({ profile }: { profile: AthleteProfile }) {
  return (
    <View style={styles.physicalGrid}>
      {profileCurrentMeasureOptions.map((metric) => (
        <View key={metric.key} style={styles.physicalMetric}>
          <Text numberOfLines={1} style={styles.metricLabel}>
            {metric.label}
          </Text>
          <Text style={styles.metricValue}>{formatMetric(profile[metric.key], metric.unit)}</Text>
        </View>
      ))}
    </View>
  );
}

function PrimaryAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={onPress}>
      <Text style={styles.primaryButtonText}>{label}</Text>
      <ChevronRight color={colors.background} size={19} />
    </Pressable>
  );
}

function formatMetric(value: number | null, unit: string) {
  return value === null ? "Pendiente" : `${Math.round(value)} ${unit}`;
}

type ProfileScreenState = {
  message: string | null;
  status: ProfileUiStatus;
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.lg,
    height: 58,
    justifyContent: "center",
    width: 58
  },
  content: {
    gap: spacing.lg,
    paddingBottom: 104,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg
  },
  dangerPressed: {
    backgroundColor: colors.dangerSoft
  },
  disabled: {
    opacity: 0.55
  },
  errorState: {
    alignItems: "flex-start",
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    padding: spacing.md
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  goalIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  goalRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  goalValue: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900",
    marginTop: 2
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  headerCopy: {
    flex: 1
  },
  incompleteState: {
    backgroundColor: colors.surface,
    borderColor: colors.warning,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  infoLabel: {
    color: colors.muted,
    fontSize: typography.label,
    fontWeight: "700"
  },
  infoRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 42
  },
  infoValue: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "800"
  },
  infoValueRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  loadingState: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  metricValue: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "900",
    marginTop: 4
  },
  physicalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  physicalMetric: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    minWidth: 94,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  pressed: {
    backgroundColor: colors.surfaceMuted
  },
  primaryButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: spacing.lg
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: "900"
  },
  privacyNote: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 17
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden"
  },
  sectionBody: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg
  },
  sectionIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900"
  },
  securityText: {
    color: colors.muted,
    fontSize: typography.label,
    lineHeight: 19
  },
  signOutButton: {
    alignItems: "center",
    borderColor: colors.danger,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48
  },
  signOutText: {
    color: colors.danger,
    fontSize: typography.body,
    fontWeight: "900"
  },
  stateCopy: {
    flex: 1
  },
  stateIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  stateText: {
    color: colors.muted,
    fontSize: typography.label,
    lineHeight: 19,
    marginTop: 3
  },
  stateTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.label,
    lineHeight: 19,
    marginTop: 3
  },
  successValue: {
    color: colors.success
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900",
    marginTop: 2
  },
  updateButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg
  },
  updateButtonIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  updateButtonText: {
    color: colors.muted,
    fontSize: typography.caption,
    marginTop: 3
  },
  updateButtonTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  }
});
