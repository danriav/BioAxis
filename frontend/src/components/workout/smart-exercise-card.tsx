"use client";

import { motion } from "framer-motion";
import { Layers, Repeat, Target, Timer, MessageSquare, HelpCircle } from "lucide-react";

const TooltipLabel = ({ text, tooltipText, icon: Icon, iconColor }: { text: string, tooltipText: string, icon: any, iconColor: string }) => (
  <div className="relative group/tooltip flex items-center gap-1 w-fit cursor-help">
    <label className="text-[9px] uppercase font-black text-slate-500 tracking-widest flex items-center gap-1">
      <Icon size={10} className={iconColor} /> {text}
    </label>
    <HelpCircle size={10} className="text-slate-600 group-hover/tooltip:text-cyan-400 transition-colors" />
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 w-48 p-2.5 bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded-xl shadow-2xl z-[100] text-center normal-case">
      {tooltipText}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
    </div>
  </div>
);

export function SmartExerciseCard({ exercise }: { exercise: any }) {
  return (
    <motion.div layout className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-6 hover:border-slate-700 transition-all group">
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-1">
          <h4 className="text-xl md:text-2xl font-black italic uppercase text-white tracking-tighter">{exercise.name_es}</h4>
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[9px] font-bold text-slate-400 uppercase tracking-tighter border border-slate-700">
            {exercise.biomechanical_bias || 'MID-RANGE'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 pt-6 border-t border-slate-800/50 items-start">
        <div className="flex flex-col gap-2">
          <TooltipLabel text="Series" icon={Layers} iconColor="text-cyan-500" tooltipText="Volumen prescrito." />
          <div className="bg-slate-950 border border-slate-800 rounded-xl py-3 text-sm font-black text-white text-center">{exercise.sets}</div>
        </div>
        <div className="flex flex-col gap-2">
          <TooltipLabel text="Reps" icon={Repeat} iconColor="text-cyan-500" tooltipText="Rango objetivo." />
          <div className="bg-slate-950 border border-slate-800 rounded-xl py-3 text-sm font-black text-white text-center">{exercise.reps}</div>
        </div>
        <div className="flex flex-col gap-2">
          <TooltipLabel text="RIR" icon={Target} iconColor="text-orange-500" tooltipText="Intensidad (Reps en reserva)." />
          <div className="bg-slate-950 border border-slate-800 rounded-xl py-3 text-sm font-black text-white text-center">RIR {exercise.rir}</div>
        </div>
        <div className="flex flex-col gap-2">
          <TooltipLabel text="Descanso" icon={Timer} iconColor="text-cyan-500" tooltipText="Recuperación de ATP." />
          <div className="bg-slate-950 border border-slate-800 rounded-xl py-3 text-sm font-black text-white text-center">{exercise.rest}s</div>
        </div>
        <div className="flex flex-col gap-2 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-1">
            <MessageSquare size={10} className="text-slate-500" />
            <label className="text-[9px] uppercase font-black text-slate-500 tracking-widest">Bio-Notas</label>
          </div>
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2 text-[10px] text-slate-400 italic leading-tight h-[46px] overflow-y-auto">
            {exercise.notes}
          </div>
        </div>
      </div>
    </motion.div>
  );
}