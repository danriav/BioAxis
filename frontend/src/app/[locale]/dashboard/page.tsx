"use client";

import { motion } from "framer-motion";
import { 
  Activity, 
  Dna, 
  Zap, 
  Target, 
  ChevronRight,
  ShieldCheck,
  TrendingUp
} from "lucide-react";

// Estilos comunes
const cardStyle = "bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-3xl shadow-xl hover:border-cyan-500/30 transition-all duration-500";
const glowStyle = "absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl opacity-0 group-hover:opacity-20 transition duration-500 blur";

export default function ScientificDashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      
      {/* HEADER */}
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Panel de Control Biomecánico
          </h1>
          <p className="text-slate-500 flex items-center gap-2 mt-1">
            <ShieldCheck size={16} className="text-cyan-500" /> 
            Sincronizado con BioAxis Engine v1.0
          </p>
        </motion.div>

        <div className="flex gap-3">
          <div className="bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-slate-400">STATUS: OPTIMAL</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA 1: AVATAR Y RATIOS */}
        <motion.div 
          className="lg:col-span-2 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className={cardStyle + " relative group overflow-hidden"}>
            <div className={glowStyle} />
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Dna className="text-cyan-400" size={20} /> Perfil Estructural
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              {/* Visualización del Avatar (Placeholder Estético) */}
              <div className="relative h-64 bg-slate-950/50 rounded-2xl border border-slate-800/50 flex items-center justify-center overflow-hidden">
                 <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500 via-transparent to-transparent" />
                 {/* Aquí simulamos un radar o silueta */}
                 <div className="relative w-32 h-32 border-2 border-cyan-500/20 rounded-full flex items-center justify-center">
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.5, 0.2] }}
                      transition={{ repeat: Infinity, duration: 4 }}
                      className="absolute inset-0 bg-cyan-500/10 rounded-full" 
                    />
                    <Activity size={48} className="text-cyan-500/40" />
                 </div>
                 <div className="absolute bottom-4 left-4 text-[10px] font-mono text-cyan-500/50">
                    SYNCING_BIO_PROFILE...
                 </div>
              </div>

              {/* Métricas Rápidas */}
              <div className="space-y-4">
                <MetricBar label="Ratio Fémur/Estatura" value={26.4} target={24.5} />
                <MetricBar label="Potencial de Cadera" value={88} target={100} color="bg-blue-500" />
                <MetricBar label="Estabilidad de Rodilla" value={62} target={100} color="bg-indigo-500" />
              </div>
            </div>
          </div>

          {/* TARJETAS INFERIORES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={cardStyle}>
              <h3 className="text-slate-400 text-sm font-medium mb-4 flex items-center gap-2">
                <Target size={16} className="text-cyan-400" /> Recomendación de Carga
              </h3>
              <p className="text-2xl font-bold">Enfoque: Glúteo Mayor</p>
              <p className="text-xs text-slate-500 mt-2">Basado en tus palancas largas, se recomienda un ángulo de inclinación de torso de 45° en prensa.</p>
            </div>
            <div className={cardStyle}>
              <h3 className="text-slate-400 text-sm font-medium mb-4 flex items-center gap-2">
                <Zap size={16} className="text-amber-400" /> Volumen Semanal
              </h3>
              <p className="text-2xl font-bold">18 Series / Grupo</p>
              <p className="text-xs text-slate-500 mt-2">Capacidad de recuperación estimada: Alta (MRV optimizado).</p>
            </div>
          </div>
        </motion.div>

        {/* COLUMNA 2: WIDGETS LATERALES */}
        <motion.div 
          className="space-y-8"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Tarjeta de Nutrición */}
          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 p-6 rounded-3xl shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
              <TrendingUp size={80} />
            </div>
            <h2 className="text-white/80 text-sm font-bold uppercase tracking-wider">Calorías Base</h2>
            <p className="text-4xl font-black text-white mt-2">2,840</p>
            <p className="text-white/60 text-xs mt-1">Proteína: 180g | Grasas: 70g</p>
            <button className="mt-6 w-full bg-white/10 hover:bg-white/20 backdrop-blur-md py-3 rounded-xl text-white text-sm font-bold transition-all">
              Ver Plan Nutricional
            </button>
          </div>

          {/* Próximo Entrenamiento */}
          <div className={cardStyle}>
            <h2 className="font-bold mb-4 flex items-center justify-between">
              Próxima Sesión
              <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 tracking-tighter">HOY</span>
            </h2>
            <div className="space-y-4">
              <ExerciseItem name="Hip Thrust Pausado" sets="4x10" />
              <ExerciseItem name="Sentadilla Búlgara" sets="3x12" />
            </div>
            <button className="mt-6 w-full group flex items-center justify-center gap-2 text-cyan-400 text-sm font-bold hover:text-cyan-300 transition-colors">
              Iniciar Entrenamiento <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

// --- SUBCOMPONENTES AUXILIARES ---

function MetricBar({ label, value, target, color = "bg-cyan-500" }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-bold">{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(value / target) * 100}%` }}
          className={`h-full ${color} shadow-[0_0_10px_rgba(6,182,212,0.3)]`}
        />
      </div>
    </div>
  );
}

function ExerciseItem({ name, sets }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/50">
      <span className="text-sm font-medium text-slate-300">{name}</span>
      <span className="text-xs font-mono text-cyan-500">{sets}</span>
    </div>
  );
}