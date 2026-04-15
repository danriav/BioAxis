"use client";

import { useState } from "react";
import { TRAINING_DATA } from "@/data/training-programs";
import { ExerciseRow } from "@/components/workout/exercise-row";
import { Dumbbell, Sparkles, LayoutGrid } from "lucide-react";

export default function WorkoutPage() {
  const [days, setDays] = useState(5);
  const [activeDay, setActiveDay] = useState(0);
  const gender = "female"; // Esto luego vendrá de tu base de datos o estado global

  const currentProgram = TRAINING_DATA[gender][days];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-10">
      <header className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter">PROGRAMACIÓN <span className="text-cyan-500">BIOAXIS</span></h1>
          <p className="text-slate-500 font-medium">Algoritmo de optimización basado en {gender === 'female' ? 'Biotipo Femenino' : 'Biotipo Masculino'}</p>
        </div>

        {/* SELECTOR DE DÍAS */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl">
          {[3, 4, 5].map((d) => (
            <button
              key={d}
              onClick={() => { setDays(d); setActiveDay(0); }}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                days === d ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20" : "text-slate-400 hover:text-white"
              }`}
            >
              {d} Días
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* NAVEGACIÓN DÍAS SEMANALES */}
        <div className="lg:col-span-3 space-y-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Estructura de la semana</p>
          {currentProgram.map((day: any, idx: number) => (
            <button
              key={idx}
              onClick={() => setActiveDay(idx)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                activeDay === idx 
                ? "bg-cyan-500/10 border-cyan-500/50 text-white" 
                : "bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700"
              }`}
            >
              <span className="text-[9px] font-mono block mb-1 opacity-60">SESIÓN 0{idx + 1}</span>
              <span className="font-bold text-sm uppercase">{day.title}</span>
            </button>
          ))}
        </div>

        {/* LISTA DE EJERCICIOS */}
        <div className="lg:col-span-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 md:p-8 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-cyan-500/20 rounded-2xl text-cyan-400">
                <Dumbbell size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{currentProgram[activeDay].title}</h2>
                <p className="text-sm text-cyan-500/70 font-medium">Prioridad: {currentProgram[activeDay].focus}</p>
              </div>
            </div>

            <div className="space-y-1">
              {currentProgram[activeDay].exercises.map((ex: any, i: number) => (
                <ExerciseRow key={i} exercise={ex} />
              ))}
            </div>
          </div>
        </div>

        {/* PANEL DE BIOMECÁNICA (Lógica de especialización) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-[2.5rem]">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-cyan-400" /> Bio-Insights
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-400 leading-relaxed italic">
                  "Tu selección de ejercicios está optimizada para frecuencia <strong>{days === 5 ? 'alta' : 'media'}</strong>. Hemos priorizado el volumen en el tren inferior para maximizar tu potencial estético."
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}