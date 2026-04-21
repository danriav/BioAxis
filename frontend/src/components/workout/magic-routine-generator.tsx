"use client";

import { useState, useEffect, useRef } from "react"; // 👈 Añadimos useRef
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wand2, Loader2, CalendarDays, Clock, Sparkles, ChevronLeft, Dumbbell, CheckCircle 
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { AITrainingEngine, RoutineParams, RoutineFocus, CatalogExercise } from "@/lib/engine/routine-generator";
import { SmartExerciseCard } from "./smart-exercise-card";

// --- SUB-COMPONENTE: SELECTOR TÁCTIL ---
function DraggableSelector({ 
  options, 
  value, 
  onChange, 
  label, 
  icon: Icon, 
  unit = "" 
}: { 
  options: number[], 
  value: number, 
  onChange: (v: number) => void, 
  label: string, 
  icon: any,
  unit?: string 
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-4">
      <label className="text-[10px] uppercase font-black text-slate-500 flex items-center gap-2 ml-2 tracking-[0.2em]">
        <Icon size={14} className="text-cyan-500" /> {label}
      </label>
      
      {/* Contenedor del Slider */}
      <div className="relative overflow-hidden cursor-grab active:cursor-grabbing px-4 py-2 mask-fade-edges" ref={containerRef}>
        <motion.div 
          drag="x"
          dragConstraints={containerRef} // Esto evita que se salga de los bordes
          dragElastic={0.1}
          className="flex gap-4 w-max" // w-max es vital para que el flex no se colapse
        >
          {options.map((opt) => (
            <motion.button
              key={opt}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange(opt)}
              className={`flex-shrink-0 w-24 py-5 rounded-[2rem] text-sm font-black transition-all border ${
                value === opt 
                  ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)]' 
                  : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-600'
              }`}
            >
              {opt}{unit}
            </motion.button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export function MagicRoutineGenerator() {
  const [days, setDays] = useState<number>(4);
  const [timeBudget, setTimeBudget] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);
  const [routine, setRoutine] = useState<any>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [userBio, setUserBio] = useState<any>(null);
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);

  const engine = new AITrainingEngine();

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('dim_atleta').select('*').eq('user_id', user.id).eq('is_current', true).maybeSingle();
        if (data) setUserBio(data);
      }

      const { data: exData } = await supabase
        .from('exercises')
        .select(`*, muscle_groups:primary_muscle_group_id (display_name_es)`);
      if (exData) setCatalog(exData as any);
    };
    init();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 1500));

    const plan = engine.generate({
      daysPerWeek: days,
      focus: 'general',
      fitnessLevel: 'intermediate',
      gender: userBio?.genero || 'hombre',
      bioMetrics: userBio,
      height: userBio?.estatura || 170,
      timeBudgetMins: timeBudget,
      catalog: catalog
    });

    setRoutine(plan);
    setIsGenerating(false);
    setSelectedDayIdx(0);
  };

  if (!routine && !isGenerating) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl mx-auto bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-6"><Wand2 size={32} /></div>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter">Sintetizador <span className="text-cyan-500">Alpha</span></h2>
          <p className="text-slate-400 mt-2 font-medium">Ingeniería biomecánica personalizada.</p>
        </div>

        <div className="space-y-12">
          {/* SELECTOR DE TIEMPO DRAGGABLE */}
          <DraggableSelector 
            label="Presupuesto de Tiempo"
            icon={Clock}
            options={[45, 60, 75, 90, 120]}
            value={timeBudget}
            onChange={setTimeBudget}
            unit="m"
          />

          {/* SELECTOR DE DÍAS DRAGGABLE */}
          <DraggableSelector 
            label="Frecuencia Semanal"
            icon={CalendarDays}
            options={[1, 2, 3, 4, 5, 6, 7]}
            value={days}
            onChange={setDays}
            unit="D"
          />

          <button onClick={handleGenerate} className="w-full py-6 bg-cyan-500 rounded-[2rem] text-slate-950 font-black uppercase italic tracking-widest hover:bg-cyan-400 transition-all flex justify-center items-center gap-3 shadow-xl shadow-cyan-900/20 active:scale-95">
            <Sparkles size={20} /> Generar Rutina Alpha
          </button>
        </div>
      </motion.div>
    );
  }

  // --- (El resto del código de renderizado se mantiene igual) ---
  if (isGenerating) return (
    <div className="min-h-[400px] flex flex-col items-center justify-center text-center">
      <Loader2 className="animate-spin text-cyan-500 mb-6" size={60} />
      <h3 className="text-2xl font-black italic uppercase text-white animate-pulse">Ensamblando Matriz de Hipertrofia...</h3>
    </div>
  );

  const currentDay = routine.generatedPlan[selectedDayIdx];

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* HEADER DE NAVEGACIÓN */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => setRoutine(null)} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"><ChevronLeft size={16} /> Volver</button>
        <div className="flex bg-slate-900/60 p-1.5 rounded-[2rem] border border-slate-800 gap-1 overflow-x-auto no-scrollbar">
          {routine.generatedPlan.map((_: any, idx: number) => (
            <button key={idx} onClick={() => setSelectedDayIdx(idx)} className={`w-10 h-10 flex-shrink-0 rounded-full text-xs font-black transition-all ${selectedDayIdx === idx ? "bg-cyan-500 text-slate-950 shadow-lg" : "text-slate-500"}`}>D{idx + 1}</button>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-[2.5rem] p-8 mb-8">
        <div className="flex justify-between items-end">
          <div>
            <span className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-cyan-500/20">Día {selectedDayIdx + 1} • {currentDay.exercises.length} Ejercicios</span>
            <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter mt-4">{currentDay.dayLabel}</h2>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Tiempo Estimado</p>
            <p className="text-white text-3xl font-mono font-black">{currentDay.totalDayMins}<span className="text-sm ml-1 opacity-50">min</span></p>
          </div>
        </div>
      </div>

      <div className="mb-8 px-6 py-4 bg-cyan-500/5 border-l-4 border-cyan-500 rounded-r-2xl">
        <p className="text-[11px] text-cyan-400 font-medium italic"><span className="font-black mr-2">ANALISIS BIOAXIS:</span> {routine.bioMsg}</p>
      </div>

      <div className="space-y-6">
        {currentDay.exercises.map((ex: any, i: number) => (
          <SmartExerciseCard key={i} exercise={ex} />
        ))}
      </div>

      <div className="mt-12 text-center">
        <button className="px-10 py-6 bg-white text-slate-950 rounded-[2rem] font-black uppercase italic tracking-widest hover:bg-emerald-400 transition-all flex items-center gap-3 mx-auto">
          <CheckCircle size={20} /> Finalizar Sesión
        </button>
      </div>
    </div>
  );
}