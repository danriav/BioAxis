"use client";

import { useEffect, useState } from "react";
import { WorkoutLogger } from "@/components/workout/workout-logger";
import { EvolutionChart } from "@/components/dashboard/evolution-chart"; // Asegúrate de que esta ruta sea correcta
import { TestWorkoutButton } from "@/components/workout/test-workout-button";
import { MagicRoutineGenerator } from "@/components/workout/magic-routine-generator";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Zap, Target, ChevronRight,
  ShieldCheck, Scale, Ruler, Star, Heart, Loader2
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";

// --- ESTILOS REUTILIZABLES ---
const cardStyle = "bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-3xl shadow-xl hover:border-cyan-500/30 transition-all duration-500";
const glowStyle = "absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl opacity-0 group-hover:opacity-20 transition duration-500 blur";

export default function ScientificDashboard() {
  const [userBio, setUserBio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"bio_dedicado" | "arquitecto">("bio_dedicado");
  const [metrics, setMetrics] = useState({
    mainRatio: 0,
    label: "Calculando...",
    status: "Analizando...",
    gap: 0,
    isMale: true
  });

  useEffect(() => {
    const fetchBioData = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      try {
        const pref = localStorage.getItem("bioaxis_training_preference");
        if (pref === "arquitecto") setActiveTab("arquitecto");

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // 1. OBTENER EL PERFIL MÁS RECIENTE (Solución de empates)
        // Usamos created_at en lugar de valid_from para ignorar la basura de las pruebas rápidas
        const { data: currentData, error: currentError } = await supabase
          .from('dim_atleta')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }) 
          .limit(1);

        const currentBio = (currentData && currentData.length > 0) ? currentData[0] : null;

        // Si tenemos datos actuales, procesamos métricas para el encabezado
        if (currentBio) {
          setUserBio(currentBio);

          const h = Number(currentBio.hombros) || 0;
          const c = Number(currentBio.cintura) || 0;
          const hip = Number(currentBio.cadera) || 0;
          const b = Number(currentBio.brazo) || 0;
          const p = Number(currentBio.pantorrilla) || 0;
          const isMale = currentBio.genero === 'hombre';

          let ratio = 0;
          let label = "";
          let status = "";

          if (isMale) {
            ratio = c > 0 ? Number((h / c).toFixed(2)) : 0;
            label = "V-Taper Index";
            status = ratio >= 1.61 ? "Estatus: Golden Ratio" : "Estatus: Nivel Avanzado";
          } else {
            ratio = hip > 0 ? Number((c / hip).toFixed(2)) : 0;
            label = "Hourglass Ratio";
            status = ratio <= 0.72 && ratio >= 0.68 ? "Estatus: Reloj de Arena Ideal" : "Estatus: Atleta Estética";
          }

          setMetrics({
            mainRatio: ratio,
            label,
            status,
            gap: Math.abs(b - p) || 0,
            isMale
          });
        }

      } catch (err) {
        console.error("Error cargando el motor Bioaxis:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBioData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="text-cyan-500 animate-spin w-12 h-12" />
        <p className="text-cyan-500 font-mono text-xs uppercase tracking-widest">Sincronizando con Kimball SCD2...</p>
      </div>
    );
  }

  // Cálculos Nutricionales Dinámicos
  const weight = userBio?.peso || 0;
  const calories = weight ? Math.round(weight * 33) : 2500;
  const protein = weight ? Math.round(weight * 2.2) : 150;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">

      {/* HEADER DINÁMICO */}
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent italic uppercase">
            {metrics.isMale ? "Estructura Apex" : "Atleta Alpha"} <span className="text-cyan-500 underline decoration-cyan-500/20">Bioaxis</span>
          </h1>
          <p className="text-slate-500 flex items-center gap-2 mt-1 font-medium">
            <ShieldCheck size={16} className="text-cyan-500" />
            ID: {userBio?.edad || "--"} años | {weight || "--"} kg | {userBio?.genero?.toUpperCase() || "S/D"}
          </p>
        </motion.div>

        <div className="bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-2xl flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_#06b6d4]" />
          <span className="text-xs font-mono text-slate-400 uppercase tracking-tighter">Motor de Simetría: Kimball Activo</span>
        </div>
      </header>
      
      {/* TABS DE ENTRENAMIENTO */}
      <div className="max-w-7xl mx-auto px-4 pb-4">
        <div className="flex gap-4 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("bio_dedicado")}
            className={`pb-2 px-2 text-sm font-black uppercase tracking-widest transition-all ${
              activeTab === "bio_dedicado" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Bio-Dedicado (IA)
          </button>
          <button
            onClick={() => setActiveTab("arquitecto")}
            className={`pb-2 px-2 text-sm font-black uppercase tracking-widest transition-all ${
              activeTab === "arquitecto" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Arquitecto (Manual)
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 mb-8">
        <AnimatePresence mode="wait">
          {activeTab === "bio_dedicado" && (
            <motion.section key="bio" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <MagicRoutineGenerator />
            </motion.section>
          )}
          {activeTab === "arquitecto" && (
            <motion.section key="arq" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <WorkoutLogger />
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* COLUMNA 1: EVOLUCIÓN Y GRÁFICAS */}
        <motion.div className="lg:col-span-2 space-y-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          
          {/* EL GRAN DIVORCIO: Aquí inyectamos el componente EvolutionChart limpio */}
          <div className="relative z-10">
            <EvolutionChart />
          </div>

          <div className={cardStyle + " relative group overflow-hidden"}>
            <div className={glowStyle} />
            <div className="grid grid-cols-3 gap-4 relative z-10">
              <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Hombros</p>
                <p className="text-lg font-black text-white">{userBio?.hombros || "--"}cm</p>
              </div>
              <div className="text-center border-x border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Cintura</p>
                <p className="text-lg font-black text-white">{userBio?.cintura || "--"}cm</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Cadera</p>
                <p className="text-lg font-black text-white">{userBio?.cadera || "--"}cm</p>
              </div>
            </div>
          </div>

          {/* SIMETRÍA ADAPTATIVA POR GÉNERO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={cardStyle}>
              <h3 className="text-slate-400 text-sm font-medium mb-4 flex items-center gap-2">
                <Target size={16} className="text-cyan-400" /> Análisis de GAP
              </h3>
              <p className="text-2xl font-bold italic text-white uppercase text-left">{metrics.gap > 2 ? "Déficit Inferior" : "Simetría Balanceada"}</p>
              <p className="text-xs text-slate-500 mt-2 font-medium text-left">
                Diferencia Brazo/Pantorrilla: <span className="text-white">{metrics.gap}cm</span>.
                {metrics.gap > 2 ? " Se requiere especialización en tren inferior." : " Ratios de extremidades en rango óptimo."}
              </p>
            </div>
            <div className={cardStyle}>
              <h3 className="text-slate-400 text-sm font-medium mb-4 flex items-center gap-2">
                <Zap size={16} className="text-amber-400" /> {metrics.label}
              </h3>
              <p className="text-2xl font-bold text-white uppercase italic tracking-tighter text-left">{metrics.status}</p>
              <p className="text-xs text-slate-500 mt-2 text-left">
                {metrics.isMale
                  ? `Estás a ${(1.62 - metrics.mainRatio).toFixed(2)} puntos del Ratio Dorado Clásico.`
                  : `Tu balance cintura/cadera proyecta una estética ${metrics.mainRatio <= 0.72 ? "de élite" : "en desarrollo"}.`
                }
              </p>
            </div>
          </div>
        </motion.div>

        {/* COLUMNA 2: NUTRICIÓN Y SESIÓN */}
        <motion.div className="space-y-8" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>

          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 p-6 rounded-[2.5rem] shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:rotate-12 transition-transform duration-500">
              {metrics.isMale ? <Scale size={80} /> : <Heart size={80} />}
            </div>
            <h2 className="text-white/80 text-sm font-bold uppercase tracking-wider italic text-left">Combustible Actual</h2>
            <p className="text-4xl font-black text-white mt-2 tracking-tighter text-left">{calories} <span className="text-lg font-medium opacity-60">kcal</span></p>
            <p className="text-white/90 text-xs mt-3 font-mono font-bold text-left">P: {protein}G | C: {Math.round(calories * 0.45 / 4)}G | G: {Math.round(calories * 0.25 / 9)}G</p>
            <button className="mt-6 w-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md py-3 rounded-2xl text-white text-sm font-bold transition-all uppercase italic tracking-[0.2em]">
              Optimizar Dieta
            </button>
          </div>

          <div className={cardStyle}>
            <h2 className="font-bold mb-4 flex items-center justify-between text-white uppercase italic tracking-tight text-left">
              Ajuste de Sesión
              <span className="text-[10px] bg-cyan-500 text-slate-950 px-2 py-0.5 rounded-full font-black font-mono">
                {metrics.gap > 3 ? "FIX_GAP" : "STRENGTH"}
              </span>
            </h2>
            <div className="space-y-3">
              <ExerciseItem name={metrics.isMale ? "Press Militar" : "Hombro Lateral"} sets="4 x 12" />
              <ExerciseItem name={metrics.gap > 3 ? "Elevación Talón" : "Sentadilla Hack"} sets="4 x 15" highlight={metrics.gap > 3} />
              <ExerciseItem name={metrics.isMale ? "Dominadas" : "Hip Thrust"} sets="3 x 10" />
            </div>
            <button className="mt-6 w-full flex items-center justify-center gap-2 bg-slate-950/50 border border-slate-800 py-3 rounded-2xl text-cyan-400 text-sm font-bold hover:border-cyan-500/50 transition-all uppercase italic tracking-widest">
              Iniciar Entrenamiento <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function ExerciseItem({ name, sets, highlight = false }: { name: string, sets: string, highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${highlight ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-slate-950/40 border-slate-800/30'}`}>
      <span className={`text-sm font-medium ${highlight ? 'text-cyan-400' : 'text-slate-300'}`}>{name}</span>
      <span className={`text-xs font-mono font-bold ${highlight ? 'text-white' : 'text-cyan-500'}`}>{sets}</span>
    </div>
  );
}