"use client";

import { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { getSupabaseClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export function EvolutionChart() {
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRatio, setCurrentRatio] = useState("0.00");

  useEffect(() => {
    const fetchHistory = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // CONSULTA KIMBALL: Traemos toda la historia de la dimensión (SCD 2)
      const { data, error } = await supabase
        .from('dim_atleta')
        .select('*')
        .eq('user_id', user.id)
        .order('valid_from', { ascending: true });

      if (data) {
        // Formateamos los datos para la gráfica
        const formatted = data.map(entry => {
          const ratio = entry.genero === 'mujer' 
            ? (entry.cintura / entry.cadera) 
            : (entry.hombros / entry.cintura);
          
          return {
            fecha: new Date(entry.valid_from).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
            peso: entry.peso,
            ratio: Number(ratio.toFixed(2)),
            fullDate: entry.valid_from
          };
        });

        setEvolutionData(formatted);
        
        // El último registro es el actual
        if (formatted.length > 0) {
          setCurrentRatio(formatted[formatted.length - 1].ratio.toFixed(2));
        }
      }
      setLoading(false);
    };

    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="h-[400px] w-full bg-slate-900/40 backdrop-blur-md rounded-[3rem] border border-slate-800 flex items-center justify-center">
        <Loader2 className="text-cyan-500 animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="h-[400px] w-full bg-slate-900/40 backdrop-blur-md rounded-[3rem] border border-slate-800 p-8 shadow-2xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight italic uppercase">Evolución Biomecánica</h3>
          <p className="text-xs text-slate-500 font-medium">Historial de Dimensión Atleta (SCD Tipo 2)</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-cyan-500 italic">{currentRatio}</span>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Current Ratio</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={evolutionData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis 
            dataKey="fecha" 
            stroke="#64748b" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          {/* Ratio dinámico (V-Taper o Hourglass) */}
          <YAxis 
            yAxisId="left" 
            domain={['dataMin - 0.1', 'dataMax + 0.1']} 
            stroke="#06b6d4" 
            fontSize={12} 
            axisLine={false} 
            tickLine={false} 
          />
          {/* Peso */}
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            domain={['dataMin - 5', 'dataMax + 5']} 
            stroke="#818cf8" 
            fontSize={12} 
            axisLine={false} 
            tickLine={false} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '1.5rem', fontSize: '12px' }}
            itemStyle={{ color: '#fff' }}
          />
          <Legend verticalAlign="top" align="right" iconType="circle" />
          
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="ratio" 
            name="Ratio Estético" 
            stroke="#06b6d4" 
            strokeWidth={4} 
            dot={{ r: 6, fill: '#06b6d4', strokeWidth: 2, stroke: '#0f172a' }} 
            activeDot={{ r: 8 }}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="peso" 
            name="Peso (kg)" 
            stroke="#818cf8" 
            strokeWidth={2} 
            strokeDasharray="5 5"
            dot={{ r: 4, fill: '#818cf8' }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}