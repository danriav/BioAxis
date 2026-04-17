"use client";

import { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { getSupabaseClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0f172a] border border-slate-700 p-4 rounded-2xl shadow-2xl min-w-[160px]">
        <p className="text-slate-400 text-xs font-bold mb-3 uppercase tracking-wider">{label}</p>
        <div className="flex justify-between items-end mb-1">
          <p className="text-cyan-500 text-2xl font-black italic">{data.ratio}</p>
          <p className="text-cyan-800 text-[10px] font-bold uppercase mb-1">Ratio</p>
        </div>
        <div className="flex justify-between items-end mb-3">
          <p className="text-indigo-400 text-lg font-bold">{data.peso} <span className="text-sm">kg</span></p>
          <p className="text-indigo-900 text-[10px] font-bold uppercase mb-1">Peso</p>
        </div>
        <div className="pt-3 border-t border-slate-800 flex flex-col gap-1 text-xs font-medium">
          <p className="text-slate-400 flex justify-between">Hombros: <span className="text-white font-bold">{data.hombros} cm</span></p>
          <p className="text-slate-400 flex justify-between">Cintura: <span className="text-white font-bold">{data.cintura} cm</span></p>
          {data.genero === 'mujer' && (
             <p className="text-slate-400 flex justify-between">Cadera: <span className="text-white font-bold">{data.cadera} cm</span></p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export function EvolutionChart() {
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRatio, setCurrentRatio] = useState("0.00");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const fetchHistory = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ELIMINADO EL FILTRO DE GÉNERO HARDCODED
      const { data, error } = await supabase
        .from('dim_atleta')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
              
      if (data && data.length > 0) {
        const formatted = data.map(entry => {
          // LÓGICA DE RATIO BIOAXIS:
          // Hombre: Hombros / Cintura (Meta 1.618)
          // Mujer: Hombros / Cadera (Meta ~1.0 para simetría perfecta)
          const ratioValue = entry.genero === 'mujer' 
            ? (entry.hombros / entry.cadera) 
            : (entry.hombros / entry.cintura);
          
          const dateObj = new Date(entry.created_at || entry.valid_from);
          const dia = String(dateObj.getUTCDate()).padStart(2, '0');
          const mes = String(dateObj.getUTCMonth() + 1).padStart(2, '0');

          return {
            fecha: `${dia}/${mes}`, 
            peso: entry.peso,
            ratio: Number(ratioValue.toFixed(2)),
            hombros: entry.hombros,
            cintura: entry.cintura,
            cadera: entry.cadera,
            genero: entry.genero
          };
        });

        setEvolutionData(formatted);
        setCurrentRatio(formatted[formatted.length - 1].ratio.toFixed(2));
      }
      setLoading(false);
    };

    fetchHistory();
  }, []);

  if (!isClient || loading) {
    return (
      <div className="h-[400px] w-full bg-slate-900/40 backdrop-blur-md rounded-[3rem] border border-slate-800 flex items-center justify-center">
        <Loader2 className="text-cyan-500 animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="h-[400px] w-full bg-slate-900/40 backdrop-blur-md rounded-[3rem] border border-slate-800 p-8 shadow-2xl flex flex-col">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight italic uppercase">Evolución Biomecánica</h3>
          <p className="text-xs text-slate-500 font-medium">Historial de Dimensión Atleta</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-cyan-500 italic">{currentRatio}</span>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Current Ratio</p>
        </div>
      </div>

      <div className="flex-grow min-h-[200px] w-full">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={evolutionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="fecha" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" domain={['dataMin - 0.1', 'dataMax + 0.1']} stroke="#06b6d4" fontSize={12} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" stroke="#818cf8" fontSize={12} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" align="right" />
            <Line yAxisId="left" type="monotone" dataKey="ratio" name="Ratio Estético" stroke="#06b6d4" strokeWidth={4} dot={{ r: 4 }} />
            <Line yAxisId="right" type="monotone" dataKey="peso" name="Peso (kg)" stroke="#818cf8" strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}