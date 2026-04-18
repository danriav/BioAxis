// src/app/[locale]/dashboard/update/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, ShieldCheck, Ruler } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function UpdateMetricsPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [baseData, setBaseData] = useState<any>(null);
  const [metrics, setMetrics] = useState({
    peso: "",
    hombros: "",
    pecho: "",
    brazo: "",
    antebrazo: "",
    cintura: "",
    cadera: "",
    gluteo: "",
    pierna: "",
    pantorrilla: ""
  });

  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "es";

  useEffect(() => {
    const fetchCurrent = async () => {
      const supabase = getSupabaseClient();
      
      // 🛑 EL FIX: Guardia para evitar el error de 'null'
      if (!supabase) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('dim_atleta')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (data?.[0]) {
          setBaseData(data[0]);
          setMetrics({
            peso: data[0].peso?.toString() || "",
            hombros: data[0].hombros?.toString() || "",
            pecho: data[0].pecho?.toString() || "",
            brazo: data[0].brazo?.toString() || "",
            antebrazo: data[0].antebrazo?.toString() || "",
            cintura: data[0].cintura?.toString() || "",
            cadera: data[0].cadera?.toString() || "",
            gluteo: data[0].gluteo?.toString() || "",
            pierna: data[0].pierna?.toString() || "",
            pantorrilla: data[0].pantorrilla?.toString() || ""
          });
        }
      }
      setLoading(false);
    };
    fetchCurrent();
  }, []);

  const handleSave = async () => {
    if (!metrics.peso) return alert("El peso es obligatorio.");
    
    setIsSaving(true);
    const supabase = getSupabaseClient();

    // 🛑 EL FIX: Otra guardia aquí para el guardado
    if (!supabase) {
      setIsSaving(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('dim_atleta')
      .insert({
        user_id: user?.id,
        genero: baseData.genero,
        edad: baseData.edad,
        altura: baseData.altura,
        peso: parseFloat(metrics.peso),
        hombros: parseFloat(metrics.hombros) || null,
        pecho: parseFloat(metrics.pecho) || null,
        brazo: parseFloat(metrics.brazo) || null,
        antebrazo: parseFloat(metrics.antebrazo) || null,
        cintura: parseFloat(metrics.cintura) || null,
        cadera: parseFloat(metrics.cadera) || null,
        gluteo: parseFloat(metrics.gluteo) || null,
        pierna: parseFloat(metrics.pierna) || null,
        pantorrilla: parseFloat(metrics.pantorrilla) || null,
        is_current: true
      });

    if (!error) {
      router.push(`/${locale}/dashboard`);
    } else {
      alert("Error al guardar: " + error.message);
      setIsSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-500"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <header className="max-w-3xl mx-auto mb-12 flex items-center justify-between gap-4">
        <button 
          onClick={() => router.back()} 
          className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 hover:text-white transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-right">
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">
            Nuevo Registro <span className="text-cyan-500">Biométrico</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Actualizando historial de evolución
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto space-y-8">
        <div className="bg-cyan-500/5 border border-cyan-500/20 p-8 rounded-[2.5rem] shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="text-cyan-500" size={24} />
            <h3 className="text-sm font-black uppercase tracking-[0.2em]">Masa Corporal Actual</h3>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-2 text-left">
              Peso en Kg (Obligatorio)
            </label>
            <input 
              type="number" 
              value={metrics.peso} 
              onChange={(e) => setMetrics({...metrics, peso: e.target.value})}
              className="bg-slate-950 border border-slate-800 p-5 rounded-2xl text-2xl font-black italic focus:border-cyan-500 outline-none transition-all"
              placeholder="00.0"
            />
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem]">
          <div className="flex items-center gap-3 mb-8">
            <Ruler className="text-slate-500" size={20} />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">Aislamiento Muscular (cm)</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {Object.keys(metrics).filter(k => k !== 'peso').map((key) => (
              <div key={key} className="flex flex-col gap-2 group text-left">
                <label className="text-[9px] uppercase font-black text-slate-600 tracking-widest group-focus-within:text-cyan-500 transition-colors ml-1">
                  {key}
                </label>
                <input 
                  type="number"
                  value={(metrics as any)[key]}
                  onChange={(e) => setMetrics({...metrics, [key]: e.target.value})}
                  className="bg-slate-950/50 border border-slate-800 p-3 rounded-xl text-white focus:border-cyan-500 outline-none text-sm transition-all"
                  placeholder="--"
                />
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving || !metrics.peso}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 py-5 rounded-[2rem] text-white font-black uppercase tracking-[0.3em] italic flex items-center justify-center gap-3 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Sincronizar Nuevo Registro</>}
        </button>
      </main>
    </div>
  );
}