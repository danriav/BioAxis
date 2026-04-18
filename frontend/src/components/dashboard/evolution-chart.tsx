// src/components/workout/evolution-chart.tsx
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
      <div className="bg-[#0f172a] border border-slate-700 p-4 rounded-2xl shadow-2xl min-w-[180px]">
        <p className="text-slate-400 text-xs font-bold mb-3 uppercase tracking-wider">{label}</p>
        <div className="space-y-2 mb-3">
          <div className="flex justify-between items-center">
            <p className="text-cyan-500 text-sm font-bold uppercase">Simetría:</p>
            <p className="text-cyan-400 text-xl font-black italic">{data.ratioSimetria}</p>
          </div>
          {data.genero === 'mujer' && (
            <div className="flex justify-between items-center border-t border-slate-800 pt-2">
              <p className="text-rose-500 text-sm font-bold uppercase">Curvatura:</p>
              <p className="text-rose-400 text-xl font-black italic">{data.ratioCurvatura}</p>
            </div>
          )}
        </div>
        <div className="pt-3 border-t border-slate-800 flex flex-col gap-1 text-[10px] font-medium text-slate-400 uppercase">
          <p className="flex justify-between">Peso: <span className="text-white">{data.peso} kg</span></p>
          <p className="flex justify-between">Hombros: <span className="text-white">{data.hombros} cm</span></p>
          <p className="flex justify-between">Cintura: <span className="text-white">{data.cintura} cm</span></p>
          {data.genero === 'mujer' && (
            <p className="flex justify-between">Cadera: <span className="text-white">{data.cadera} cm</span></p>
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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
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
        const formatted = data.map(entry => {
          const simetria = entry.genero === 'mujer' 
            ? (entry.hombros / entry.cadera) 
            : (entry.hombros / entry.cintura);
          
          const curvatura = entry.genero === 'mujer' 
            ? (entry.cintura / entry.cadera) 
            : 0; // Para hombres podrías usar Cintura/Hombros si quisieras

          const dateObj = new Date(entry.created_at || entry.valid_from);
          return {
            fecha: `${String(dateObj.getUTCDate()).padStart(2, '0')}/${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}`, 
            peso: entry.peso,
            ratioSimetria: Number(simetria.toFixed(2)),
            ratioCurvatura: Number(curvatura.toFixed(2)),
            hombros: entry.hombros,
            cintura: entry.cintura,
            cadera: entry.cadera,
            genero: entry.genero
          };
        });
        setEvolutionData(formatted);
      }
      setLoading(false);
    };
    fetchHistory();
  }, []);

  if (!isClient || loading) return <Loader2 className="animate-spin" />;

  return (
    <div className="h-[400px] w-full bg-slate-900/40 backdrop-blur-md rounded-[3rem] border border-slate-800 p-8 shadow-2xl flex flex-col">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white italic uppercase">Análisis Bio-Estético</h3>
        <p className="text-xs text-slate-500">Simetría (X-Frame) vs Curvatura (Hourglass)</p>
      </div>

      <div className="flex-grow w-full">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={evolutionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="fecha" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" align="right" iconType="circle" />
            
            <Line type="monotone" dataKey="ratioSimetria" name="Simetría (H/C)" stroke="#06b6d4" strokeWidth={4} dot={{ r: 4 }} />
            
            {evolutionData[0]?.genero === 'mujer' && (
              <Line type="monotone" dataKey="ratioCurvatura" name="Curvatura (C/C)" stroke="#f43f5e" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 3 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}