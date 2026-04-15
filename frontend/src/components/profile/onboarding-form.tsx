"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimate } from "framer-motion";
import { useTranslations } from "next-intl";

import { useSaveBodyMeasurements } from "@/hooks/use-save-body-measurements";
import { syncPendingBodyMeasurements } from "@/lib/body-measurements/sync";
import type { BodyMeasurementsInput } from "@/types/body-measurements";

const HELP_ICON = "?";
const TOTAL_FIELDS = 3;
const SECTION_INDEX_ONE = 0;
const SECTION_INDEX_TWO = 1;

type FormState = {
  weightKg: string;
  heightCm: string;
  femurLengthCm: string;
};

const initialFormState: FormState = {
  weightKg: "",
  heightCm: "",
  femurLengthCm: "",
};

function isFieldComplete(value: string): boolean {
  return value.trim().length > 0 && Number(value) > 0;
}

function FemurMeasureIcon() {
  return (
    <motion.svg
      aria-label="Femur measurement visual"
      className="h-6 w-6 text-cyan-300"
      fill="none"
      viewBox="0 0 24 24"
      whileHover={{ rotate: -8, scale: 1.08 }}
      transition={{ type: "spring", stiffness: 240, damping: 16 }}
    >
      <motion.path
        d="M7 4L17 20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      <circle cx="7" cy="4" r="2.2" className="fill-cyan-400/80" />
      <circle cx="17" cy="20" r="2.2" className="fill-cyan-400/80" />
    </motion.svg>
  );
}

function FieldHelp({
  text,
  completed,
}: {
  text: string;
  completed: boolean;
}) {
  return (
    <span
      aria-label={text}
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold transition ${
        completed
          ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.35)]"
          : "border-slate-600 text-slate-300"
      }`}
      title={text}
    >
      {completed ? "✓" : HELP_ICON}
    </span>
  );
}

function toPayload(formState: FormState): BodyMeasurementsInput {
  return {
    age: 18,
    gender: "other",
    weightKg: Number(formState.weightKg),
    heightCm: Number(formState.heightCm),
    femurLengthCm: Number(formState.femurLengthCm),
    torsoLengthCm: Number(formState.heightCm),
  };
}

type NumericStepperProps = {
  id: string;
  name: string;
  value: string;
  min: number;
  step: number;
  required?: boolean;
  placeholder?: string;
  onChange: (nextValue: string) => void;
  completed: boolean;
};

function NumericStepper({
  id,
  name,
  value,
  min,
  step,
  required,
  placeholder,
  onChange,
  completed,
}: NumericStepperProps) {
  const [scope, animate] = useAnimate<HTMLInputElement>();
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
      }
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
    };
  }, []);

  const normalizeToStep = (rawNumber: number): string => {
    const decimalPlaces = Number.isInteger(step) ? 0 : String(step).split(".")[1]?.length ?? 1;
    return rawNumber.toFixed(decimalPlaces);
  };

  const applyDelta = (delta: number) => {
    const currentValue = value.trim().length > 0 ? Number(value) : min;
    const nextValue = Math.max(min, currentValue + delta);
    onChange(normalizeToStep(nextValue));
  };

  const stopHolding = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const startHolding = (delta: number) => {
    applyDelta(delta);
    holdTimeoutRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        applyDelta(delta);
      }, 70);
    }, 300);
  };

  return (
    <div
      className={`mt-2 flex items-center overflow-hidden rounded-xl border bg-slate-950/70 shadow-sm transition ${
        completed
          ? "border-emerald-400/70 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
          : "border-slate-700 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/50"
      }`}
    >
      <motion.button
        type="button"
        aria-label={`Decrease ${name}`}
        className="flex h-12 min-w-12 items-center justify-center border-r border-slate-700 bg-slate-900 text-lg font-semibold text-cyan-300"
        whileTap={{ scale: 0.94 }}
        onPointerDown={() => startHolding(-step)}
        onPointerUp={stopHolding}
        onPointerLeave={stopHolding}
      >
        -
      </motion.button>
      <motion.input
        ref={scope}
        required={required}
        id={id}
        min={min}
        name={name}
        step={step}
        type="number"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          void animate(
            scope.current,
            { scale: [1, 1.03, 1], opacity: [1, 0.9, 1] },
            { duration: 0.16, ease: "easeOut" },
          );
        }}
        placeholder={placeholder}
        className="h-12 w-full border-0 bg-transparent px-4 text-center font-mono text-base tracking-wide text-slate-100 outline-none"
      />
      <motion.button
        type="button"
        aria-label={`Increase ${name}`}
        className="flex h-12 min-w-12 items-center justify-center border-l border-slate-700 bg-slate-900 text-lg font-semibold text-cyan-300"
        whileTap={{ scale: 0.94 }}
        onPointerDown={() => startHolding(step)}
        onPointerUp={stopHolding}
        onPointerLeave={stopHolding}
      >
        +
      </motion.button>
    </div>
  );
}

export function OnboardingForm() {
  const t = useTranslations("profileSetup");
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [currentSection, setCurrentSection] = useState(SECTION_INDEX_ONE);
  const mutation = useSaveBodyMeasurements();

  useEffect(() => {
    const onOnline = () => {
      void syncPendingBodyMeasurements();
    };

    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const isSubmitting = mutation.isPending;
  const showSuccessMessage = mutation.isSuccess;
  const isOffline = useMemo(() => typeof navigator !== "undefined" && !navigator.onLine, []);
  const completedFields = useMemo(() => {
    return [formState.weightKg, formState.heightCm, formState.femurLengthCm].filter((value) =>
      isFieldComplete(value),
    ).length;
  }, [formState]);
  const progressPercentage = Math.round((completedFields / TOTAL_FIELDS) * 100);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await mutation.mutateAsync(toPayload(formState));
  };

  const canMoveToSecondSection = isFieldComplete(formState.weightKg) && isFieldComplete(formState.heightCm);

  return (
    <section className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <motion.div
        className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/50 p-8 shadow-[0_10px_50px_rgba(8,145,178,0.18)] backdrop-blur"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-300">
            <span>{t("progressLabel")}</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-lime-400"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
          </div>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-white">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-300">{t("subtitle")}</p>

        <form className="mt-8" onSubmit={onSubmit}>
          <AnimatePresence mode="wait">
            {currentSection === SECTION_INDEX_ONE ? (
              <motion.div
                key="section-one"
                className="grid gap-5 md:grid-cols-2"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <motion.label
                  className="block text-sm font-medium text-slate-200"
                  htmlFor="weightKg"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                >
                  <span className="inline-flex items-center gap-2">
                    {t("fields.weight")}
                    <FieldHelp text={t("help.weight")} completed={isFieldComplete(formState.weightKg)} />
                  </span>
                  <NumericStepper
                    required
                    id="weightKg"
                    min={30}
                    name="weight"
                    step={0.1}
                    value={formState.weightKg}
                    completed={isFieldComplete(formState.weightKg)}
                    placeholder="70.0"
                    onChange={(nextValue) =>
                      setFormState((prev) => ({ ...prev, weightKg: nextValue }))
                    }
                  />
                </motion.label>

                <motion.label
                  className="block text-sm font-medium text-slate-200"
                  htmlFor="heightCm"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14 }}
                >
                  <span className="inline-flex items-center gap-2">
                    {t("fields.height")}
                    <FieldHelp text={t("help.height")} completed={isFieldComplete(formState.heightCm)} />
                  </span>
                  <NumericStepper
                    required
                    id="heightCm"
                    min={100}
                    name="height"
                    step={0.1}
                    value={formState.heightCm}
                    completed={isFieldComplete(formState.heightCm)}
                    placeholder="170.0"
                    onChange={(nextValue) =>
                      setFormState((prev) => ({ ...prev, heightCm: nextValue }))
                    }
                  />
                </motion.label>

                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="button"
                    aria-label={t("next")}
                    onClick={() => setCurrentSection(SECTION_INDEX_TWO)}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canMoveToSecondSection}
                  >
                    {t("next")}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="section-two"
                className="grid gap-5 md:grid-cols-2"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <motion.label
                  className="block text-sm font-medium text-slate-200 md:col-span-2"
                  htmlFor="femurLengthCm"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span className="inline-flex items-center gap-2">
                    {t("fields.femurLength")}
                    <FemurMeasureIcon />
                    <FieldHelp
                      text={t("help.femurLength")}
                      completed={isFieldComplete(formState.femurLengthCm)}
                    />
                  </span>
                  <NumericStepper
                    required
                    id="femurLengthCm"
                    min={20}
                    name="femur length"
                    step={0.1}
                    value={formState.femurLengthCm}
                    completed={isFieldComplete(formState.femurLengthCm)}
                    placeholder="45.0"
                    onChange={(nextValue) =>
                      setFormState((prev) => ({ ...prev, femurLengthCm: nextValue }))
                    }
                  />
                </motion.label>

                <div className="md:col-span-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    aria-label={t("back")}
                    onClick={() => setCurrentSection(SECTION_INDEX_ONE)}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    {t("back")}
                  </button>
                  <button
                    type="submit"
                    aria-label={t("submit")}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-lime-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isSubmitting || !isFieldComplete(formState.femurLengthCm)}
                  >
                    {isSubmitting ? t("saving") : t("submit")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {showSuccessMessage ? (
            <p className="mt-5 text-sm font-medium text-emerald-300">{t("success")}</p>
          ) : null}

          {isOffline ? <p className="mt-3 text-sm text-amber-300">{t("offlineNotice")}</p> : null}
        </form>
      </motion.div>
    </section>
  );
}
