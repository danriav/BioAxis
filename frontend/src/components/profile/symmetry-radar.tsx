"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

const data = [
  { muscle: 'Hombros', value: 130, fullMark: 140 },
  { muscle: 'Pecho', value: 116, fullMark: 140 },
  { muscle: 'Brazo', value: 40.2 * 2.5, fullMark: 140 }, // Escalado para visualización
  { muscle: 'Pierna', value: 61 * 2, fullMark: 140 },
  { muscle: 'Pantorrilla', value: 36 * 3, fullMark: 140 },
  { muscle: 'Cintura', value: 82, fullMark: 140 },
];

export function SymmetryRadar() {
  return (
    <div className="h-[300px] w-full bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-slate-800 p-6">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Análisis de Simetría</h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="muscle" tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <Radar
            name="Usuario"
            dataKey="value"
            stroke="#06b6d4"
            fill="#06b6d4"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}