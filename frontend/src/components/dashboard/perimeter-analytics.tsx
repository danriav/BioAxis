// src/components/dashboard/perimeter-analytics.tsx
"use client";

import { useEffect, useState } from "react";
import { 
  XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Area, AreaChart 
} from "recharts";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Loader2, TrendingUp, TrendingDown, Ruler } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const METRICS_MAP = [
  { id: "peso", label: "Masa Corporal", color: "#8b5cf6", unit: "kg" },
  { id: "gluteo", label: "Glúteo Max", color: "#f43f5e", unit: "cm" },
  { id: "pierna", label: "Cuádriceps/Isquios", color: "#ec4899", unit: "cm" },
  { id: "pantorrilla", label: "Pantorrilla", color: "#d946ef", unit: "cm" },
  { id: "hombros", label: "Amplitud Hombros", color: "#06b6d4", unit: "cm" },
  { id: "pecho", label: "Caja Torácica", color: "#3b82f6", unit: "cm" },
  { id: "brazo", label: "Brazos (Bíceps)", color: "#14b8a6", unit: "cm" },
  { id: "cintura", label: "Cintura", color: "#eab308", unit: "cm" },
  { id: "cadera", label: "Cadera Base", color: "#f97316", unit: "cm" },
];

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (active && payload && payload.length) {
    const cleanLabel = typeof label === 'string' ? label.split('_')[0] : label;
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl">
        <p className="text-slate-400 text-[10px] font-black mb-1 uppercase">{cleanLabel}</p>
        <p className="text-white font-black text-lg">
          {payload[0].value} <span className="text-xs text-slate-500 font-medium">{unit}</span>
        </p>
      </div>
    );
  }
  return null;
};

export function PerimeterAnalytics() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState(METRICS_MAP[1]); // Empezamos con Glúteo

  useEffect(() => {
    const fetchHistory = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('dim_atleta')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
              
      if (data && data.length > 0) {
        const formatted = data.map((entry, index) => {
          const dateObj = new Date(entry.created_at || entry.valid_from);
          const fechaBase = `${String(dateObj.getUTCDate()).padStart(2, '0')}/${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}`;
          
          return {
            uid: `${fechaBase}_${index}`,
            fecha: fechaBase,
            peso: entry.peso,
            gluteo: entry.gluteo,
            pierna: entry.pierna,
            pantorrilla: entry.pantorrilla,
            hombros: entry.hombros,
            pecho: entry.pecho,
            brazo: entry.brazo,
            cintura: entry.cintura,
            cadera: entry.cadera,
          };
        });
        setHistory(formatted);
      }
      setLoading(false);
    };
    fetchHistory();
  }, []);

  if (loading) return <div className="h-[400px] flex items-center justify-center"><Loader2 className="animate-spin text-cyan-500" /></div>;
  if (history.length === 0) return <div className="text-slate-500 text-center py-20">No hay datos suficientes para el análisis.</div>;

  // Lógica de progreso (Primer vs Último)
  const firstValue = history[0][activeMetric.id] || 0;
  const lastValue = history[history.length - 1][activeMetric.id] || 0;
  const delta = Number((lastValue - firstValue).toFixed(1));
  const isPositive = delta > 0;
  const isNeutral = delta === 0;

  return (
    <div className="w-full bg-slate-900/40 backdrop-blur-md rounded-[3.5rem] border border-slate-800 p-8 shadow-2xl flex flex-col lg:flex-row gap-8">
      
      {/* PANEL LATERAL: SELECTOR DE MÚSCULOS */}
      <div className="w-full lg:w-1/3 flex flex-col">
        <div className="mb-6">
          <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
            <Ruler size={24} className="text-cyan-500" /> Laboratorio
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
            Aislamiento Muscular
          </p>
        </div>

        {/* Añadido un max-height y scroll elegante */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[400px] custom-scrollbar">
          {METRICS_MAP.map((metric) => (
            <button
              key={metric.id}
              onClick={() => setActiveMetric(metric)}
              className={`w-full text-left px-5 py-4 rounded-2xl transition-all duration-300 flex items-center justify-between group ${
                activeMetric.id === metric.id 
                  ? "bg-slate-800 text-white shadow-lg border border-slate-700" 
                  : "bg-transparent text-slate-500 hover:bg-slate-800/50 hover:text-slate-300"
              }`}
            >
              <span className="text-xs font-black uppercase tracking-widest">{metric.label}</span>
              <div 
                className="w-2 h-2 rounded-full transition-all duration-300" 
                style={{ backgroundColor: activeMetric.id === metric.id ? metric.color : "transparent" }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* PANEL CENTRAL: GRÁFICO Y RESULTADOS */}
      <div className="w-full lg:w-2/3 flex flex-col">
        
        {/* TARJETA DE DELTA */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeMetric.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between mb-8 p-6 bg-slate-950/50 rounded-3xl border border-slate-800"
          >
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Registro Actual</p>
              <p className="text-4xl font-black text-white italic">
                {lastValue} <span className="text-sm text-slate-600 normal-case">{activeMetric.unit}</span>
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Evolución Neta</p>
              <div className={`flex items-center justify-end gap-2 text-2xl font-black italic ${isNeutral ? 'text-slate-500' : isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {!isNeutral && (isPositive ? <TrendingUp size={24} /> : <TrendingDown size={24} />)}
                {delta > 0 ? "+" : ""}{delta} <span className="text-xs normal-case opacity-70">{activeMetric.unit}</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* EL GRÁFICO */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id={`color-${activeMetric.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeMetric.color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={activeMetric.color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="uid" tickFormatter={(val) => val.split('_')[0]} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip unit={activeMetric.unit} />} cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '5 5' }} />
              
              <Area 
                type="monotone" 
                dataKey={activeMetric.id} 
                stroke={activeMetric.color} 
                strokeWidth={4}
                fillOpacity={1} 
                fill={`url(#color-${activeMetric.id})`} 
                activeDot={{ r: 8, fill: activeMetric.color, stroke: '#0f172a', strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}