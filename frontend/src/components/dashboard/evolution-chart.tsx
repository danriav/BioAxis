"use client";

import { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { getSupabaseClient } from "@/lib/supabase/client";
import { Loader2, Info, AlertTriangle } from "lucide-react";

// ... (getAthleteStatus y CustomTooltip se mantienen igual) ...
const getAthleteStatus = (data: any) => {
  if (!data) return { label: "SIN DATOS", color: "bg-slate-800 text-slate-500", desc: "Completa tu perfil." };
  const whr = data.ratioCurvatura;
  const gender = data.genero;
  if (gender === 'mujer' && data.brazo > 42 && data.peso < 70) {
    return { label: "DATOS INCOHERENTES", color: "bg-red-500/20 text-red-400 border border-red-500/50", desc: "Medidas de brazo no coherentes." };
  }
  if (gender === 'mujer') {
    if (whr > 0.85) return { label: "INICIANDO CAMINO", color: "bg-slate-800 text-slate-400", desc: "Fase de recomposición base." };
    if (whr > 0.75) return { label: "ESTÉTICA EN DESARROLLO", color: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", desc: "Buena base. Falta volumen." };
    if (whr <= 0.75) return { label: "ATLETA AVANZADA", color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", desc: "Simetría de alto nivel." };
  }
  return { label: "ATLETA", color: "bg-slate-800 text-white", desc: "Analizando evolución..." };
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const cleanLabel = typeof label === 'string' ? label.split('_')[0] : label;
    return (
      <div className="bg-[#0f172a] border border-slate-700 p-4 rounded-2xl shadow-2xl min-w-[180px]">
        <p className="text-slate-400 text-[10px] font-black mb-3 uppercase tracking-wider">{cleanLabel}</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-cyan-500 font-bold uppercase">Simetría:</span>
            <span className="text-white font-black italic">{data.ratioSimetria}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-rose-500 font-bold uppercase">Curvatura:</span>
            <span className="text-white font-black italic">{data.ratioCurvatura}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// 🛑 ACEPTAMOS onHover Y activeData
export function EvolutionChart({ onHover, activeData }: { onHover: (data: any | null) => void, activeData: any }) {
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('dim_atleta').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
      if (data && data.length > 0) {
        const formatted = data.map((entry, index) => {
          const simetria = entry.genero === 'mujer' ? (entry.hombros / entry.cadera) : (entry.hombros / entry.cintura);
          const curvatura = entry.genero === 'mujer' ? (entry.cintura / entry.cadera) : 0;
          const dateObj = new Date(entry.created_at || entry.valid_from);
          const fechaBase = `${String(dateObj.getUTCDate()).padStart(2, '0')}/${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}`;
          return {
            uid: `${fechaBase}_${index}`,
            fecha: fechaBase,
            peso: entry.peso,
            ratioSimetria: Number(simetria.toFixed(2)) || 0,
            ratioCurvatura: Number(curvatura.toFixed(2)) || 0,
            hombros: entry.hombros,
            cintura: entry.cintura,
            cadera: entry.cadera,
            brazo: entry.brazo,
            pantorrilla: entry.pantorrilla,
            genero: entry.genero
          };
        });
        setEvolutionData(formatted);
      }
      setLoading(false);
    };
    fetchHistory();
  }, []);

  if (loading) return <div className="h-[400px] flex items-center justify-center"><Loader2 className="animate-spin text-cyan-500" /></div>;

  const latestStatus = getAthleteStatus(evolutionData[evolutionData.length - 1]);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="w-full bg-slate-900/40 backdrop-blur-md rounded-[3.5rem] border border-slate-800 p-8 md:p-10 shadow-2xl">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Análisis <span className="text-cyan-500">Bio-Estético</span></h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Navegación Cronológica Activa</p>
          </div>
          <div className="text-right">
            <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${latestStatus.color}`}>
              {latestStatus.label}
            </span>
          </div>
        </div>

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={evolutionData}
              onMouseMove={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  onHover(e.activePayload[0].payload);
                }
              }}
              onMouseLeave={() => onHover(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="uid" tickFormatter={(val) => val.split('_')[0]} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingBottom: '20px' }} />
              <Line type="monotone" dataKey="ratioSimetria" name="Simetría" stroke="#06b6d4" strokeWidth={4} dot={{ r: 4 }} activeDot={{ r: 8 }} />
              {evolutionData[0]?.genero === 'mujer' && (
                <Line type="monotone" dataKey="ratioCurvatura" name="Curvatura" stroke="#f43f5e" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 3 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 🟡 AQUÍ ESTÁN LOS 3 DATOS (Situados donde indicaste el color amarillo) */}
        <div className="grid grid-cols-3 gap-0 mt-0 pt-0 border-t border-slate-800/50">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Hombros</p>
            <p className="text-lg font-black text-white italic">{activeData?.hombros || "--"}<span className="text-sm ml-1 text-slate-600 font-bold">cm</span></p>
          </div>
          <div className="text-center border-x border-slate-800/50">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Cintura</p>
            <p className="text-lg font-black text-white italic">{activeData?.cintura || "--"}<span className="text-sm ml-1 text-slate-600 font-bold">cm</span></p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Cadera</p>
            <p className="text-lg font-black text-white italic">{activeData?.cadera || "--"}<span className="text-sm ml-1 text-slate-600 font-bold">cm</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ... (Info e Alert de abajo se mantienen igual) ... */}
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-[2.5rem] flex gap-4 items-start">
          <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400"><Info size={20} /></div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500 mb-1">Hourglass (Ideal: 0.70)</h4>
            <p className="text-xs text-slate-400">Ratio cintura/cadera. Define la profundidad de la silueta femenina.</p>
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-[2.5rem] flex gap-4 items-start">
          <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400"><AlertTriangle size={20} /></div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 mb-1">X-Frame (Ideal: 1.00)</h4>
            <p className="text-xs text-slate-400">Relación hombros/cadera. Busca la simetría total de la estructura.</p>
          </div>
        </div>
      </div>
    </div>
  );
}