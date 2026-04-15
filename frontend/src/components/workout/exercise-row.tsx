import { Info } from "lucide-react";

export function ExerciseRow({ exercise }: { exercise: any }) {
  return (
    <div className="flex items-center justify-between py-5 border-b border-slate-800/50 last:border-0 hover:bg-slate-900/30 px-4 transition-all rounded-xl group">
      <div className="flex flex-col gap-1">
        <h4 className="text-white font-bold group-hover:text-cyan-400 transition-colors">{exercise.name}</h4>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {exercise.muscle}
          </span>
          {exercise.focus && (
            <span className="text-[10px] text-cyan-500/80 italic">Enfoque: {exercise.focus}</span>
          )}
        </div>
      </div>
      
      <div className="flex gap-6 text-right items-center">
        <div className="flex flex-col min-w-[40px]">
          <span className="text-[9px] font-bold text-slate-600 uppercase">Sets</span>
          <span className="text-sm font-black text-white">{exercise.sets}</span>
        </div>
        <div className="flex flex-col min-w-[60px]">
          <span className="text-[9px] font-bold text-slate-600 uppercase">Reps</span>
          <span className="text-sm font-black text-white">{exercise.reps}</span>
        </div>
        <div className="flex flex-col min-w-[30px]">
          <span className="text-[9px] font-bold text-orange-500 uppercase">RIR</span>
          <span className="text-sm font-black text-orange-400">{exercise.rir}</span>
        </div>
        <div className="flex flex-col min-w-[60px] hidden md:flex">
          <span className="text-[9px] font-bold text-slate-600 uppercase">Descanso</span>
          <span className="text-xs font-medium text-slate-400">{exercise.rest}</span>
        </div>
      </div>
    </div>
  );
}