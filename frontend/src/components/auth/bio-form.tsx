"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Ruler, ArrowRight, ChevronLeft, Activity, Loader2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";

export function BioForm() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "es";

  const [formData, setFormData] = useState({
    genero: "",
    edad: "",
    peso: "",
    altura: "",
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
    setIsAnalyzing(true);
    const supabase = getSupabaseClient();

    try {
      if (!supabase) throw new Error("No se pudo conectar con el motor de datos");

      // 1. Obtener el usuario autenticado (Ruta Profesional)
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        alert("Sesión no válida. Por favor, inicia sesión nuevamente.");
        router.push(`/${locale}/login`);
        return;
      }

      // 2. Insertar en la Dimensión dim_atleta (SCD Tipo 2)
      // El Trigger en Supabase se encargará de poner is_current = false a los registros viejos
      const { error: insertError } = await supabase
        .from("dim_atleta")
        .insert({
          user_id: user.id,
          genero: formData.genero,
          edad: parseInt(formData.edad) || 0,
          peso: parseFloat(formData.peso) || 0,
          altura: parseFloat(formData.altura) || 0,
          hombros: parseFloat(formData.hombros) || 0,
          pecho: parseFloat(formData.pecho) || 0,
          brazo: parseFloat(formData.brazo) || 0,
          antebrazo: parseFloat(formData.antebrazo) || 0,
          cintura: parseFloat(formData.cintura) || 0,
          cadera: parseFloat(formData.cadera) || 0,
          gluteo: parseFloat(formData.gluteo) || 0,
          pierna: parseFloat(formData.pierna) || 0,
          pantorrilla: parseFloat(formData.pantorrilla) || 0,
          is_current: true
        });

      if (insertError) throw insertError;

      // 3. Efecto visual de procesamiento biomecánico
      await new Promise((resolve) => setTimeout(resolve, 3500));

      // Limpieza de datos locales antiguos si existieran
      localStorage.removeItem("userBioProfile");

      // Redirección al Dashboard para ver los resultados
      router.push(`/${locale}/dashboard`);

    } catch (error: any) {
      console.error("Error crítico de arquitectura:", error.message);
      alert("Error al sincronizar biometría: " + error.message);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[3rem] shadow-2xl relative">
      {/* Barra de Progreso */}
      <div className="flex justify-between mb-8 px-4">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className={`h-1.5 w-full mx-1 rounded-full transition-all duration-500 ${
              step >= i ? "bg-cyan-500 shadow-[0_0_10px_#06b6d4]" : "bg-slate-800"
            }`} 
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: -20, x: -20 }}
            className="space-y-6"
          >
            <header className="mb-8">
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter text-left">Fase 01: Perfil Biológico</h2>
              <p className="text-slate-500 text-sm text-left font-medium">Parámetros base para el cálculo de tasas metabólicas.</p>
            </header>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex gap-4">
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
              <Input label="Edad" name="edad" value={formData.edad} onChange={handleChange} placeholder="Años" type="number" />
              <Input label="Altura" name="altura" value={formData.altura} onChange={handleChange} placeholder="cm" type="number" />
              <div className="col-span-2">
                <Input label="Peso Actual" name="peso" value={formData.peso} onChange={handleChange} placeholder="kg" type="number" />
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: -20, x: -20 }}
            className="space-y-6"
          >
            <header className="mb-8 text-center">
              <div className="inline-block p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 mb-4">
                <Ruler className="text-cyan-500" />
              </div>
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Fase 02: Tren Superior</h2>
              <p className="text-slate-500 text-sm font-medium">Medición de estructura clavicular y muscular.</p>
            </header>

            <div className="grid grid-cols-2 gap-4 text-left">
              <Input label="Hombros" name="hombros" value={formData.hombros} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Pecho" name="pecho" value={formData.pecho} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Brazo" name="brazo" value={formData.brazo} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Antebrazo" name="antebrazo" value={formData.antebrazo} onChange={handleChange} placeholder="cm" type="number" />
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: -20, x: -20 }}
            className="space-y-6"
          >
            <header className="mb-8 text-center">
              <div className="inline-block p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 mb-4">
                <Activity className="text-indigo-500" />
              </div>
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Fase 03: Tren Inferior</h2>
              <p className="text-slate-500 text-sm font-medium">Determinación de base de apoyo y proporciones bajas.</p>
            </header>

            <div className="grid grid-cols-2 gap-4 text-left">
              <Input label="Cintura" name="cintura" value={formData.cintura} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Cadera" name="cadera" value={formData.cadera} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Glúteo" name="gluteo" value={formData.gluteo} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Pierna" name="pierna" value={formData.pierna} onChange={handleChange} placeholder="cm" type="number" />
              <div className="col-span-2">
                <Input label="Pantorrilla" name="pantorrilla" value={formData.pantorrilla} onChange={handleChange} placeholder="cm" type="number" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botones de Navegación */}
      <div className="flex justify-between mt-12 gap-4">
        {step > 1 && (
          <button
            type="button"
            onClick={prevStep}
            className="p-4 rounded-2xl border border-slate-800 text-slate-400 hover:bg-slate-800 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <button
          type="button"
          onClick={step === 3 ? handleFinalize : nextStep}
          className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
        >
          {step === 3 ? "GENERAR ESCANEO FINAL" : "CONTINUAR ESCANEO"}
          <ArrowRight size={20} />
        </button>
      </div>

      {/* Pantalla de Carga/Análisis (Overlay) */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
          >
            <div className="relative w-56 h-56 mb-12 flex items-center justify-center">
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }} 
                className="absolute inset-0 border-t-4 border-b-4 border-cyan-500 rounded-full shadow-[0_0_30px_#06b6d4]" 
              />
              <Activity className="w-16 h-16 text-cyan-500 animate-pulse" />
            </div>
            <div className="text-center">
              <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4">Sincronizando Biometría</h2>
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="text-cyan-500 animate-spin w-4 h-4" />
                <p className="text-cyan-500 font-mono text-[10px] tracking-[0.4em] uppercase">Arquitectura Kimball SCD2 Activa</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Componente Interno de Input para mantener el archivo limpio
function Input({ label, name, value, onChange, ...props }: any) {
  return (
    <div className="flex flex-col gap-2 group">
      <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2 group-focus-within:text-cyan-500 transition-colors">
        {label}
      </label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        {...props}
        className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-700"
      />
    </div>
  );
}