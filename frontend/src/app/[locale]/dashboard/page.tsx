"use client";

import { useEffect, useState } from "react";
import { EvolutionChart } from "@/components/dashboard/evolution-chart";
import { motion } from "framer-motion";
import { 
  ShieldCheck, Target, Zap, ArrowRight, 
  Loader2, Scale, Heart, ChevronRight, BarChart3 
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams } from "next/navigation";

const cardStyle = "bg-slate-900/40 backdrop-blur-md border border-slate-800 p-8 rounded-[3rem] shadow-xl hover:border-cyan-500/30 transition-all duration-500";

export default function ScientificDashboard() {
  const [userBio, setUserBio] = useState<any>(null);
  const [hoveredData, setHoveredData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const params = useParams();
  const locale = params?.locale || "es";

  useEffect(() => {
    const fetchBioData = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('dim_atleta')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }) 
            .limit(1);
          if (data?.[0]) setUserBio(data[0]);
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

  const active = hoveredData || {
    peso: userBio?.peso,
    hombros: userBio?.hombros,
    cintura: userBio?.cintura,
    cadera: userBio?.cadera,
    brazo: userBio?.brazo,
    pantorrilla: userBio?.pantorrilla,
    ratioSimetria: userBio ? Number((userBio.hombros / userBio.cadera).toFixed(2)) : 0,
    ratioCurvatura: userBio ? Number((userBio.cintura / userBio.cadera).toFixed(2)) : 0,
    genero: userBio?.genero,
    fecha: "Estado Actual"
  };

  const targetHourglass = 0.70;
  const targetSimetria = 1.00;
  const gap = Math.abs((active.brazo || 0) - (active.pantorrilla || 0)).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      
      {/* HEADER DINÁMICO CON BOTÓN DE MÉTRICAS */}
      <header className="max-w-7xl mx-auto mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">
            {active.genero === 'hombre' ? "Estructura Apex" : "Atleta Alpha"} <span className="text-cyan-500">Bioaxis</span>
          </h1>
          <p className="text-slate-500 flex items-center gap-2 mt-1 font-bold text-[10px] uppercase tracking-widest">
            <ShieldCheck size={14} className="text-cyan-500" />
            Viendo: {hoveredData ? `Punto Histórico (${active.fecha})` : "Registro Actual"} | {active.peso} kg
          </p>
        </motion.div>

        <div className="flex flex-wrap items-center gap-4">
          {/* BOTÓN AL LABORATORIO DE PERÍMETROS */}
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
                  Laboratorio de Perímetros <ChevronRight size={12} className="text-cyan-500" />
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
        {/* ... Resto del código del Dashboard (Mismo que ya tienes) ... */}
        <div className="lg:col-span-2 space-y-8">
          <EvolutionChart onHover={(data) => setHoveredData(data)} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={cardStyle}>
              {/* Card X-Frame Index */}
              <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <Target size={14} className="text-cyan-400" /> X-Frame Index
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold">ACTUAL</span>
                  <span className="text-4xl font-black italic text-white">{active.ratioSimetria}</span>
                </div>
                <div className="h-10 w-[2px] bg-slate-800 mx-2" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold text-cyan-800">META</span>
                  <span className="text-4xl font-black italic text-cyan-500">{targetSimetria.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className={cardStyle}>
              {/* Card Hourglass Ratio */}
              <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <Zap size={14} className="text-rose-400" /> Hourglass Ratio
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold">ACTUAL</span>
                  <span className="text-4xl font-black italic text-white">{active.ratioCurvatura}</span>
                </div>
                <div className="h-10 w-[2px] bg-slate-800 mx-2" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold text-rose-900">META</span>
                  <span className="text-4xl font-black italic text-rose-500">{targetHourglass.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/20 border border-slate-800/50 p-10 rounded-[3.5rem] grid grid-cols-3 gap-8">
            <div className="text-center">
              <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mb-2">Hombros</p>
              <p className="text-3xl font-black text-white">{active.hombros || "--"}<span className="text-sm ml-1 text-slate-600 font-bold">cm</span></p>
            </div>
            <div className="text-center border-x border-slate-800/50">
              <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mb-2">Cintura</p>
              <p className="text-3xl font-black text-white">{active.cintura || "--"}<span className="text-sm ml-1 text-slate-600 font-bold">cm</span></p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mb-2">Cadera</p>
              <p className="text-3xl font-black text-white">{active.cadera || "--"}<span className="text-sm ml-1 text-slate-600 font-bold">cm</span></p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 p-8 rounded-[3.5rem] shadow-xl relative overflow-hidden group">
            <h2 className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em] italic">Fuel Analysis</h2>
            <p className="text-5xl font-black text-white mt-4 tracking-tighter">
              {Math.round(active.peso * 33)} <span className="text-sm opacity-50 font-medium italic">kcal</span>
            </p>
            <button className="mt-10 w-full py-5 bg-white text-slate-900 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all">
              Optimizar Macros <ArrowRight size={16} />
            </button>
          </div>
          
          <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-[3rem]">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Simetría de Extremidades</h4>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-slate-400 font-bold mb-1 uppercase italic">Diferencia B/P</p>
                <p className="text-3xl font-black text-white italic">{gap}cm</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}