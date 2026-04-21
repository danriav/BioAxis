"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2, MessageSquare, CheckCircle2, Meh, Flame, Plus, AlertCircle, Clock,
  Trash2, Edit3, Repeat, Layers, Timer, Target, HelpCircle, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { registerWorkout } from "@/lib/actions/workout";
import { getSupabaseClient } from "@/lib/supabase/client";

// --- INTERFACES ---
interface Exercise {
  id: string;
  name_es: string;
  canonical_name: string;
  biomechanical_bias: string;
  muscle_groups: { display_name_es: string } | { display_name_es: string }[] | null;
}

interface PlannedExercise extends Exercise {
  sets: number;
  reps: string;
  rir: number;
  rest: number;
  notes: string;
}

type EffortLevel = 'facil' | 'optimo' | 'dificil' | null;

// --- CONSTANTES ---
const WEEK_DAYS = [
  { id: 1, name: "Lunes", short: "Lun" },
  { id: 2, name: "Martes", short: "Mar" },
  { id: 3, name: "Miércoles", short: "Mié" },
  { id: 4, name: "Jueves", short: "Jue" },
  { id: 5, name: "Viernes", short: "Vie" },
  { id: 6, name: "Sábado", short: "Sáb" },
  { id: 7, name: "Domingo", short: "Dom" }
];

// ========================================================
// 🟢 COMPONENTE TOOLTIP (Independiente con Named Groups)
// ========================================================
const TooltipLabel = ({ text, tooltipText, icon: Icon, iconColor }: { text: string, tooltipText: string, icon: any, iconColor: string }) => (
  <div className="relative group/tooltip flex items-center gap-1 w-fit cursor-help">
    <label className="text-[9px] uppercase font-black text-slate-500 tracking-widest flex items-center gap-1 cursor-help">
      <Icon size={10} className={iconColor} /> {text}
    </label>
    <HelpCircle size={10} className="text-slate-600 group-hover/tooltip:text-cyan-400 transition-colors" />

    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 pointer-events-none w-48 p-2.5 bg-slate-900 border border-slate-700 text-[10px] text-slate-300 font-medium rounded-xl shadow-2xl z-[100] text-center normal-case tracking-normal">
      {tooltipText}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
    </div>
  </div>
);

// ========================================================
// 🟢 COMPONENTE PRINCIPAL: WORKOUT LOGGER
// ========================================================
export function WorkoutLogger() {
  // --- ESTADOS DE DATOS ---
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(1);

  // --- ESTADOS DE PERSISTENCIA ---
  const [isHydrated, setIsHydrated] = useState(false);
  const [dayTitles, setDayTitles] = useState<{ [key: number]: string }>({
    1: "Pierna (Enfoque Cuádriceps)", 2: "Pecho / Hombro", 3: "Espalda / Tracción",
    4: "Descanso Activo", 5: "Pierna (Enfoque Isquios)", 6: "Brazo / Hombro", 7: "Opcional"
  });
  const [plannedDays, setPlannedDays] = useState<{ [day: number]: PlannedExercise[] }>({
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: []
  });

  // --- LÓGICA DE DRAG-TO-SCROLL ---
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  // --- EFECTO 1: HIDRATACIÓN (Cargar datos del navegador) ---
  useEffect(() => {
    try {
      const savedDays = localStorage.getItem("bioaxis_planned_days");
      const savedTitles = localStorage.getItem("bioaxis_day_titles");
      if (savedDays) setPlannedDays(JSON.parse(savedDays));
      if (savedTitles) setDayTitles(JSON.parse(savedTitles));
    } catch (e) {
      console.warn("Error al hidratar");
    } finally {
      setIsHydrated(true); // Permitir el guardado a partir de ahora
    }
  }, []);

  // --- EFECTO 2: GUARDADO AUTOMÁTICO (Persistencia) ---
  useEffect(() => {
    if (!isHydrated) return; // No guardar si no hemos terminado de cargar
    localStorage.setItem("bioaxis_planned_days", JSON.stringify(plannedDays));
    localStorage.setItem("bioaxis_day_titles", JSON.stringify(dayTitles));
  }, [plannedDays, dayTitles, isHydrated]);

  // --- EFECTO 3: FETCH DE EJERCICIOS (Supabase) ---
  useEffect(() => {
    const fetchExercises = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data, error } = await supabase
        .from('exercises')
        .select(`id, name_es, canonical_name, biomechanical_bias, muscle_groups!primary_muscle_group_id(display_name_es)`)
        .order('name_es', { ascending: true });
      if (error) setDbError(error.message);
      if (data) setExercises(data as Exercise[]);
    };
    fetchExercises();
  }, []);

  // --- AGRUPAMIENTO PARA EL ACORDEÓN ---
  const groupedExercises = exercises.reduce((acc, ex) => {
    const mg = ex.muscle_groups as any;
    const groupName = Array.isArray(mg) ? mg[0]?.display_name_es : mg?.display_name_es;
    const group = groupName || "Otros";
    if (!acc[group]) acc[group] = [];
    acc[group].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>);

  // --- MANEJADORES ---
  const defaultParams = { sets: 3, reps: "8-12", rir: 2, rest: 90, notes: "" };

  const handleAddExercise = (ex: Exercise) => {
    setPlannedDays(prev => ({ ...prev, [activeDay]: [...prev[activeDay], { ...ex, ...defaultParams }] }));
    setIsDropdownOpen(false);
    setSearchTerm("");
    setExpandedGroup(null);
  };

  const removeExercise = (idx: number) => {
    setPlannedDays(prev => ({ ...prev, [activeDay]: prev[activeDay].filter((_, i) => i !== idx) }));
  };

  const updateExerciseParam = (idx: number, field: keyof PlannedExercise, value: string | number) => {
    setPlannedDays(prev => {
      const updatedDay = [...prev[activeDay]];
      updatedDay[idx] = { ...updatedDay[idx], [field]: value };
      return { ...prev, [activeDay]: updatedDay };
    });
  };

  const handleLogCurrentDay = async (effort: EffortLevel) => {
    if (currentDayExercises.length === 0) return;
    setLoading(true);
    try {
      const rpe = effort === 'facil' ? 5 : effort === 'optimo' ? 8 : 10;
      await registerWorkout({
        nombre_sesion: dayTitles[activeDay],
        volumen_total_kg: 0,
        duracion_minutos: estimatedTimeMinutes,
        esfuerzo_percibido_rpe: rpe,
        fecha_entrenamiento: new Date().toISOString()
      });
      setStatus({ type: 'success', msg: `¡Entrenamiento guardado!` });
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      setStatus({ type: 'error', msg: `Error al registrar` });
    } finally {
      setLoading(false);
    }
  };

  // --- CÁLCULOS AUXILIARES ---
  const currentDayExercises = plannedDays[activeDay] || [];
  const estimatedTimeMinutes = Math.ceil(currentDayExercises.reduce((total, ex) => total + (ex.sets * 45) + (ex.sets * ex.rest), 0) / 60);
  const isSearching = searchTerm.trim().length > 0;

  let biomechanicalWarning = null;
  if (currentDayExercises.length > 0) {
    const biases = currentDayExercises.map(e => e.biomechanical_bias || 'mid-range');
    if (biases.includes('stretch') && !biases.includes('shortened')) biomechanicalWarning = "Faltan ejercicios en rango acortado (pico de contracción).";
    else if (biases.includes('shortened') && !biases.includes('stretch')) biomechanicalWarning = "Faltan ejercicios en estiramiento (mayor hipertrofia).";
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 relative">

      {/* 🟢 SELECTOR DE DÍAS (Con Drag-to-Scroll) */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}
        className={`flex gap-2 overflow-x-auto pb-2 no-scrollbar select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {WEEK_DAYS.map(d => (
          <button key={d.id} onClick={() => setActiveDay(d.id)} className={`flex-shrink-0 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${activeDay === d.id ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]" : "bg-slate-900 text-slate-500 border-slate-800 hover:text-white"}`}>
            <span className="hidden sm:inline">{d.name}</span>
            <span className="sm:hidden">{d.short}</span>
          </button>
        ))}
      </div>

      {/* 🟢 HEADER EDITABLE */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 group">
          <input value={dayTitles[activeDay]} onChange={(e) => setDayTitles(prev => ({ ...prev, [activeDay]: e.target.value }))} className="bg-transparent text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white outline-none focus:text-cyan-400 transition-colors w-full border-b border-transparent focus:border-slate-800" />
          <Edit3 size={20} className="text-slate-700 group-hover:text-cyan-400 transition-colors" />
        </div>
        <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-widest text-slate-500">
          <span className="flex items-center gap-1.5 text-cyan-400"><Clock size={12} /> {estimatedTimeMinutes} MIN ESTIMADOS</span>
          <span className="text-slate-800">|</span>
          <span className="text-cyan-500/80">Modo Arquitecto Manual</span>
        </div>
      </div>

      {/* 🟢 ALERTA BIOAXIS */}
      <div className="p-4 rounded-2xl bg-cyan-500/5 border-l-4 border-cyan-500 flex items-start gap-3">
        <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400"><AlertCircle size={18} /></div>
        <div>
          <p className="text-[10px] uppercase font-black text-cyan-500 tracking-widest mb-1">Análisis BioAxis</p>
          <p className="text-xs text-slate-300 font-medium leading-relaxed">{biomechanicalWarning || "Estructura Óptima. Selección balanceada."}</p>
        </div>
      </div>

      {/* 🟢 LISTA DE EJERCICIOS PLANIFICADOS */}
      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {currentDayExercises.map((ex, idx) => (
            <motion.div key={`${ex.id}-${idx}`} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-5 hover:border-slate-700 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1 pr-4">
                  <h4 className="text-lg font-black italic uppercase text-white tracking-tight leading-none">{ex.name_es}</h4>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[9px] font-bold text-slate-400 uppercase tracking-tighter border border-slate-700">{ex.biomechanical_bias || 'Standard'}</span>
                </div>
                <button onClick={() => removeExercise(idx)} className="p-2 text-slate-700 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"><Trash2 size={18} /></button>
              </div>

              {/* PANEL DE CONTROL CON TOOLTIPS INDEPENDIENTES */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-800/50">
                <div className="flex flex-col gap-1.5">
                  <TooltipLabel text="Series" icon={Layers} iconColor="text-cyan-500" tooltipText="Número de series efectivas." />
                  <input type="number" min="1" max="10" value={ex.sets} onChange={(e) => updateExerciseParam(idx, 'sets', parseInt(e.target.value) || 0)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-white text-center focus:border-cyan-500 outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <TooltipLabel text="Reps" icon={Repeat} iconColor="text-cyan-500" tooltipText="Rango objetivo de repeticiones." />
                  <input type="text" value={ex.reps} placeholder="8-12" onChange={(e) => updateExerciseParam(idx, 'reps', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-white text-center focus:border-cyan-500 outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <TooltipLabel text="RIR" icon={Target} iconColor="text-orange-500" tooltipText="Reps In Reserve: Intensidad de la serie." />
                  <select value={ex.rir} onChange={(e) => updateExerciseParam(idx, 'rir', parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-white text-center focus:border-orange-500 outline-none appearance-none">
                    <option value="0">0 (Fallo)</option><option value="1">RIR 1</option><option value="2">RIR 2</option><option value="3">RIR 3</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <TooltipLabel text="Descanso" icon={Timer} iconColor="text-cyan-500" tooltipText="Segundos de recuperación." />
                  <select value={ex.rest} onChange={(e) => updateExerciseParam(idx, 'rest', parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-white text-center focus:border-cyan-500 outline-none appearance-none">
                    <option value="60">60 seg</option><option value="90">90 seg</option><option value="120">2 min</option><option value="180">3 min</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1 w-fit">
                    <MessageSquare size={10} className="text-slate-500" />
                    <label className="text-[9px] uppercase font-black text-slate-500 tracking-widest">
                      Notas
                    </label>
                  </div>
                  <textarea
                    value={ex.notes || ""}
                    onChange={(e) => updateExerciseParam(idx, 'notes', e.target.value)}
                    placeholder="Ej: Pausa de 2 seg en contracción..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-300 placeholder:text-slate-700 outline-none focus:border-cyan-500 transition-all resize-none h-[38px] custom-scrollbar"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 🟢 BUSCADOR DE EJERCICIOS (Acordeón) */}
        <div className="mt-4 flex flex-col md:flex-row gap-2 relative z-[999]">
          <div className="relative flex-1">
            <input type="text" placeholder="Buscar ejercicio..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-cyan-500 transition-all placeholder:text-slate-600 shadow-lg" />
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-[115%] left-0 w-full max-h-[350px] bg-slate-900 border border-slate-800 rounded-[2rem] shadow-[0_-20px_50px_rgba(0,0,0,0.8)] overflow-y-auto custom-scrollbar z-[999] p-2">
                  {dbError ? (
                    <div className="p-6 text-center text-red-400 text-xs font-bold uppercase">{dbError}</div>
                  ) : exercises.length === 0 ? (
                    <div className="p-6 text-center"><Loader2 className="animate-spin mx-auto text-cyan-500" /></div>
                  ) : isSearching ? (
                    // Búsqueda plana
                    Object.entries(groupedExercises).map(([group, list]) => {
                      const filtered = list.filter(ex => ex.name_es.toLowerCase().includes(searchTerm.toLowerCase()));
                      if (filtered.length === 0) return null;
                      return (
                        <div key={group} className="mb-2">
                          <div className="px-4 py-2 text-[10px] font-black text-cyan-500 uppercase tracking-widest bg-cyan-500/5 rounded-lg mb-1 sticky top-0 backdrop-blur-md">{group}</div>
                          {filtered.map(ex => (
                            <button key={ex.id} onClick={() => handleAddExercise(ex)} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors flex justify-between items-center group/item">
                              {ex.name_es}
                              <Plus size={14} className="opacity-0 group-hover/item:opacity-100 text-cyan-500" />
                            </button>
                          ))}
                        </div>
                      );
                    })
                  ) : (
                    // Acordeón limpio
                    Object.entries(groupedExercises).map(([group, list]) => (
                      <div key={group} className="mb-2 border border-slate-800/50 rounded-2xl overflow-hidden bg-slate-950/30">
                        <button onClick={() => setExpandedGroup(expandedGroup === group ? null : group)} className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors text-left pl-6">
                          <div>
                            <p className={`text-sm font-black uppercase tracking-widest leading-none mb-1 ${expandedGroup === group ? 'text-cyan-400' : 'text-white'}`}>{group}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">{list.length} ejercicios</p>
                          </div>
                          <ChevronDown size={18} className={`text-slate-500 transition-transform ${expandedGroup === group ? 'rotate-180 text-cyan-500' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {expandedGroup === group && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-800/50 bg-slate-900/50">
                              <div className="p-2 space-y-1">
                                {list.map(ex => (
                                  <button key={ex.id} onClick={() => handleAddExercise(ex)} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors flex justify-between items-center group/item">
                                    {ex.name_es}
                                    <Plus size={14} className="opacity-0 group-hover/item:opacity-100 text-cyan-500" />
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 🟢 BOTONES DE REGISTRO */}
      <div className="pt-8 border-t border-slate-800 relative z-10">
        <div className="flex gap-3">
          <button onClick={() => handleLogCurrentDay('facil')} className="flex-1 p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-emerald-500/50 transition-all group/btn">
            <CheckCircle2 className="mx-auto mb-1 text-slate-700 group-hover/btn:text-emerald-500" size={20} />
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Ligero</span>
          </button>
          <button onClick={() => handleLogCurrentDay('optimo')} className="flex-1 p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-yellow-500/50 transition-all group/btn">
            <Meh className="mx-auto mb-1 text-slate-700 group-hover/btn:text-yellow-500" size={20} />
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Óptimo</span>
          </button>
          <button onClick={() => handleLogCurrentDay('dificil')} className="flex-1 p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-red-500/50 transition-all group/btn">
            <Flame className="mx-auto mb-1 text-slate-700 group-hover/btn:text-red-500" size={20} />
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Extremo</span>
          </button>
        </div>
      </div>

      {/* MENSAJE DE ESTADO */}
      <AnimatePresence>
        {status && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full font-black uppercase text-xs tracking-widest z-[1000] shadow-2xl ${status.type === 'success' ? 'bg-emerald-500 text-slate-950' : 'bg-red-500 text-white'}`}>
            {status.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}