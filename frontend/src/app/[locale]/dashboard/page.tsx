"use client";

import { motion } from "framer-motion";
import { 
  Activity, Dna, Zap, Target, ChevronRight, 
  ShieldCheck, TrendingUp, Scale, Ruler 
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

// --- DATA REAL DE TU EVOLUCIÓN ---
const evolutionData = [
  { fecha: '22/03', peso: 76, vtaper: 1.40, hombros: 116 },
  { fecha: '18/07', peso: 78.1, vtaper: 1.51, hombros: 123 },
  { fecha: '17/08', peso: 80, vtaper: 1.54, hombros: 125.5 },
  { fecha: '21/09', peso: 83.3, vtaper: 1.56, hombros: 126.5 },
  { fecha: '11/12', peso: 84.6, vtaper: 1.59, hombros: 129 },
  { fecha: '27/03', peso: 84.3, vtaper: 1.59, hombros: 130 },
];

const cardStyle = "bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-3xl shadow-xl hover:border-cyan-500/30 transition-all duration-500";
const glowStyle = "absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl opacity-0 group-hover:opacity-20 transition duration-500 blur";

export default function ScientificDashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      
      {/* HEADER */}
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent italic uppercase">
            Control de Biotipo <span className="text-cyan-500 underline decoration-cyan-500/20">Bioaxis</span>
          </h1>
          <p className="text-slate-500 flex items-center gap-2 mt-1 font-medium">
            <ShieldCheck size={16} className="text-cyan-500" /> 
            Análisis de Datos: 2025 - 2026
          </p>
        </motion.div>

        <div className="flex gap-3">
          <div className="bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_#06b6d4]" />
            <span className="text-xs font-mono text-slate-400 uppercase tracking-tighter">Motor de Simetría: Activo</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA 1: GRÁFICA DE EVOLUCIÓN (Sustituye al Avatar) */}
        <motion.div 
          className="lg:col-span-2 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className={cardStyle + " relative group overflow-hidden min-h-[450px]"}>
            <div className={glowStyle} />
            <div className="flex justify-between items-start mb-8 relative z-10">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Activity className="text-cyan-400" size={20} /> Evolución Biomecánica
                </h2>
                <div className="text-right">
                    <span className="text-2xl font-black text-white italic">1.59</span>
                    <p className="text-[10px] text-cyan-500 font-bold uppercase tracking-tighter">Ratio V-Taper Actual</p>
                </div>
            </div>
            
            <div className="h-[300px] w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="fecha" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" domain={[1.3, 1.7]} hide />
                  <YAxis yAxisId="right" orientation="right" domain={[70, 90]} hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', color: '#fff' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Line 
                    yAxisId="left" type="monotone" dataKey="vtaper" name="V-Taper" 
                    stroke="#06b6d4" strokeWidth={4} dot={{ r: 4, fill: '#06b6d4' }} 
                  />
                  <Line 
                    yAxisId="right" type="monotone" dataKey="peso" name="Peso (kg)" 
                    stroke="#818cf8" strokeWidth={2} strokeDasharray="5 5" dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-6 border-t border-slate-800 pt-6">
                <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Hombros</p>
                    <p className="text-lg font-black text-white">+14cm</p>
                </div>
                <div className="text-center border-x border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Peso Total</p>
                    <p className="text-lg font-black text-white">+8.3kg</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Brazo</p>
                    <p className="text-lg font-black text-white">40.2cm</p>
                </div>
            </div>
          </div>

          {/* MÉTRICAS DE SIMETRÍA REALES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={cardStyle}>
              <h3 className="text-slate-400 text-sm font-medium mb-4 flex items-center gap-2">
                <Target size={16} className="text-cyan-400" /> Especialización
              </h3>
              <p className="text-2xl font-bold italic text-white underline decoration-amber-500/50">Pantorrillas (GAP 4.2cm)</p>
              <p className="text-xs text-slate-500 mt-2 italic">
                Tus brazos dominan el ratio simétrico. Se recomienda frecuencia 3x en tríceps sural para equilibrar el tren inferior.
              </p>
            </div>
            <div className={cardStyle}>
              <h3 className="text-slate-400 text-sm font-medium mb-4 flex items-center gap-2">
                <Zap size={16} className="text-amber-400" /> V-Taper Status
              </h3>
              <p className="text-2xl font-bold">Avanzado (1.59)</p>
              <p className="text-xs text-slate-500 mt-2">Estás al 98% del "Ratio Dorado" (1.618). Enfoque actual: Densidad de espalda media.</p>
            </div>
          </div>
        </motion.div>

        {/* COLUMNA 2: WIDGETS LATERALES (Actualizados con tu peso) */}
        <motion.div 
          className="space-y-8"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Tarjeta de Nutrición Real (para 84.3kg) */}
          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 p-6 rounded-[2.5rem] shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
              <Scale size={80} />
            </div>
            <h2 className="text-white/80 text-sm font-bold uppercase tracking-wider italic">Gasto Energético (84.3kg)</h2>
            <p className="text-4xl font-black text-white mt-2 tracking-tighter">2,950 <span className="text-lg font-medium opacity-60">kcal</span></p>
            <p className="text-white/80 text-xs mt-2 font-mono">P: 185g | C: 350g | G: 80g</p>
            <button className="mt-6 w-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md py-3 rounded-2xl text-white text-sm font-bold transition-all uppercase italic tracking-widest">
              Ajustar Macros
            </button>
          </div>

          {/* Próximo Entrenamiento Dinámico */}
          <div className={cardStyle}>
            <h2 className="font-bold mb-4 flex items-center justify-between">
              Próxima Sesión
              <span className="text-[10px] bg-cyan-500 text-slate-950 px-2 py-0.5 rounded-full font-bold tracking-tighter">PUSH DAY</span>
            </h2>
            <div className="space-y-3">
              <ExerciseItem name="Press Inclinado" sets="3 x 8-10" />
              <ExerciseItem name="Press Militar" sets="3 x 10" />
              <ExerciseItem name="Elev. Laterales" sets="4 x 15" />
            </div>
            <button className="mt-6 w-full group flex items-center justify-center gap-2 bg-slate-950/50 border border-slate-800 py-3 rounded-2xl text-cyan-400 text-sm font-bold hover:border-cyan-500/50 transition-all">
              Iniciar Tracker <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

// --- SUBCOMPONENTES ---

function ExerciseItem({ name, sets }: { name: string, sets: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/30 hover:border-cyan-500/20 transition-colors">
      <span className="text-sm font-medium text-slate-300">{name}</span>
      <span className="text-xs font-mono text-cyan-500 font-bold">{sets}</span>
    </div>
  );
}