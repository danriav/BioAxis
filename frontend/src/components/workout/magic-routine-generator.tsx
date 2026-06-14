"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  Clock,
  Loader2,
  RefreshCcw,
  Sparkles,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  TrainingApiError,
  TrainingService,
  type KalosBiometricFocus,
  type KalosEquipment,
  type KalosExercise,
  type KalosExperience,
  type KalosGoal,
  type KalosPreviewRequest,
  type KalosPriority,
  type KalosSession,
  type KalosTrainingPreview,
} from "@/lib/training-service";

const defaultEquipment: KalosEquipment[] = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bench",
  "bodyweight",
  "band",
  "smith",
  "cardio_machine",
];

const goalOptions: Array<{ value: KalosGoal; label: string }> = [
  { value: "hypertrophy", label: "Hipertrofia" },
  { value: "recomposition", label: "Recomposición" },
  { value: "fat_loss", label: "Pérdida de grasa" },
  { value: "strength_hypertrophy", label: "Fuerza + músculo" },
  { value: "general_fitness", label: "Fitness general" },
];

const priorityOptions: Array<{ value: KalosPriority; label: string }> = [
  { value: "balanced", label: "Balanceado" },
  { value: "glutes", label: "Glúteos" },
  { value: "legs", label: "Pierna" },
  { value: "torso", label: "Torso" },
];

const experienceOptions: Array<{ value: KalosExperience; label: string }> = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
];

type PreviewSummary = {
  goal: KalosGoal;
  days: number;
  timeBudget: number;
  experience: KalosExperience;
  priority: KalosPriority;
  biometricFocus?: KalosBiometricFocus;
};

function getOptionLabel<TValue extends string>(
  options: Array<{ value: TValue; label: string }>,
  value: TValue,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function getBiometricFocusLabel(focus: KalosBiometricFocus) {
  if (focus === "torso") return "Torso";
  if (focus === "glutes_legs") return "Glúteos-pierna";
  if (focus === "unknown") return "Desconocido";
  return "Balanceado";
}

function NumberSelector({
  options,
  value,
  onChange,
  label,
  icon: Icon,
  unit = "",
}: {
  options: number[];
  value: number;
  onChange: (value: number) => void;
  label: string;
  icon: LucideIcon;
  unit?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4">
      <label className="ml-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        <Icon size={14} className="text-cyan-500" /> {label}
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`min-w-14 flex-1 basis-14 rounded-2xl border px-3 py-3 text-xs font-black transition-all sm:min-w-16 sm:basis-16 ${
              value === option
                ? "border-cyan-400 bg-cyan-500 text-slate-950"
                : "border-slate-800 bg-slate-950/40 text-slate-500 hover:border-slate-700 hover:text-white"
            }`}
          >
            {option}{unit}
          </button>
        ))}
      </div>
    </div>
  );
}

function FieldSelect<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: TValue;
  options: Array<{ value: TValue; label: string }>;
  onChange: (value: TValue) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-left">
      <span className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as TValue)}
        className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm font-bold text-white outline-none transition-all focus:border-cyan-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatRange(range: { min: number; max: number }) {
  return range.min === range.max ? `${range.min}` : `${range.min}-${range.max}`;
}

function isHighIntensityRir(range: { min: number; max: number }) {
  return range.min === 0;
}

function QualityChecks({ preview }: { preview: KalosTrainingPreview }) {
  const checks = preview.quality_checks;
  const statusColor = checks.status === "pass" ? "text-emerald-400" : checks.status === "warning" ? "text-amber-300" : "text-rose-400";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Quality checks</h3>
        <span className={`text-[10px] font-black uppercase tracking-widest ${statusColor}`}>{checks.status}</span>
      </div>
      {checks.warnings.length > 0 ? (
        <ul className="space-y-2">
          {checks.warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-2 text-xs font-medium text-amber-100">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" />
              {warning}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs font-medium text-slate-400">Sin advertencias de calidad.</p>
      )}
    </div>
  );
}

function PreviewSummaryCard({ summary }: { summary: PreviewSummary }) {
  const hasBiometricFocus = summary.biometricFocus && summary.biometricFocus !== "unknown";
  const items = [
    { label: "Objetivo", value: getOptionLabel(goalOptions, summary.goal) },
    { label: "Frecuencia", value: `${summary.days} días/semana` },
    { label: "Duración", value: `${summary.timeBudget} min/sesión` },
    { label: "Nivel", value: getOptionLabel(experienceOptions, summary.experience) },
    {
      label: hasBiometricFocus ? "Enfoque por ratios" : "Prioridad seleccionada",
      value: hasBiometricFocus
        ? getBiometricFocusLabel(summary.biometricFocus as KalosBiometricFocus)
        : getOptionLabel(priorityOptions, summary.priority),
    },
  ];

  return (
    <div className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl bg-slate-900/60 px-3 py-3">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
          <p className="mt-1 text-sm font-black text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function InteractiveSessionPreview({
  session,
  onSubstituteExercise,
  substitutingExerciseId,
}: {
  session: KalosSession;
  onSubstituteExercise: (exercise: KalosExercise) => void;
  substitutingExerciseId: string | null;
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Día {session.day_number}</p>
        <h3 className="mt-1 text-2xl font-black uppercase italic tracking-tight text-white">{session.label}</h3>
        <p className="mt-1 text-xs font-medium text-slate-500">{session.target_muscles.join(" / ")}</p>
      </div>

      <div className="space-y-3">
        {session.exercises.map((exercise) => {
          const isSubstituting = substitutingExerciseId === exercise.exercise_id;

          return (
            <div key={`${exercise.order}-${exercise.exercise_id}`} className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-tight text-white">{exercise.exercise_name}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {exercise.primary_muscle} · {exercise.equipment}
                  </p>
                </div>
                <div className="flex flex-col gap-2 md:items-end">
                  <button
                    type="button"
                    onClick={() => onSubstituteExercise(exercise)}
                    disabled={isSubstituting}
                    title="Cambiar por una alternativa equivalente"
                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:border-cyan-500/50 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCcw size={12} className={isSubstituting ? "animate-spin" : ""} />
                    {isSubstituting ? "Buscando" : "Cambiar"}
                  </button>
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">
                    <span className="rounded-xl bg-slate-900 px-2 py-2">{exercise.sets} sets</span>
                    <span className="rounded-xl bg-slate-900 px-2 py-2">{formatRange(exercise.rep_range)} reps</span>
                    <span
                      className={`rounded-xl px-2 py-2 ${
                        isHighIntensityRir(exercise.rir_target)
                          ? "bg-amber-500/10 text-amber-200"
                          : "bg-slate-900"
                      }`}
                    >
                      RIR {formatRange(exercise.rir_target)}
                      {isHighIntensityRir(exercise.rir_target) ? " · Alta" : ""}
                    </span>
                    <span className="rounded-xl bg-slate-900 px-2 py-2">{exercise.rest_seconds}s</span>
                  </div>
                </div>
              </div>
              {exercise.coaching_note && (
                <p className="mt-3 text-xs font-medium text-slate-400">{exercise.coaching_note}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function MagicRoutineGenerator() {
  const router = useRouter();
  const locale = useLocale();
  const [days, setDays] = useState(4);
  const [goal, setGoal] = useState<KalosGoal>("hypertrophy");
  const [priority, setPriority] = useState<KalosPriority>("balanced");
  const [experience, setExperience] = useState<KalosExperience>("intermediate");
  const [timeBudget, setTimeBudget] = useState(75);
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState<KalosTrainingPreview | null>(null);
  const [previewSummary, setPreviewSummary] = useState<PreviewSummary | null>(null);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [substitutingExerciseId, setSubstitutingExerciseId] = useState<string | null>(null);

  const buildPayload = (): KalosPreviewRequest => ({
    days_per_week: days,
    goal,
    priority,
    experience,
    time_budget_minutes: timeBudget,
    available_equipment: defaultEquipment,
    constraints: {
      injuries: [],
      pain_areas: [],
      excluded_exercise_ids: [],
      excluded_movement_patterns: [],
      notes: null,
    },
  });

  const handleGenerate = async () => {
    setErrorMessage(null);
    setIsGenerating(true);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setErrorMessage("No pudimos inicializar la sesión local.");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.replace(`/${locale}/login`);
        return;
      }

      const result = await TrainingService.previewKalosPlan(buildPayload(), session.access_token);
      setPreviewSummary({
        goal,
        days,
        timeBudget,
        experience,
        priority,
        biometricFocus: result.input_summary?.biometric_focus,
      });
      setSelectedSessionIndex(0);
      setPreview(result);
    } catch (error) {
      if (error instanceof TrainingApiError && error.status === 401) {
        router.replace(`/${locale}/login`);
        return;
      }

      if (error instanceof TrainingApiError && error.status === 422) {
        setErrorMessage(error.message);
        return;
      }

      setErrorMessage("No pudimos generar el preview. Intenta ajustar los parámetros.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubstituteExercise = async (session: KalosSession, exercise: KalosExercise) => {
    if (!preview) return;

    setErrorMessage(null);
    setSubstitutingExerciseId(exercise.exercise_id);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setErrorMessage("No pudimos inicializar la sesión local.");
        return;
      }

      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) {
        router.replace(`/${locale}/login`);
        return;
      }

      const result = await TrainingService.substituteKalosExercise(
        {
          current_exercise_id: exercise.exercise_id,
          current_session: {
            goal,
            experience,
            priority,
            label: session.label,
            intent: session.intent,
            target_muscles: session.target_muscles,
          },
          available_equipment: defaultEquipment,
          excluded_exercise_ids: session.exercises.map((item) => item.exercise_id),
          constraints: {
            injuries: [],
            pain_areas: [],
            excluded_exercise_ids: [],
            excluded_movement_patterns: [],
            notes: null,
          },
          movement_pattern: exercise.movement_pattern,
          role: exercise.role,
          primary_muscle: exercise.primary_muscle,
          fatigue_cost: exercise.fatigue_cost,
          sets: exercise.sets,
        },
        authSession.access_token,
      );

      const replacement: KalosExercise = {
        ...result.substitute_exercise,
        order: exercise.order,
      };

      setPreview((current) => {
        if (!current) return current;

        return {
          ...current,
          program: {
            ...current.program,
            sessions: current.program.sessions.map((item) => {
              if (item.session_id !== session.session_id) return item;

              return {
                ...item,
                exercises: item.exercises.map((candidate) =>
                  candidate.exercise_id === exercise.exercise_id ? replacement : candidate
                ),
              };
            }),
          },
        };
      });
    } catch (error) {
      if (error instanceof TrainingApiError && error.status === 401) {
        router.replace(`/${locale}/login`);
        return;
      }

      if (error instanceof TrainingApiError) {
        setErrorMessage(error.message);
        return;
      }

      setErrorMessage("No pudimos cambiar el ejercicio. Intenta otra alternativa.");
    } finally {
      setSubstitutingExerciseId(null);
    }
  };

  if (preview) {
    const selectedSession = preview.program.sessions[selectedSessionIndex] ?? preview.program.sessions[0];
    const summary = previewSummary ?? {
      goal,
      days,
      timeBudget,
      experience,
      priority,
      biometricFocus: preview.input_summary?.biometric_focus,
    };

    return (
      <div className="mx-auto max-w-5xl pb-20">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Preview sin guardar</p>
            <h2 className="mt-2 text-4xl font-black uppercase italic tracking-tighter text-white">{preview.program.name}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {preview.program.split.map((item) => (
                <span key={item} className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              setPreviewSummary(null);
              setSelectedSessionIndex(0);
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-white"
          >
            <ChevronLeft size={16} /> Ajustar
          </button>
        </div>

        <div className="mb-5">
          <PreviewSummaryCard summary={summary} />
        </div>

        <div className="mb-6">
          <QualityChecks preview={preview} />
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {preview.program.sessions.map((session, index) => (
            <button
              key={session.session_id}
              type="button"
              onClick={() => setSelectedSessionIndex(index)}
              className={`shrink-0 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                selectedSessionIndex === index
                  ? "border-cyan-400 bg-cyan-500 text-slate-950"
                  : "border-slate-800 bg-slate-950/40 text-slate-500 hover:border-slate-700 hover:text-white"
              }`}
            >
              Día {session.day_number}
            </button>
          ))}
        </div>

        {selectedSession && (
          <>
            <div className="mb-5 grid gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300 sm:grid-cols-3">
              <span className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                {selectedSession.exercises.length} ejercicios
              </span>
              <span className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                {selectedSession.estimated_minutes} minutos
              </span>
              <span className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                {selectedSession.fatigue_points} fatiga
              </span>
            </div>

            <InteractiveSessionPreview
              session={selectedSession}
              onSubstituteExercise={(exercise) => handleSubstituteExercise(selectedSession, exercise)}
              substitutingExerciseId={substitutingExerciseId}
            />
          </>
        )}

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-xs font-medium text-slate-500">
          Este preview no se guarda todavía. Ajusta parámetros y vuelve a generar cuando quieras comparar variantes.
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl md:p-10"
    >
      <div className="mb-8 text-center">
        <div className="mb-5 inline-flex rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-cyan-400">
          <Wand2 size={32} />
        </div>
        <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">Preview <span className="text-cyan-500">Kalos</span></h2>
        <p className="mt-2 text-sm font-medium text-slate-400">Rutina determinista generada sin IA y sin guardarse.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <FieldSelect label="Objetivo" value={goal} options={goalOptions} onChange={setGoal} />
        <FieldSelect label="Prioridad" value={priority} options={priorityOptions} onChange={setPriority} />
        <FieldSelect label="Experiencia" value={experience} options={experienceOptions} onChange={setExperience} />
      </div>

      <div className="mt-8 grid gap-4">
        <NumberSelector
          label="Días por semana"
          icon={CalendarDays}
          options={[1, 2, 3, 4, 5, 6, 7]}
          value={days}
          onChange={setDays}
          unit="d"
        />
        <NumberSelector
          label="Tiempo por sesión"
          icon={Clock}
          options={[45, 60, 75, 90, 120]}
          value={timeBudget}
          onChange={setTimeBudget}
          unit="m"
        />
      </div>

      {errorMessage && (
        <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100">
          {errorMessage}
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-500 py-5 text-xs font-black uppercase tracking-[0.2em] text-slate-950 shadow-xl shadow-cyan-900/20 transition-all hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
        Generar preview
      </button>

      <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
        <CheckCircle size={14} /> No se guarda ni se persiste
      </div>
    </motion.div>
  );
}
