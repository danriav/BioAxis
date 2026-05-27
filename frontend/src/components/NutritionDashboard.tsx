"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, Trash2, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { FoodSearchModal } from "./FoodSearchModal";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  NutritionApiError,
  NutritionService,
  type FoodSearchItem,
  type NutritionTargets,
} from "@/lib/nutrition-service";

type CatalogFood = Pick<
  FoodSearchItem,
  "name_es" | "calories_per_g" | "protein_per_g" | "carbs_per_g" | "fat_per_g"
>;

type MealLog = {
  id: string;
  meal_slot: string;
  quantity_g: number;
  catalog_foods: CatalogFood | null;
};

const DEFAULT_SLOTS = ["Desayuno", "Comida", "Cena", "Snacks"];
const EMPTY_TARGETS: NutritionTargets = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

function toNumber(value: number | string | null | undefined) {
  return Number(value) || 0;
}

export function NutritionDashboard() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const params = useParams();
  const locale = String(params?.locale || "es");

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split("T")[0];
  });
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [slots, setSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [bioTargets, setBioTargets] = useState<NutritionTargets>(EMPTY_TARGETS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState("");
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleApiError = useCallback(
    (error: unknown, fallback: string) => {
      if (error instanceof NutritionApiError && error.status === 401) {
        setAuthStatus("Tu sesion expiro. Inicia sesion otra vez.");
        router.replace(`/${locale}/login`);
        return;
      }

      if (error instanceof NutritionApiError && error.status === 403) {
        setNotice("No tienes acceso para realizar esta accion.");
        return;
      }

      setNotice(fallback);
    },
    [locale, router],
  );

  const refreshNutrition = useCallback(async () => {
    setNotice(null);

    if (!supabase) {
      setAuthStatus("No se pudo inicializar la sesion local.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user || !session?.access_token) {
      setAccessToken(null);
      setMeals([]);
      setBioTargets(EMPTY_TARGETS);
      setAuthStatus("Inicia sesion para buscar alimentos y registrar tu plan nutricional.");
      return;
    }

    setAccessToken(session.access_token);
    setAuthStatus(null);

    const { data, error } = await supabase
      .from("nutrition_logs")
      .select(`
        id,
        meal_slot,
        quantity_g,
        catalog_foods (
          name_es,
          calories_per_g,
          protein_per_g,
          carbs_per_g,
          fat_per_g
        )
      `)
      .eq("user_id", user.id)
      .eq("consumed_at", selectedDate);

    if (error) {
      setNotice("No pudimos cargar tus alimentos del dia.");
    } else {
      const nextMeals = (data || []) as unknown as MealLog[];
      setMeals(nextMeals);
      const dbSlots = nextMeals.map((meal) => meal.meal_slot);
      setSlots(Array.from(new Set([...DEFAULT_SLOTS, ...dbSlots])));
    }

    try {
      const targets = await NutritionService.getTargets(user.id, session.access_token);
      setBioTargets(targets);
    } catch (error) {
      handleApiError(error, "No pudimos sincronizar los objetivos nutricionales.");
    }
  }, [handleApiError, selectedDate, supabase]);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void refreshNutrition();
    }, 0);

    return () => window.clearTimeout(task);
  }, [refreshNutrition]);

  const totals = useMemo(
    () =>
      meals.reduce(
        (acc, item) => {
          const food = item.catalog_foods;
          const qty = item.quantity_g;
          if (!food) return acc;

          return {
            kcal: acc.kcal + toNumber(food.calories_per_g) * qty,
            prot: acc.prot + toNumber(food.protein_per_g) * qty,
            carb: acc.carb + toNumber(food.carbs_per_g) * qty,
            fat: acc.fat + toNumber(food.fat_per_g) * qty,
          };
        },
        { kcal: 0, prot: 0, carb: 0, fat: 0 },
      ),
    [meals],
  );

  const openSearch = (slot: string) => {
    setActiveSlot(slot);
    setIsModalOpen(true);
  };

  const handleAddNewSlot = () => {
    setSlots((current) => [...current, `Sesion ${current.length + 1}`]);
  };

  const handleDeleteLog = async (logId: string) => {
    if (!supabase) return;

    const { error } = await supabase.from("nutrition_logs").delete().eq("id", logId);
    if (error) {
      setNotice("No pudimos eliminar ese alimento.");
      return;
    }

    await refreshNutrition();
  };

  const handleFoodAdded = async (food: FoodSearchItem, grams: number) => {
    if (!accessToken) {
      setAuthStatus("Inicia sesion para registrar alimentos.");
      router.replace(`/${locale}/login`);
      return;
    }

    try {
      await NutritionService.addFoodLog(
        {
          food_id: food.id,
          meal_slot: activeSlot,
          quantity_g: grams,
          target_date: selectedDate,
        },
        accessToken,
      );
      await refreshNutrition();
      setIsModalOpen(false);
    } catch (error) {
      handleApiError(error, "No pudimos registrar el alimento.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10 font-sans max-w-7xl mx-auto">
      <WeeklyCalendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        streak={3}
      />

      {(authStatus || notice) && (
        <div className="mb-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-4 text-sm font-medium text-cyan-100">
          {authStatus || notice}
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MacroCard label="Calorias" value={Math.round(totals.kcal)} target={bioTargets.kcal} color="bg-cyan-500" icon={<Zap size={14} />} />
        <MacroCard label="Proteina" value={`${Math.round(totals.prot)}g`} target={`${bioTargets.protein}g`} color="bg-fuchsia-500" />
        <MacroCard label="Carbos" value={`${Math.round(totals.carb)}g`} target={`${bioTargets.carbs}g`} color="bg-blue-500" />
        <MacroCard label="Grasas" value={`${Math.round(totals.fat)}g`} target={`${bioTargets.fat}g`} color="bg-slate-400" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {slots.map((slot) => (
          <MealSlot
            key={slot}
            title={slot}
            logs={meals.filter((meal) => meal.meal_slot === slot)}
            onAdd={() => openSearch(slot)}
            onDeleteLog={handleDeleteLog}
          />
        ))}
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={(event) => {
            if (event.detail === 0) handleAddNewSlot();
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            handleAddNewSlot();
          }}
          className="w-full py-6 rounded-[1.5rem] border-2 border-dashed border-slate-800 text-slate-500 font-black italic uppercase tracking-widest hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all flex items-center justify-center gap-3 group"
        >
          <span className="text-2xl group-hover:scale-125 transition-transform">+</span>
          Anadir Nueva Comida
        </button>
      </div>

      <FoodSearchModal
        accessToken={accessToken}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAuthError={(message) => {
          setAuthStatus(message);
          router.replace(`/${locale}/login`);
        }}
        onError={setNotice}
        slotName={activeSlot}
        onAdded={handleFoodAdded}
      />
    </div>
  );
}

type MacroCardProps = {
  label: string;
  value: number | string;
  target: number | string;
  color: string;
  icon?: React.ReactNode;
};

function MacroCard({ label, value, target, color, icon }: MacroCardProps) {
  const numericValue = Number.parseFloat(String(value)) || 0;
  const numericTarget = Number.parseFloat(String(target)) || 0;
  const percentage = numericTarget > 0 ? Math.min((numericValue / numericTarget) * 100, 100) : 0;

  return (
    <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[1.5rem] shadow-inner relative overflow-hidden group">
      <div className="flex justify-between items-start mb-3 relative z-10">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">{label}</span>
        <div className="p-2 bg-slate-950 rounded-lg">{icon}</div>
      </div>
      <div className="text-3xl font-black italic tracking-tighter mb-4">
        {value} <span className="text-[10px] text-slate-600 font-normal not-italic uppercase tracking-widest ml-1">/ {target}</span>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color} shadow-[0_0_15px_rgba(6,182,212,0.4)]`}
        />
      </div>
    </div>
  );
}

type WeeklyCalendarProps = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  streak: number;
};

function WeeklyCalendar({ selectedDate, onSelectDate, streak }: WeeklyCalendarProps) {
  const weekDays = useMemo(() => {
    const baseDate = new Date(`${selectedDate}T12:00:00Z`);
    const dayNames = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];

    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date(baseDate);
      d.setUTCDate(baseDate.getUTCDate() + index - 3);
      const dateStr = d.toISOString().split("T")[0];
      return {
        dateStr,
        dayName: dayNames[d.getUTCDay()],
        dayNumber: d.getUTCDate(),
        isSelected: dateStr === selectedDate,
      };
    });
  }, [selectedDate]);

  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-[1.5rem] p-6 mb-8 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black italic tracking-tighter text-white">BIO-PLAN</h2>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1 rounded-md border border-cyan-500/20">
            <Zap size={16} className="text-cyan-400" />
            <span className="font-mono text-cyan-400 font-bold text-sm">{streak} DIAS</span>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-white/5">
          <CalendarIcon size={16} className="text-slate-400" />
          <span className="font-mono font-bold text-sm text-slate-200">HOY</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => (
          <button
            type="button"
            key={day.dateStr}
            onClick={() => onSelectDate(day.dateStr)}
            className={`flex flex-col items-center gap-2 py-4 rounded-xl transition-all border-b-2 ${
              day.isSelected
                ? "bg-slate-800/80 border-cyan-500 text-white shadow-[0_4px_20px_-10px_rgba(6,182,212,0.3)] scale-105"
                : "border-transparent text-slate-500 hover:bg-slate-800/40 hover:text-slate-300"
            }`}
          >
            <span className="text-xs font-bold tracking-widest">{day.dayName}</span>
            <span className={`text-2xl font-black font-mono ${day.isSelected ? "text-cyan-400" : ""}`}>{day.dayNumber}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

type MealSlotProps = {
  title: string;
  logs: MealLog[];
  onAdd: () => void;
  onDeleteLog: (id: string) => void;
};

function MealSlot({ title, logs, onAdd, onDeleteLog }: MealSlotProps) {
  const slotTotals = logs.reduce(
    (acc, log) => {
      const food = log.catalog_foods;
      if (!food) return acc;
      return {
        kcal: acc.kcal + toNumber(food.calories_per_g) * log.quantity_g,
        prot: acc.prot + toNumber(food.protein_per_g) * log.quantity_g,
        carb: acc.carb + toNumber(food.carbs_per_g) * log.quantity_g,
        fat: acc.fat + toNumber(food.fat_per_g) * log.quantity_g,
      };
    },
    { kcal: 0, prot: 0, carb: 0, fat: 0 },
  );

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-[1.5rem] p-6 text-white flex flex-col h-full hover:border-cyan-500/20 transition-colors">
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5 min-h-[3rem]">
        <h3 className="text-lg font-black italic uppercase tracking-widest">{title}</h3>
        <div className="text-[10px] font-mono font-bold text-cyan-500 bg-cyan-500/10 px-2 py-1 rounded whitespace-nowrap">
          {Math.round(slotTotals.kcal)} KCAL
        </div>
      </div>

      <div className="flex gap-4 text-xs font-mono text-slate-400 mb-6 bg-slate-950 p-3 rounded-xl border border-white/5">
        <div><span className="text-slate-500">P:</span> <span className="text-white">{Math.round(slotTotals.prot)}g</span></div>
        <div><span className="text-slate-500">C:</span> <span className="text-white">{Math.round(slotTotals.carb)}g</span></div>
        <div><span className="text-slate-500">G:</span> <span className="text-white">{Math.round(slotTotals.fat)}g</span></div>
      </div>

      <div className="space-y-2 mb-6 flex-1">
        {logs.length > 0 ? (
          logs.map((log) => {
            const food = log.catalog_foods;
            if (!food) return null;
            const itemKcal = Math.round(toNumber(food.calories_per_g) * log.quantity_g);
            return (
              <div key={log.id} className="flex justify-between items-center p-3 bg-slate-950/50 rounded-lg hover:bg-slate-800 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <span className="font-medium text-sm text-slate-300 group-hover:text-white transition-colors uppercase tracking-wide">
                    {food.name_es}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-slate-500">{log.quantity_g}g</span>
                  <span className="bg-slate-800 px-2 py-1 rounded text-slate-300">{itemKcal} kcal</span>
                  <button
                    type="button"
                    onClick={() => onDeleteLog(log.id)}
                    className="text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-md transition-all"
                    title="Eliminar alimento"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex items-center justify-center border-2 border-dashed border-white/5 rounded-xl py-6">
            <span className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Sin Datos</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={(event) => {
          if (event.detail === 0) onAdd();
        }}
        onMouseDown={(event) => {
          event.preventDefault();
          onAdd();
        }}
        className="w-full py-3 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-all border border-transparent hover:border-cyan-500/20"
      >
        + Anadir Alimento
      </button>
    </div>
  );
}
