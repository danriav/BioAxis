// components/workout/SmartExerciseCard.tsx
import { useState } from "react";
import { CheckCircle2, Smile, Flame, Info } from "lucide-react";

export const SmartExerciseCard = ({ exercise }: { exercise: any }) => {
  const [weight, setWeight] = useState("");
  const [status, setStatus] = useState<'easy' | 'optimal' | 'hard' | null>(null);
  const [showTip, setShowTip] = useState(false);

  const getAdvice = () => {
    if (status === 'easy') return { msg: "¡Sube el peso! Agrega 2.5kg - 5kg la próxima vez.", color: "text-cyan-400" };
    if (status === 'optimal') return { msg: "Carga perfecta. Mantente aquí hasta completar el rango máximo.", color: "text-green-400" };
    if (status === 'hard') return { msg: "Límite alcanzado. No subas peso aún, enfócate en el control.", color: "text-amber-500" };
    return null;
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-[2rem] p-6 mb-6">
      {/* CABECERA */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-white text-xl font-black italic uppercase tracking-tight">{exercise.name}</h3>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
            Objetivo: <span className="text-cyan-500">{exercise.sets} series x {exercise.reps} reps</span>
          </p>
        </div>
        <button 
          onClick={() => setShowTip(!showTip)}
          className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <Info size={18} />
        </button>
      </div>

      {/* TIP DE APROXIMACIÓN */}
      {showTip && (
        <div className="bg-cyan-500/10 border border-cyan-500/20 p-3 rounded-xl mb-4 text-[10px] text-cyan-200 leading-relaxed italic">
          <strong>TIP BIOAXIS:</strong> Para elegir el peso, busca uno que te permita hacer las {exercise.reps.split('-')[1]} reps en la 1ra serie, pero que te obligue a bajar 1 o 2 en la última (ej. 8-7-6). Si haces todas iguales, pesa poco.
        </div>
      )}

      {/* INPUT DE PESO */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <p className="text-[10px] text-slate-500 uppercase font-black mb-2">Peso utilizado (kg)</p>
          <input 
            type="number" 
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="0.0"
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-2xl font-black text-white outline-none focus:border-cyan-500 transition-all"
          />
        </div>
      </div>

      {/* FEEDBACK DE ESFUERZO (LAS CARITAS) */}
      <p className="text-[10px] text-slate-500 uppercase font-black text-center mb-3">¿Cómo se sintió la carga?</p>
      <div className="flex justify-between gap-3">
        <button 
          onClick={() => setStatus('easy')}
          className={`flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${status === 'easy' ? 'bg-green-500/20 border-green-500' : 'bg-slate-950 border-slate-800'}`}
        >
          <CheckCircle2 className={status === 'easy' ? 'text-green-500' : 'text-slate-600'} />
          <span className="text-[8px] font-bold uppercase text-slate-500">Ligero</span>
        </button>

        <button 
          onClick={() => setStatus('optimal')}
          className={`flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${status === 'optimal' ? 'bg-yellow-500/20 border-yellow-500' : 'bg-slate-950 border-slate-800'}`}
        >
          <Smile className={status === 'optimal' ? 'text-yellow-500' : 'text-slate-600'} />
          <span className="text-[8px] font-bold uppercase text-slate-500">Óptimo</span>
        </button>

        <button 
          onClick={() => setStatus('hard')}
          className={`flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${status === 'hard' ? 'bg-red-500/20 border-red-500' : 'bg-slate-950 border-slate-800'}`}
        >
          <Flame className={status === 'hard' ? 'text-red-500' : 'text-slate-600'} />
          <span className="text-[8px] font-bold uppercase text-slate-500">Extremo</span>
        </button>
      </div>

      {/* VEREDICTO DINÁMICO */}
      {status && (
        <div className="mt-6 p-4 bg-slate-950 rounded-2xl border border-slate-800 animate-in fade-in slide-in-from-top-2">
          <p className={`text-[11px] font-black uppercase tracking-tighter text-center ${getAdvice()?.color}`}>
            {getAdvice()?.msg}
          </p>
        </div>
      )}
    </div>
  );
};