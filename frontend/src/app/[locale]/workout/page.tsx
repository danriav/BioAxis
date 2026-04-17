"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WorkoutLogger } from "@/components/workout/workout-logger";
import { MagicRoutineGenerator } from "@/components/workout/magic-routine-generator";
import { Dumbbell, Cpu } from "lucide-react"; // Asumiendo que usas lucide-react

export default function TrainingCenterPage() {
  const [activeTab, setActiveTab] = useState<"bio_dedicado" | "arquitecto">("bio_dedicado");

  // Recordar la preferencia del usuario
  useEffect(() => {
    const pref = localStorage.getItem("bioaxis_training_preference");
    if (pref === "arquitecto" || pref === "bio_dedicado") {
      setActiveTab(pref);
    }
  }, []);

  const handleTabChange = (tab: "bio_dedicado" | "arquitecto") => {
    setActiveTab(tab);
    localStorage.setItem("bioaxis_training_preference", tab);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      
      {/* HEADER DEL CENTRO DE ENTRENAMIENTO */}
      <header className="max-w-7xl mx-auto mb-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent italic uppercase">
            Laboratorio Biomecánico
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Diseño, generación y registro de hipertrofia.
          </p>
        </motion.div>
      </header>

      {/* SELECTOR DE MODO DE ENTRENAMIENTO */}
      <div className="max-w-7xl mx-auto px-4 pb-6">
        <div className="flex gap-6 border-b border-slate-800 pb-2">
          <button
            onClick={() => handleTabChange("bio_dedicado")}
            className={`pb-3 px-2 text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === "bio_dedicado" 
                ? "text-cyan-400 border-b-2 border-cyan-400" 
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Cpu size={18} className={activeTab === "bio_dedicado" ? "text-cyan-400" : ""} />
            Bio-Dedicado (IA)
          </button>
          
          <button
            onClick={() => handleTabChange("arquitecto")}
            className={`pb-3 px-2 text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === "arquitecto" 
                ? "text-blue-500 border-b-2 border-blue-500" 
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Dumbbell size={18} className={activeTab === "arquitecto" ? "text-blue-500" : ""} />
            Arquitecto (Manual)
          </button>
        </div>
      </div>

      {/* ÁREA DE TRABAJO DINÁMICA */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <AnimatePresence mode="wait">
          {activeTab === "bio_dedicado" && (
            <motion.section 
              key="bio" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="space-y-4"
            >
              <MagicRoutineGenerator />
            </motion.section>
          )}
          
          {activeTab === "arquitecto" && (
            <motion.section 
              key="arq" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="space-y-4"
            >
              <WorkoutLogger />
            </motion.section>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}