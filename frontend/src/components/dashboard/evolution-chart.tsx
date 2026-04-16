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
          {data.genero === 'mujer' ? (
            <>
              <p className="text-slate-400 flex justify-between">Cintura: <span className="text-white font-bold">{data.cintura} cm</span></p>
              <p className="text-slate-400 flex justify-between">Cadera: <span className="text-white font-bold">{data.cadera} cm</span></p>
            </>
          ) : (
            <>
              <p className="text-slate-400 flex justify-between">Hombros: <span className="text-white font-bold">{data.hombros} cm</span></p>
              <p className="text-slate-400 flex justify-between">Cintura: <span className="text-white font-bold">{data.cintura} cm</span></p>
            </>
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
  const [isClient, setIsClient] = useState(false); // SOLUCIÓN HYDRATION 1

  useEffect(() => {
    setIsClient(true); // SOLUCIÓN HYDRATION 2
    
    const fetchHistory = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('dim_atleta')
        .select('*')
        .eq('user_id', user.id)
        .eq('genero', 'hombre') // <--- FILTRA POR TU GÉNERO REAL
        .order('created_at', { ascending: true });    // <--- El punto y coma va hasta el final
              
      if (data) {
        // Imprimimos para depurar (ahora sí se verá)
        console.log("--- INSPECCIÓN BIOAXIS ---");
        console.table(data.map(d => ({ fecha: d.created_at, peso: d.peso })));

        const formatted = data.map(entry => {
          const ratio = entry.genero === 'mujer' 
            ? (entry.cintura / entry.cadera) 
            : (entry.hombros / entry.cintura);
          
          // Formateo seguro para evitar Hydration Error
          const dateObj = new Date(entry.created_at || entry.valid_from);
          const dia = String(dateObj.getUTCDate()).padStart(2, '0');
          const mes = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
          const hora = String(dateObj.getUTCHours()).padStart(2, '0');
          const min = String(dateObj.getUTCMinutes()).padStart(2, '0');
          const sec = String(dateObj.getSeconds()).padStart(2, '0');

          return {
            fecha: `${dia}/${mes} ${hora}:${min}:${sec}`, 
            peso: entry.peso,
            ratio: Number(ratio.toFixed(2)),
            hombros: entry.hombros,
            cintura: entry.cintura,
            cadera: entry.cadera,
            genero: entry.genero
          };
        });

        setEvolutionData(formatted);
        if (formatted.length > 0) {
          setCurrentRatio(formatted[formatted.length - 1].ratio.toFixed(2));
        }
      }
      setLoading(false);
    };

    fetchHistory();
  }, []);

  // SOLUCIÓN HYDRATION 3: No renderizamos hasta que sea cliente
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

      {/* SOLUCIÓN CONTENEDOR -1x-1: Forzamos min-height y flex-grow */}
      <div className="flex-grow min-h-[200px] w-full">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={evolutionData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="fecha" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dy={10} />
            <YAxis yAxisId="left" domain={['dataMin - 0.1', 'dataMax + 0.1']} stroke="#06b6d4" fontSize={12} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" domain={['dataMin - 5', 'dataMax + 5']} stroke="#818cf8" fontSize={12} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 2, strokeDasharray: '4 4' }} />
            <Legend verticalAlign="top" align="right" iconType="circle" />
            <Line yAxisId="left" type="monotone" dataKey="ratio" name="Ratio Estético" stroke="#06b6d4" strokeWidth={4} dot={{ r: 5, fill: '#06b6d4', strokeWidth: 2, stroke: '#0f172a' }} activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }} />
            <Line yAxisId="right" type="monotone" dataKey="peso" name="Peso (kg)" stroke="#818cf8" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: '#818cf8', strokeWidth: 2, stroke: '#0f172a' }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}