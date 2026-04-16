"use client";

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area 
} from 'recharts';

// He seleccionado hitos clave de tus datos para la gráfica
const data = [
  { fecha: '22/03', peso: 76, vtaper: 1.40, hombros: 116 },
  { fecha: '18/07', peso: 78.1, vtaper: 1.51, hombros: 123 },
  { fecha: '17/08', peso: 80, vtaper: 1.54, hombros: 125.5 },
  { fecha: '21/09', peso: 83.3, vtaper: 1.56, hombros: 126.5 },
  { fecha: '11/12', peso: 84.6, vtaper: 1.59, hombros: 129 },
  { fecha: '27/03', peso: 84.3, vtaper: 1.59, hombros: 130 },
];

export function EvolutionChart() {
  return (
    <div className="h-[400px] w-full bg-slate-900/40 backdrop-blur-md rounded-[3rem] border border-slate-800 p-8 shadow-2xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight italic uppercase">Análisis de Progreso Anual</h3>
          <p className="text-xs text-slate-500 font-medium">Métricas: Masa Corporal vs. Estética (V-Taper)</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-cyan-500 italic">1.59</span>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Current V-Ratio</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis 
            dataKey="fecha" 
            stroke="#64748b" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          {/* Eje Izquierdo para el Ratio V-Taper */}
          <YAxis 
            yAxisId="left" 
            domain={[1.3, 1.7]} 
            stroke="#06b6d4" 
            fontSize={12} 
            axisLine={false} 
            tickLine={false} 
          />
          {/* Eje Derecho para el Peso */}
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            domain={[70, 90]} 
            stroke="#818cf8" 
            fontSize={12} 
            axisLine={false} 
            tickLine={false} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '1.5rem', fontSize: '12px' }}
          />
          <Legend verticalAlign="top" align="right" iconType="circle" />
          
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="vtaper" 
            name="V-Taper (H/C)" 
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