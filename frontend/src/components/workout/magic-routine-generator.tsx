"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wand2, Loader2, Target, CalendarDays, 
  Settings2, Clock, Sparkles, ChevronLeft, 
  Dumbbell, CheckCircle
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { AITrainingEngine, RoutineParams, RoutineFocus, CatalogExercise } from "@/lib/engine/routine-generator";
import { SmartExerciseCard } from "./smart-exercise-card"; // Asegúrate que la ruta sea correcta

export function MagicRoutineGenerator() {
  // --- ESTADOS DE CONFIGURACIÓN ---
  const [days, setDays] = useState<3 | 4 | 5>(4);
  const [focus, setFocus] = useState<RoutineFocus | 'chest' | 'back' | 'legs'>('general');
  const [timeBudget, setTimeBudget] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // --- ESTADOS DE RUTINA Y DATOS ---
  const [routine, setRoutine] = useState<any>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [userBio, setUserBio] = useState<any>(null);
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  
  const engine = new AITrainingEngine();
  
  useEffect(() => {
    const init = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const localTB = localStorage.getItem("bioaxis_time_budget");
      if (localTB) setTimeBudget(parseInt(localTB));

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('dim_atleta').select('*').eq('user_id', user.id).eq('is_current', true).limit(1).single();
        if (data) setUserBio(data);
      }

      const { data: exData } = await supabase.from('exercises').select('*');
      if (exData) setCatalog(exData);
    };
    init();
  }, []);

  // Solo cambia la función handleGenerate dentro de tu componente:

const handleGenerate = async () => {
  setIsGenerating(true);
  await new Promise(r => setTimeout(r, 2000));

  // Extraemos la estatura de userBio (asumiendo que viene de dim_atleta)
  const userHeight = userBio?.estatura || 160;

  const plan = engine.generate({
    daysPerWeek: days as any,
    focus: focus as RoutineFocus,
    fitnessLevel: 'intermediate',
    gender: userBio?.genero || 'hombre',
    bioMetrics: userBio,
    height: userHeight, // <--- PASAMOS LA ESTATURA AQUÍ
    timeBudgetMins: timeBudget,
    catalog: catalog
  });

  setRoutine(plan);
  setIsGenerating(false);
  setSelectedDayIdx(0);
};

  const resetRoutine = () => setRoutine(null);

  // --- RENDERIZADO: CONFIGURACIÓN (ANTES DE GENERAR) ---
  if (!routine && !isGenerating) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl mx-auto bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl"
      >
        <div className="text-center mb-10">
          <div className="inline-flex p-4 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-6">
            <Wand2 size={32} />
          </div>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter">Sintetizador <span className="text-cyan-500">Alpha</span></h2>
          <p className="text-slate-400 mt-2 font-medium">Configura los parámetros biomecánicos de tu ciclo.</p>
        </div>

        <div className="space-y-8">
          {/* TIEMPO */}
          <div className="space-y-4">
            <label className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-500 flex items-center gap-2">
              <Clock size={14} className="text-cyan-500" /> Presupuesto de Tiempo
            </label>
            <div className="grid grid-cols-4 gap-3">
              {[45, 60, 75, 90].map(m => (
                <button key={m} onClick={() => setTimeBudget(m)}
                  className={`py-4 rounded-2xl text-sm font-black transition-all border ${timeBudget === m ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-600'}`}>
                  {m}m
                </button>
              ))}
            </div>
          </div>

          {/* DÍAS */}
          <div className="space-y-4">
            <label className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-500 flex items-center gap-2">
              <CalendarDays size={14} className="text-cyan-500" /> Frecuencia Semanal
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[3, 4, 5].map(d => (
                <button key={d} onClick={() => setDays(d as any)}
                  className={`py-4 rounded-2xl text-sm font-black transition-all border ${days === d ? 'bg-white border-white text-slate-950' : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-600'}`}>
                  {d} DÍAS
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            className="w-full py-6 bg-cyan-500 rounded-[2rem] text-slate-950 font-black uppercase italic tracking-[0.2em] hover:bg-cyan-400 transition-all flex justify-center items-center gap-3 shadow-xl shadow-cyan-900/20 active:scale-95"
          >
            <Sparkles size={20} /> Generar Rutina Biomecánica
          </button>
        </div>
      </motion.div>
    );
  }

  // --- RENDERIZADO: CARGANDO ---
  if (isGenerating) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center">
        <Loader2 className="animate-spin text-cyan-500 mb-6" size={60} />
        <h3 className="text-2xl font-black italic uppercase text-white tracking-widest animate-pulse">
          Ensamblando Matriz de Hipertrofia...
        </h3>
        <p className="text-slate-500 font-mono text-[10px] mt-2 uppercase tracking-widest">Filtrando perfiles de tensión y estabilidad</p>
      </div>
    );
  }

  // --- RENDERIZADO: CENTRO DE ENTRENAMIENTO ACTIVO ---
  const currentDay = routine.generatedPlan[selectedDayIdx];

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* HEADER DE NAVEGACIÓN */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={resetRoutine} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">
          <ChevronLeft size={16} /> Configuración
        </button>
        <div className="flex bg-slate-900/60 p-1.5 rounded-[2rem] border border-slate-800 gap-1">
          {routine.generatedPlan.map((_: any, idx: number) => (
            <button
              key={idx}
              onClick={() => setSelectedDayIdx(idx)}
              className={`w-12 h-12 rounded-full text-xs font-black transition-all ${
                selectedDayIdx === idx ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              D{idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* INFO DEL DÍA */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-[2.5rem] p-8 mb-8 relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12 text-white">
          <Dumbbell size={150} />
        </div>
        <div className="relative z-10 flex justify-between items-end">
          <div>
            <span className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-cyan-500/20">
              Día {selectedDayIdx + 1} • {currentDay.exercises.length} Ejercicios
            </span>
            <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter mt-4">
              {currentDay.dayLabel}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Tiempo Estimado</p>
            <p className="text-white text-3xl font-mono font-black">{currentDay.totalDayMins}<span className="text-sm ml-1 opacity-50">min</span></p>
          </div>
        </div>
      </div>

      {/* MENSAJE DE IA */}
      <div className="mb-8 px-6 py-4 bg-cyan-500/5 border-l-4 border-cyan-500 rounded-r-2xl">
        <p className="text-[11px] text-cyan-400 font-medium italic">
          <span className="font-black mr-2">ANALISIS BIOAXIS:</span> {routine.bioMsg}
        </p>
      </div>

      {/* LISTA DE EJERCICIOS (SMART CARDS) */}
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDayIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {currentDay.exercises.map((ex: any, i: number) => (
              <SmartExerciseCard key={ex.canonical_name + i} exercise={ex} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ACCIÓN FINAL */}
      <div className="mt-12 text-center">
        <button className="px-10 py-6 bg-white text-slate-950 rounded-[2rem] font-black uppercase italic tracking-[0.2em] hover:bg-emerald-400 transition-all shadow-xl active:scale-95 flex items-center gap-3 mx-auto">
          <CheckCircle size={20} /> Finalizar Sesión Completa
        </button>
        <p className="text-slate-500 text-[10px] mt-4 font-bold uppercase tracking-widest">
          Tus registros de peso se guardarán para el ajuste de carga de la próxima semana.
        </p>
      </div>
    </div>
  );
}