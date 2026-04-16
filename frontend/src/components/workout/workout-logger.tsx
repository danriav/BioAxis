"use client";

import { useState, useEffect } from "react";
import { Loader2, Settings2, CheckCircle2, Frown, Meh, Flame, Plus, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { registerWorkout } from "@/lib/actions/workout";
import { getSupabaseClient } from "@/lib/supabase/client";

interface Exercise {
  id: string;
  name_es: string;
  canonical_name: string;
  biomechanical_bias: string;
}

type EffortLevel = 'facil' | 'optimo' | 'dificil' | null;

export function WorkoutLogger() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedCanonical, setSelectedCanonical] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // Weekly Planner State
  const [activeDay, setActiveDay] = useState(1);
  const [plannedDays, setPlannedDays] = useState<{ [day: number]: Exercise[] }>({
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: []
  });

  useEffect(() => {
    const fetchExercises = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name_es, canonical_name, biomechanical_bias')
        .order('name_es');
        
      if (data && data.length > 0) {
        setExercises(data);
        setSelectedCanonical(data[0].canonical_name);
      }
    };
    fetchExercises();
  }, []);

  const handleAddExerciseToDay = () => {
    const ex = exercises.find(e => e.canonical_name === selectedCanonical);
    if (!ex) return;
    setPlannedDays(prev => ({
      ...prev,
      [activeDay]: [...prev[activeDay], ex]
    }));
  };

  const currentDayExercises = plannedDays[activeDay];

  // Feedback Biomecánico
  let biomechanicalWarning = null;
  if (currentDayExercises.length > 0) {
    const biases = currentDayExercises.map(e => e.biomechanical_bias || 'mid-range');
    const hasStretch = biases.includes('stretch');
    const hasShortened = biases.includes('shortened');
    const hasMid = biases.includes('mid-range');

    if (hasStretch && !hasShortened && !hasMid) {
      biomechanicalWarning = "Equilibrio Biomecánico: Solo tienes ejercicios en rango estirado. Considera añadir uno acortado o medio (ej. polea) para hipertrofia completa.";
    } else if (hasShortened && !hasStretch) {
      biomechanicalWarning = "Equilibrio Biomecánico: Faltan ejercicios en elongación (stretch), donde ocurre el mayor daño muscular.";
    }
  }

  const handleLogCurrentDay = async (effort: EffortLevel) => {
    if (currentDayExercises.length === 0) {
      setStatus({ type: 'error', msg: 'Agrega ejercicios al día primero' });
      return;
    }
    setLoading(true);
    setStatus(null);

    try {
      const numericRpe = effort === 'facil' ? 5 : effort === 'optimo' ? 8 : 10;
      
      await registerWorkout({
        nombre_sesion: `Día ${activeDay} - Manual`,
        volumen_total_kg: 1000, 
        duracion_minutos: currentDayExercises.length * 10, 
        esfuerzo_percibido_rpe: numericRpe,
        fecha_entrenamiento: new Date().toISOString()
      });
      
      setStatus({ type: 'success', msg: `Día ${activeDay} registrado exitosamente` });
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', msg: `Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-slate-800 w-full mx-auto shadow-2xl relative overflow-hidden backdrop-blur-xl">
      <div className="relative z-10 flex flex-col h-full justify-between gap-6">
        <h2 className="text-xl font-black text-white italic uppercase tracking-tight flex items-center justify-between">
          <span>Planificador Semanal</span>
        </h2>
        
        {/* Selector de Días */}
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {[1, 2, 3, 4, 5, 6, 7].map(d => (
            <button
              key={d}
              onClick={() => setActiveDay(d)}
              className={`flex-shrink-0 w-10 h-10 rounded-xl font-bold transition-all flex items-center justify-center ${
                activeDay === d ? "bg-cyan-500 text-slate-950 shadow-md" : "bg-slate-950/50 text-slate-500 border border-slate-800 hover:text-white"
              }`}
            >
              D{d}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex gap-2 text-left">
            <select 
              value={selectedCanonical} 
              onChange={(e) => setSelectedCanonical(e.target.value)}
              className="flex-1 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-white focus:border-cyan-500 focus:outline-none transition-colors appearance-none font-bold italic"
              disabled={exercises.length === 0}
            >
              {exercises.length === 0 ? (
                <option>Cargando catálogo...</option>
              ) : (
                exercises.map(ex => (
                  <option key={ex.id} value={ex.canonical_name}>{ex.name_es}</option>
                ))
              )}
            </select>
            <button 
              type="button"
              onClick={handleAddExerciseToDay}
              className="px-6 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-2xl transition-all flex items-center justify-center"
            >
              <Plus size={24} />
            </button>
          </div>

          {/* Lista del Día */}
          <div className="min-h-[100px] bg-slate-950/50 rounded-2xl border border-slate-800 p-4">
            <h3 className="text-xs uppercase font-black tracking-widest text-slate-500 mb-3">Ejercicios Día {activeDay}</h3>
            {currentDayExercises.length === 0 ? (
              <p className="text-sm text-slate-600 font-medium italic">Añade ejercicios a este día.</p>
            ) : (
              <ul className="space-y-2">
                {currentDayExercises.map((ex, idx) => (
                  <li key={idx} className="text-sm text-white font-medium flex justify-between items-center p-2 bg-slate-900 border border-slate-800 rounded-lg">
                    {ex.name_es}
                    <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">{ex.biomechanical_bias || 'standard'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <AnimatePresence>
            {biomechanicalWarning && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-medium">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <p>{biomechanicalWarning}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-4 border-t border-slate-800">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest flex items-center justify-center mb-3">Registrar Día {activeDay}</label>
            <div className="flex gap-2">
              <button 
                disabled={loading || currentDayExercises.length === 0}
                onClick={() => handleLogCurrentDay('facil')}
                className="flex-1 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-2xl flex flex-col items-center justify-center transition-all disabled:opacity-50 group gap-1"
              >
                <div className="group-active:scale-95 transition-transform"><CheckCircle2 className="text-emerald-400"/></div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Fácil</span>
              </button>
              
              <button 
                disabled={loading || currentDayExercises.length === 0}
                onClick={() => handleLogCurrentDay('optimo')}
                className="flex-1 py-4 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-2xl flex flex-col items-center justify-center transition-all disabled:opacity-50 group gap-1"
              >
                <div className="group-active:scale-95 transition-transform"><Meh className="text-yellow-400"/></div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Óptimo</span>
              </button>

              <button 
                disabled={loading || currentDayExercises.length === 0}
                onClick={() => handleLogCurrentDay('dificil')}
                className="flex-1 py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-2xl flex flex-col items-center justify-center transition-all disabled:opacity-50 group gap-1"
              >
                <div className="group-active:scale-95 transition-transform"><Flame className="text-red-400"/></div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Difícil</span>
              </button>
            </div>
            {loading && <p className="text-center text-[10px] uppercase tracking-widest font-mono text-cyan-500 mt-4 flex justify-center items-center gap-2"><Loader2 className="animate-spin" size={12}/> Registrando...</p>}
            {status?.type === 'success' && <p className="text-center text-[10px] uppercase tracking-widest font-mono text-emerald-400 mt-4 flex justify-center items-center gap-2"><CheckCircle2 size={12}/> {status.msg}</p>}
            {status?.type === 'error' && <p className="text-center text-[10px] uppercase tracking-widest font-mono text-red-400 mt-4 flex justify-center items-center gap-2"><Frown size={12}/> {status.msg}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
