// src/app/[locale]/dashboard/metrics/page.tsx
"use client";

import { motion } from "framer-motion";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PerimeterAnalytics } from "@/components/dashboard/perimeter-analytics";

export default function MetricsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      
      {/* HEADER */}
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-4 mb-2">
            <Link 
              href="/es/dashboard" 
              className="p-2 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-3xl font-black tracking-tight italic uppercase">
              Laboratorio <span className="text-cyan-500">Bioaxis</span>
            </h1>
          </div>
          <p className="text-slate-500 flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest ml-12">
            <ShieldCheck size={14} className="text-cyan-500" />
            Análisis de Aislamiento Muscular
          </p>
        </motion.div>
        
        <div className="bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-2xl flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_#06b6d4]" />
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Métricas Detalladas Activas</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <PerimeterAnalytics />
        </motion.div>
      </main>

    </div>
  );
}