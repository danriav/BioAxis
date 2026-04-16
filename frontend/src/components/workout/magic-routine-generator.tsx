"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Loader2, Target, CalendarDays, Activity, CheckCircle2, Meh, Flame, Settings2, RefreshCw, Clock } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { AITrainingEngine, RoutineParams, RoutineFocus, CatalogExercise } from "@/lib/engine/routine-generator";
import { registerWorkout } from "@/lib/actions/workout";

export function MagicRoutineGenerator() {
  const [days, setDays] = useState<3|4|5>(4);
  const [focus, setFocus] = useState<RoutineFocus | 'chest' | 'back' | 'legs'>('general');
  const [isGenerating, setIsGenerating] = useState(false);
  const [routine, setRoutine] = useState<any>(null);
  const [userBio, setUserBio] = useState<any>(null);
  const [timeBudget, setTimeBudget] = useState(60);
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  const engine = new AITrainingEngine();
  
  useEffect(() => {
    const init = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      // Extract local time budget
      const localTB = localStorage.getItem("bioaxis_time_budget");
      if (localTB) setTimeBudget(parseInt(localTB));

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('dim_atleta').select('*').eq('user_id', user.id).eq('is_current', true).limit(1).single();
        if (data) setUserBio(data);
      }

      // Fetch Catalog for swapping logic
      const { data: exData } = await supabase.from('exercises').select('*');
      if (exData) setCatalog(exData);
    };
    init();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 1500));

    // Simulate fatigue history fixing
    const recentHardLogsMock = Math.random() > 0.7 ? 6 : 2; 

    // If catalog fails to fetch, map mock catalog structurally required for the AI Engine
    const activeCatalog = catalog.length > 0 ? catalog : [
      { canonical_name: 'hack_squat', name_es: 'Sentadilla Hack', category: 'strength', muscle_group: 'quads', muscle_section_focus: 'mid', biomechanical_bias: 'stretch', equipment_type: 'machine', is_bilateral: true, stability_type: 'high_external' },
      { canonical_name: 'cable_lateral_raise', name_es: 'Elevación Lateral Polea Unilateral', category: 'strength', muscle_group: 'shoulders', muscle_section_focus: 'side_delt', biomechanical_bias: 'mid-range', equipment_type: 'cable', is_bilateral: false, stability_type: 'high_external' },
      { canonical_name: 'db_lateral_raise', name_es: 'Elevación Lateral Mancuerna', category: 'strength', muscle_group: 'shoulders', muscle_section_focus: 'side_delt', biomechanical_bias: 'shortened', equipment_type: 'dumbbell', is_bilateral: true, stability_type: 'low_external' },
      { canonical_name: 'romanian_deadlift', name_es: 'Peso Muerto Rumano', category: 'strength', muscle_group: 'hamstrings', muscle_section_focus: 'upper', biomechanical_bias: 'stretch', equipment_type: 'barbell', is_bilateral: true, stability_type: 'low_external' }
    ] as CatalogExercise[];

    const plan = engine.generate({
      daysPerWeek: days,
      focus: focus as RoutineFocus,
      fitnessLevel: 'intermediate',
      gender: userBio?.genero || 'hombre',
      bioMetrics: userBio,
      recentHardLogs: recentHardLogsMock,
      timeBudgetMins: timeBudget,
      catalog: activeCatalog
    });

    setRoutine(plan);
    setIsGenerating(false);
  };

  const handleSwap = (dayIndex: number, exIndex: number) => {
    if (!routine || catalog.length === 0) return;
    const currentEx = routine.generatedPlan[dayIndex].exercises[exIndex];
    const newEx = engine.swapExercise(currentEx, catalog);
    
    // Mutate state gracefully
    const newRoutine = { ...routine };
    newRoutine.generatedPlan[dayIndex].exercises[exIndex] = newEx;
    setRoutine(newRoutine);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-[3rem] p-8 md:p-12 relative overflow-hidden backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_-12px_rgba(6,182,212,0.3)] bg-gradient-to-b from-slate-900/80 to-slate-950/90 text-white">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
      <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row gap-12">
        
        <div className="w-full md:w-1/3 flex flex-col gap-8">
          <header>
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-cyan-500/20 text-cyan-400 mb-6 border border-cyan-500/30">
              <Wand2 size={24} />
            </div>
            <h2 className="text-3xl lg:text-4xl font-black italic uppercase tracking-tighter text-left">
              Generador<br/>Mágico
            </h2>
            <p className="text-slate-400 text-sm mt-3 font-medium leading-relaxed">
              Programación cronométrica y biomecánica en 1 clic.
            </p>
          </header>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 flex items-center gap-2">
                <Clock size={14} /> Tiempo Disponible
              </label>
              <div className="flex bg-slate-950/50 p-2 rounded-2xl border border-slate-800">
                {[45,60,75,90].map(m => (
                  <button
                    key={m}
                    onClick={() => setTimeBudget(m)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${timeBudget === m ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 flex items-center gap-2">
                <CalendarDays size={14} /> Frecuencia Semanal
              </label>
              <div className="flex bg-slate-950/50 p-2 rounded-2xl border border-slate-800">
                {([3,4,5] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${days === d ? 'bg-white text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    {d}D
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-5 rounded-2xl bg-white text-slate-950 font-black italic uppercase tracking-[0.2em] hover:bg-cyan-400 transition-colors flex justify-center items-center gap-3 relative overflow-hidden group shadow-xl"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isGenerating ? 'ENSAMBLANDO MATRIZ...' : 'EMPACAR TIEMPO Y RUTINA'}
            </button>
          </div>
        </div>

        <div className="w-full md:w-2/3 max-h-[700px] overflow-y-auto custom-scrollbar bg-slate-950/40 rounded-3xl p-6 md:p-8 border border-white/5 relative">
          <AnimatePresence mode="wait">
            {!routine && !isGenerating ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-center opacity-50 pt-20">
                <Clock size={48} className="text-slate-700 mb-4" />
                <p className="font-mono text-sm tracking-widest uppercase text-slate-500">Calculador Cronométrico<br/>esperando carga</p>
              </motion.div>
            ) : isGenerating ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center text-center pt-20">
                <Loader2 className="animate-spin text-cyan-500 mb-4" size={40} />
                <h3 className="text-xl font-bold italic uppercase">Filtrando Unilaterales y Empacando</h3>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                {routine.bioMsg && (
                  <div className={`p-4 rounded-2xl border flex gap-4 items-start ${routine.mode === 'Deload' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500'}`}>
                    <div className="p-2 bg-black/20 rounded-xl"><Target size={20} /></div>
                    <div>
                      <h4 className="text-[10px] uppercase font-black tracking-widest mb-1">Diagnóstico Ecosistema</h4>
                      <p className="text-sm font-medium text-slate-200">{routine.bioMsg}</p>
                    </div>
                  </div>
                )}
                
                <div className="grid gap-6">
                  {routine.generatedPlan.map((day: any, dIdx: number) => (
                    <div key={day.dayNumber} className="bg-slate-900/50 rounded-2xl border border-slate-800 p-5">
                      <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                        <h4 className="font-bold flex items-center gap-2">
                          <span className="text-[10px] w-6 h-6 flex items-center justify-center bg-white/10 rounded-full">D{day.dayNumber}</span>
                          <span className="italic tracking-tight text-lg">{day.dayLabel}</span>
                        </h4>
                        <div className="flex flex-col items-end">
                           <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${day.totalDayMins > routine.timeBudget ? 'text-orange-400' : 'text-emerald-400'}`}>
                              ⏱️ {day.totalDayMins}m / {routine.timeBudget}m Limit
                           </span>
                           <span className="text-[8px] text-slate-500 uppercase tracking-widest">Incluye 15m warm-up</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {day.exercises.map((exItem: any, exIdx: number) => (
                          <ActiveExerciseCard 
                             key={exItem.order} 
                             exItem={exItem} 
                             onSwap={() => handleSwap(dIdx, exIdx)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ActiveExerciseCard({ exItem, onSwap }: { exItem: any, onSwap: () => void }) {
  const [effort, setEffort] = useState<'facil' | 'optimo' | 'dificil' | null>(null);
  const [showKg, setShowKg] = useState(false);
  const [kilos, setKilos] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLog = async (level: 'facil' | 'optimo' | 'dificil') => {
    setLoading(true);
    try {
      const numericRpe = level === 'facil' ? 5 : level === 'optimo' ? 8 : 10;
      await registerWorkout({
        nombre_sesion: exItem.name,
        volumen_total_kg: parseFloat(kilos) || 1, 
        duracion_minutos: exItem.duration_mins,
        esfuerzo_percibido_rpe: numericRpe,
        fecha_entrenamiento: new Date().toISOString()
      });
      setEffort(level);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`p-4 rounded-xl border transition-all relative group ${effort ? 'bg-slate-900/30 border-emerald-500/30 opacity-70' : 'bg-slate-950/80 border-slate-800 hover:border-cyan-500/30'}`}>
      
      {!effort && (
        <button 
          onClick={onSwap}
          className="absolute top-2 right-2 p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-10"
          title="Swap Alternativa Biomecánica"
        >
          <RefreshCw size={14} />
        </button>
      )}

      <div className="flex flex-col xl:flex-row justify-between gap-4 relative">
        <div className="flex gap-3 pr-8">
          <span className="text-cyan-500 font-bold text-sm w-4">{exItem.order}.</span>
          <div className="text-left w-full">
            <p className="text-sm font-bold text-slate-200 leading-tight pr-6">{exItem.name}</p>
            <div className="flex flex-wrap gap-2 text-[9px] uppercase tracking-widest font-bold mt-2">
              <span className="bg-white/5 text-slate-400 px-2 py-0.5 rounded flex items-center gap-1">
                 <Clock size={8}/> {exItem.duration_mins}m
              </span>
              <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded">{exItem.sets}x {exItem.reps}</span>
              <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded">RIR {exItem.rir}</span>
              {exItem.stability_type === 'high_external' && (
                 <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded flex items-center gap-1" title="Alta Estabilidad Externa">
                     🛡️ CNS Safe
                 </span>
              )}
            </div>
            
            {!effort && (
              <button 
                onClick={() => setShowKg(!showKg)}
                className="mt-3 text-[9px] text-slate-500 uppercase tracking-widest font-black inline-flex items-center gap-1 hover:text-cyan-400 transition-colors"
              >
                <Settings2 size={10}/> Añadir Kilos (Opcional)
              </button>
            )}
            
            <AnimatePresence>
              {showKg && !effort && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-2 overflow-hidden">
                  <input 
                    type="number"
                    value={kilos}
                    onChange={(e) => setKilos(e.target.value)}
                    placeholder="Volumen cargado"
                    className="bg-slate-900 border border-slate-800 text-xs p-2 rounded-lg text-white font-mono focus:border-cyan-500 outline-none w-32"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Zona de Interacción Gamificada */}
        {!effort ? (
           <div className="flex gap-2 mt-2 xl:mt-0 justify-end h-10 w-full xl:w-auto xl:min-w-[120px]">
             {loading ? <div className="h-full px-4 flex items-center justify-center"><Loader2 size={16} className="animate-spin text-cyan-500" /></div> : (
               <>
                <button onClick={() => handleLog('facil')} className="flex-1 xl:flex-none aspect-square bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 p-2">
                  <CheckCircle2 size={18} />
                </button>
                <button onClick={() => handleLog('optimo')} className="flex-1 xl:flex-none aspect-square bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 p-2">
                  <Meh size={18} />
                </button>
                <button onClick={() => handleLog('dificil')} className="flex-1 xl:flex-none aspect-square bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 p-2">
                  <Flame size={18} />
                </button>
               </>
             )}
          </div>
        ) : (
          <div className="flex items-center justify-end text-[10px] uppercase tracking-widest font-bold text-emerald-400 gap-1 mt-2 xl:mt-0 xl:min-w-[120px]">
             <CheckCircle2 size={12} /> Completado ({effort})
          </div>
        )}
      </div>
    </div>
  );
}

function Sparkles({ size, className }: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
  );
}
