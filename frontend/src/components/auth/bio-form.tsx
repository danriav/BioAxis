"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { validateBiometrics } from "@/lib/utils/biometric-validator";

export function BioForm() {
  const [step, setStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "es";

  const [formData, setFormData] = useState({
    preference: "bio_dedicado",
    nombre: "",
    genero: "",
    edad: "",
    peso: "",
    altura: "",
    timeBudget: "60",
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

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFinalize = async () => {
    // --- 🛑 PROTOCOLO DE SINCERIDAD BIOMECÁNICA ---
    const errorMsg = validateBiometrics(formData);
    
    if (errorMsg) {
      alert(`⚠️ ERROR DE COHERENCIA: ${errorMsg}`);
      return; // Bloqueamos el proceso antes de activar animaciones o Supabase
    }

    setIsAnalyzing(true);
    const supabase = getSupabaseClient();

    try {
      if (!supabase) throw new Error("No se pudo conectar con el motor de datos");

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        alert("Sesión no válida. Por favor, inicia sesión nuevamente.");
        router.push(`/${locale}/login`);
        return;
      }

      // 1. Insertar en la Dimensión dim_atleta (SCD Tipo 2)
      const { error: insertError } = await supabase
        .from("dim_atleta")
        .insert({
          user_id: user.id,
          genero: formData.genero,
          edad: parseInt(formData.edad) || 0,
          peso: parseFloat(formData.peso) || 0,
          altura: parseFloat(formData.altura) || 0,
          hombros: parseFloat(formData.hombros) || null,
          pecho: parseFloat(formData.pecho) || null,
          brazo: parseFloat(formData.brazo) || null,
          antebrazo: parseFloat(formData.antebrazo) || null,
          cintura: parseFloat(formData.cintura) || null,
          cadera: parseFloat(formData.cadera) || null,
          gluteo: parseFloat(formData.gluteo) || null,
          pierna: parseFloat(formData.pierna) || null,
          pantorrilla: parseFloat(formData.pantorrilla) || null,
          is_current: true
        });

      if (insertError) throw insertError;

      // 2. Actualizar el perfil del usuario
      await supabase
        .from("user_profiles")
        .update({ display_name: formData.nombre })
        .eq("user_id", user.id);

      // Efecto de "Pensado" de la IA
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // 3. Persistencia local y Navegación
      localStorage.removeItem("userBioProfile");
      localStorage.setItem("bioaxis_time_budget", formData.timeBudget);
      localStorage.setItem("bioaxis_training_preference", formData.preference);
      
      router.push(`/${locale}/dashboard`);

    } catch (error: any) {
      console.error(error);
      alert("Error al sincronizar biometría: " + error.message);
      setIsAnalyzing(false);
    }
  };

  const isStep1Valid = formData.nombre && formData.genero && formData.edad && formData.peso && formData.altura;

  return (
    <div className="max-w-2xl mx-auto bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[3rem] shadow-2xl relative">
      {/* Indicador de Progreso */}
      <div className="flex justify-between mb-8 px-4">
        {[0, 1, 2].map((i) => (
          <div 
            key={i} 
            className={`h-1.5 w-full mx-1 rounded-full transition-all duration-500 ${
              step >= i ? "bg-cyan-500 shadow-[0_0_10px_#06b6d4]" : "bg-slate-800"
            }`} 
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <header className="mb-8 text-left">
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                ¿Cómo prefieres entrenar?
              </h2>
              <p className="text-slate-500 text-sm font-medium mt-2">
                Define el nivel de asistencia de tu ecosistema.
              </p>
            </header>

            <div className="grid grid-cols-1 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, preference: "bio_dedicado" })}
                className={`flex flex-col items-start p-6 rounded-2xl border font-bold transition-all text-left ${
                  formData.preference === "bio_dedicado" ? "border-cyan-500 bg-cyan-500/10 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]" : "border-slate-800 text-slate-500 hover:border-slate-700"
                }`}
              >
                <span className="text-lg uppercase tracking-tight italic">Bio-Dedicado (IA Generativa)</span>
                <span className="text-xs font-medium text-slate-400 mt-1">Diseña estructuras cronométricas y biomecánicas con 1 clic.</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, preference: "arquitecto" })}
                className={`flex flex-col items-start p-6 rounded-2xl border font-bold transition-all text-left ${
                  formData.preference === "arquitecto" ? "border-cyan-500 bg-cyan-500/10 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]" : "border-slate-800 text-slate-500 hover:border-slate-700"
                }`}
              >
                <span className="text-lg uppercase tracking-tight italic">Arquitecto (Diseño Manual)</span>
                <span className="text-xs font-medium text-slate-400 mt-1">Control total. Organiza tu propio Planificador Semanal.</span>
              </button>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={nextStep}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all uppercase tracking-widest"
              >
                EMPEZAR PERFIL <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <header className="mb-8 text-left">
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                Hola, formemos tu Perfil Base
              </h2>
              <p className="text-slate-500 text-sm font-medium mt-2">
                Estos son los únicos datos que requerimos para configurar tu ecosistema.
              </p>
            </header>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 text-left">
                <Input label="¿Cómo te llamas?" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Tu nombre" type="text" />
              </div>
              
              <div className="col-span-2 flex gap-4 mt-2 mb-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, genero: "hombre" })}
                  className={`flex-1 py-4 rounded-2xl border font-bold transition-all ${
                    formData.genero === "hombre" ? "border-cyan-500 bg-cyan-500/10 text-white" : "border-slate-800 text-slate-500 hover:border-slate-700"
                  }`}
                >HOMBRE</button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, genero: "mujer" })}
                  className={`flex-1 py-4 rounded-2xl border font-bold transition-all ${
                    formData.genero === "mujer" ? "border-cyan-500 bg-cyan-500/10 text-white" : "border-slate-800 text-slate-500 hover:border-slate-700"
                  }`}
                >MUJER</button>
              </div>

              <div className="text-left">
                <Input label="Edad" name="edad" value={formData.edad} onChange={handleChange} placeholder="Años" type="number" />
              </div>
              <div className="text-left">
                <Input label="Altura" name="altura" value={formData.altura} onChange={handleChange} placeholder="cm" type="number" />
              </div>
              <div className="text-left col-span-2">
                <Input label="Peso Físico" name="peso" value={formData.peso} onChange={handleChange} placeholder="Kg" type="number" />
              </div>
              
              <div className="col-span-2 mt-4 text-left">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2 block">
                  Presupuesto de Tiempo (Diario)
                </label>
                <div className="flex bg-slate-950/50 p-2 rounded-2xl border border-slate-800">
                  {["45", "60", "75", "90"].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setFormData({ ...formData, timeBudget: mins })}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                        formData.timeBudget === mins ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                disabled={!isStep1Valid}
                onClick={nextStep}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all disabled:opacity-50 disabled:shadow-none uppercase tracking-widest"
              >
                CONTINUAR <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <header className="mb-8 text-left flex flex-col items-start">
              <div className="inline-block p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 mb-4">
                <Sparkles className="text-cyan-400" />
              </div>
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Perímetros Estéticos (Opcional)</h2>
              <p className="text-slate-500 text-sm font-medium text-left mt-2 block">
                {formData.nombre ? `${formData.nombre}, ingresar` : "Ingresar"} estas medidas nos ayudará a calcular tus Ratios y detectar desbalances.
              </p>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              <Input label="Hombros" name="hombros" value={formData.hombros} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Pecho" name="pecho" value={formData.pecho} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Brazo" name="brazo" value={formData.brazo} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Antebrazo" name="antebrazo" value={formData.antebrazo} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Cintura" name="cintura" value={formData.cintura} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Cadera" name="cadera" value={formData.cadera} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Glúteo" name="gluteo" value={formData.gluteo} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Pierna" name="pierna" value={formData.pierna} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Pantorr" name="pantorrilla" value={formData.pantorrilla} onChange={handleChange} placeholder="cm" type="number" />
            </div>
            
            <div className="flex flex-col-reverse md:flex-row justify-between mt-12 gap-4">
              <button
                type="button"
                onClick={handleFinalize}
                className="p-4 rounded-2xl text-slate-400 font-bold hover:text-white hover:bg-slate-800 transition-all text-xs uppercase tracking-widest"
              >
                Saltar por ahora
              </button>
              
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="p-4 rounded-2xl border border-slate-800 text-slate-400 hover:bg-slate-800 transition-all font-bold tracking-widest uppercase text-xs"
                >
                  ATRÁS
                </button>
                <button
                  type="button"
                  onClick={handleFinalize}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 py-4 px-8 rounded-2xl text-white font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all uppercase tracking-widest text-xs"
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" /> : "FINALIZAR PERFIL"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pantalla de Carga/Análisis */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
          >
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-cyan-500 animate-spin mx-auto mb-6" />
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">
                Preparando tu Ecosistema, {formData.nombre || "Atleta"}
              </h2>
              <p className="text-cyan-500 font-mono text-xs tracking-[0.2em] uppercase">Sincronizando perfiles...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Input({ label, name, value, onChange, ...props }: any) {
  return (
    <div className="flex flex-col gap-2 group text-left">
      <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2 group-focus-within:text-cyan-500 transition-colors">
        {label}
      </label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        {...props}
        className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-700 font-medium w-full"
      />
    </div>
  );
}