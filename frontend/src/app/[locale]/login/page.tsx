"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Zap } from "lucide-react";
import Link from "next/link"; // Importamos Link
import { useLocale } from "next-intl"; // Importamos useLocale

export default function LoginPage() {
  const locale = useLocale(); // Obtenemos el idioma actual (es o en)

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 overflow-hidden relative">
      {/* Decoración de fondo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-10 rounded-[40px] shadow-2xl z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-6 shadow-lg shadow-cyan-500/20">
            <Zap className="text-slate-950" size={32} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">BIOAXIS</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium italic">"Optimize your biological potential"</p>
        </div>

        {/* Cambiamos el <form> por un div o simplemente manejamos el link si no hay validación real aún */}
        <div className="space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">ID de Usuario</label>
            <input 
              type="email" 
              placeholder="nombre@bioaxis.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 mt-2 text-white outline-none focus:border-cyan-500 transition-all placeholder:text-slate-700"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Clave de Acceso</label>
            <input 
              type="password" 
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 mt-2 text-white outline-none focus:border-cyan-500 transition-all placeholder:text-slate-700"
            />
          </div>

          {/* BOTÓN CON ENLACE REAL */}
          <Link 
            href={`/${locale}/profile/setup`}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-4 rounded-2xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 group"
          >
            Iniciar Protocolo 
            <ShieldCheck size={20} className="group-hover:rotate-12 transition-transform" />
          </Link>
        </div>

        <div className="mt-8 text-center text-sm">
          <span className="text-slate-500">¿Nuevo en la plataforma?</span>{" "}
          <button className="text-cyan-400 font-bold hover:underline">Registrar Biotipo</button>
        </div>
      </motion.div>
    </div>
  );
}