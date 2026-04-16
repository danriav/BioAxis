"use client";

import { useState } from "react"; // Añadimos useState
import { motion } from "framer-motion";
import { ShieldCheck, Zap, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { getSupabaseClient } from "@/lib/supabase/client"; // Tu cliente Singleton

export default function LoginPage() {
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // INTENTO DE LOGIN REAL
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Error: " + error.message);
      setLoading(false);
    } else {
      // Si el login es exitoso, vamos al setup del perfil
      router.push(`/${locale}/profile/setup`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 overflow-hidden relative">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px]" />
      
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

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">ID de Usuario</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@bioaxis.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 mt-2 text-white outline-none focus:border-cyan-500 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Clave de Acceso</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 mt-2 text-white outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-4 rounded-2xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              <>
                Iniciar Protocolo 
                <ShieldCheck size={20} className="group-hover:rotate-12 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <span className="text-slate-500">¿Nuevo en la plataforma?</span>{" "}
          <button className="text-cyan-400 font-bold hover:underline">Registrar Biotipo</button>
        </div>
      </motion.div>
    </div>
  );
}