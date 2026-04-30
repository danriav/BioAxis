"use client";

import { useEffect, useState } from "react";
import { EvolutionChart } from "@/components/dashboard/evolution-chart";
import { motion } from "framer-motion";
import { 
  ShieldCheck, Target, Zap, ArrowRight, 
  Loader2, ChevronRight, BarChart3, Activity 
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams } from "next/navigation";

const cardStyle = "bg-slate-900/40 backdrop-blur-md border border-slate-800 p-8 rounded-[3rem] shadow-xl hover:border-cyan-500/30 transition-all duration-500";

export default function ScientificDashboard() {
  const [userBio, setUserBio] = useState<any>(null);
  const [hoveredData, setHoveredData] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [bioTargets, setBioTargets] = useState<any>(null);
  
  const params = useParams();
  const locale = params?.locale || "es";

useEffect(() => {
    const fetchBioData = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', user.id)
            .single();
          if (profile?.display_name) setUserName(profile.display_name);

          const { data } = await supabase
            .from('dim_atleta')
            .select('*')
            .eq('user_id', user.id)
            .order('is_current', { ascending: false }) 
            .order('created_at', { ascending: false }) 
            .limit(1);
            
          if (data?.[0]) setUserBio(data[0]);

          // 🟢 CAMBIO 1: Llamada al Bio-Motor de Python
          const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_API_URL}/nutrition/targets/${user.id}`);
          if (response.ok) {
            const targets = await response.json();
            setBioTargets(targets);
          }
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchBioData();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="text-cyan-500 animate-spin w-12 h-12" />
      <p className="text-cyan-500 font-mono text-[10px] uppercase tracking-widest">Sincronizando Matriz...</p>
    </div>
  );

  // Fuente de verdad dinámica para toda la página
  const active = hoveredData || {
    peso: userBio?.peso || 0,
    hombros: userBio?.hombros || 0,
    cintura: userBio?.cintura || 0,
    cadera: userBio?.cadera || 0,
    brazo: userBio?.brazo || 0,
    antebrazo: userBio?.antebrazo || 0,
    pierna: userBio?.pierna || 0,
    pantorrilla: userBio?.pantorrilla || 0,
    genero: userBio?.genero || '---',
    objetivo: userBio?.objetivo_metabolico || '---',
    fecha: "Estado Actual"
  };

  const targetHourglass = 0.70;
  const targetSimetria = 1.00;
  const currentRatioSimetria = active.cadera > 0 ? Number((active.hombros / active.cadera).toFixed(2)) : 0;
  const currentRatioCurvatura = active.cadera > 0 ? Number((active.cintura / active.cadera).toFixed(2)) : 0;
  const gap = Math.abs((active.brazo || 0) - (active.pantorrilla || 0)).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      
      {/* HEADER */}
      <header className="max-w-7xl mx-auto mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">
            {userName ? <span className="text-white">{userName}, </span> : ""}
            <span className="text-slate-300">
              {active.genero === 'hombre' ? "Estructura Apex" : "Atleta Alpha"}
            </span>{" "}
            <span className="text-cyan-500">Bioaxis</span>
          </h1>
          <p className="text-slate-500 flex items-center gap-2 mt-1 font-bold text-[10px] uppercase tracking-widest text-left">
            <ShieldCheck size={14} className="text-cyan-500" />
            Viendo: {hoveredData ? `Punto Histórico (${active.fecha})` : "Registro Actual"} | {active.peso} kg
          </p>
        </motion.div>

        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/${locale}/dashboard/metrics`}>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 px-5 py-2.5 rounded-2xl flex items-center gap-3 transition-all group shadow-lg"
            >
              <div className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-900 transition-colors">
                <BarChart3 size={16} />
              </div>
              <div className="text-left">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Análisis Detallado</p>
                <p className="text-[11px] font-bold text-white flex items-center gap-1 leading-none uppercase italic">
                  Laboratorio <ChevronRight size={12} className="text-cyan-500" />
                </p>
              </div>
            </motion.button>
          </Link>
          <div className="hidden md:flex bg-slate-900/80 border border-slate-800 px-4 py-3 rounded-2xl items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_#06b6d4]" />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest leading-none">Biometría SCD2 Activa</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA Y CENTRAL (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 🛑 AQUÍ ESTÁ EL CAMBIO CLAVE: Enviamos 'active' para que el gráfico muestre los 3 datos adentro */}
          <EvolutionChart 
            onHover={(data) => setHoveredData(data)} 
            activeData={active} 
          />
          
          {/* RATIOS DE SIMETRÍA Y CURVATURA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={cardStyle}>
              <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <Target size={14} className="text-cyan-400" /> X-Frame Index
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Actual</span>
                  <span className="text-4xl font-black italic text-white">{currentRatioSimetria}</span>
                </div>
                <div className="h-10 w-[2px] bg-slate-800 mx-2" />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-slate-500 font-bold text-cyan-800 uppercase">Meta</span>
                  <span className="text-4xl font-black italic text-cyan-500">{targetSimetria.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className={cardStyle}>
              <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <Zap size={14} className="text-rose-400" /> Hourglass Ratio
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Actual</span>
                  <span className="text-4xl font-black italic text-white">{currentRatioCurvatura}</span>
                </div>
                <div className="h-10 w-[2px] bg-slate-800 mx-2" />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-slate-500 font-bold text-rose-900 uppercase">Meta</span>
                  <span className="text-4xl font-black italic text-rose-500">{targetHourglass.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA (Side Panel) */}
        <div className="space-y-6">
          
          {/* ACTUALIZACIÓN SLIM */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-500 shadow-xl">
            <div className="absolute -right-2 -top-2 text-cyan-500/5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
              <Activity size={80} />
            </div>
            <div className="relative z-10 flex flex-col items-start text-left">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <h3 className="text-sm font-black text-white italic uppercase tracking-widest">¿Nuevos Datos?</h3>
              </div>
              <p className="text-[10px] text-slate-500 mb-4 font-medium leading-tight max-w-[180px]">
                Registra tu peso o perímetros para recalibrar tu evolución.
              </p>
              <Link href={`/${locale}/dashboard/update`} className="w-full">
                <motion.button 
                  whileHover={{ x: 5 }}
                  className="w-full bg-cyan-500/10 hover:bg-cyan-500 border border-cyan-500/20 hover:border-cyan-500 py-2.5 rounded-xl text-cyan-500 hover:text-slate-950 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  Actualizar Biometría <ArrowRight size={12} />
                </motion.button>
              </Link>
            </div>
          </div>

          {/* NUTRICIÓN */}
          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 p-8 rounded-[3.5rem] shadow-xl relative overflow-hidden group text-left">
            <h2 className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em] italic">Fuel Analysis</h2>
            <p className="text-5xl font-black text-white mt-4 tracking-tighter">
              {Math.round(active.peso * 33)} <span className="text-sm opacity-50 font-medium italic">kcal</span>
            </p>
            <button className="mt-10 w-full py-5 bg-white text-slate-900 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all hover:bg-cyan-50">
              Optimizar Macros <ArrowRight size={16} />
            </button>
          </div>
          
          {/* SIMETRÍA */}
          <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-[3rem] shadow-lg text-left">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Balance de Extremidades</h4>
              <div className="p-2.5 bg-slate-800 rounded-xl text-cyan-500 border border-slate-700">
                <Activity size={16} />
              </div>
            </div>

            <div className="space-y-5">
              {/* Métrica 1: Brazo vs Pantorrilla */}
              <div className="flex justify-between items-end border-b border-slate-800/50 pb-4">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase italic">Brazo / Pantorrilla</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Diferencia ideal: 0cm</p>
                </div>
                <p className="text-2xl font-black text-white italic">
                  {gap}<span className="text-[10px] ml-1 text-slate-600">cm</span>
                </p>
              </div>

              {/* Métrica 2: Antebrazo vs Brazo */}
              <div className="flex justify-between items-end border-b border-slate-800/50 pb-4">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase italic">Antebrazo / Brazo</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Ratio ideal: ~0.80</p>
                </div>
                <p className="text-2xl font-black text-white italic">
                  {active.brazo && active.antebrazo 
                    ? (active.antebrazo / active.brazo).toFixed(2) 
                    : "--"}
                </p>
              </div>

              {/* Métrica 3: Pantorrilla vs Pierna */}
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase italic">Pantorrilla / Pierna</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Ratio ideal: ~0.65</p>
                </div>
                <p className="text-2xl font-black text-white italic">
                  {active.pierna && active.pantorrilla 
                    ? (active.pantorrilla / active.pierna).toFixed(2) 
                    : "--"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}