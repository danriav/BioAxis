"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Ruler, ArrowRight, ChevronLeft, Activity } from "lucide-react";

export function BioForm() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "es";

  const [formData, setFormData] = useState({
    genero: "", edad: "", peso: "", altura: "",
    hombros: "", pecho: "", brazo: "", antebrazo: "",
    cintura: "", cadera: "", gluteo: "", pierna: "", pantorrilla: ""
  });

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFinalize = async () => {
    setIsAnalyzing(true);
    // Simulación de procesamiento
    await new Promise((resolve) => setTimeout(resolve, 3500));
    localStorage.setItem("userBioProfile", JSON.stringify(formData));
    router.push(`/${locale}/dashboard`);
  }; // <--- Esta llave es la que probablemente faltaba o estaba mal puesta

  return (
    <div className="max-w-2xl mx-auto bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[3rem] shadow-2xl relative">
      {/* Indicador de Progreso */}
      <div className="flex justify-between mb-8 px-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 w-full mx-1 rounded-full ${step >= i ? "bg-cyan-500 shadow-[0_0_10px_#06b6d4]" : "bg-slate-800"}`} />
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
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Perfil Biológico</h2>
              <p className="text-slate-500 text-sm">Datos base para el cálculo metabólico.</p>
            </header>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, genero: 'hombre'})}
                  className={`flex-1 py-4 rounded-2xl border transition-all ${formData.genero === 'hombre' ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-slate-800 text-slate-500'}`}
                >Hombre</button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, genero: 'mujer'})}
                  className={`flex-1 py-4 rounded-2xl border transition-all ${formData.genero === 'mujer' ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-slate-800 text-slate-500'}`}
                >Mujer</button>
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
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Escaneo de Tren Superior</h2>
              <p className="text-slate-500 text-sm">Medidas clave para el ratio V-Taper.</p>
            </header>
            
            <div className="grid grid-cols-2 gap-4 text-left">
              <Input label="Hombros" name="hombros" value={formData.hombros} onChange={handleChange} placeholder="cm" />
              <Input label="Pecho" name="pecho" value={formData.pecho} onChange={handleChange} placeholder="cm" />
              <Input label="Brazo" name="brazo" value={formData.brazo} onChange={handleChange} placeholder="cm" />
              <Input label="Antebrazo" name="antebrazo" value={formData.antebrazo} onChange={handleChange} placeholder="cm" />
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
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Escaneo de Tren Inferior</h2>
              <p className="text-slate-500 text-sm">Determinación de potencia y simetría.</p>
            </header>
            
            <div className="grid grid-cols-2 gap-4 text-left">
              <Input label="Cintura" name="cintura" value={formData.cintura} onChange={handleChange} placeholder="cm" />
              <Input label="Cadera" name="cadera" value={formData.cadera} onChange={handleChange} placeholder="cm" />
              <Input label="Glúteo" name="gluteo" value={formData.gluteo} onChange={handleChange} placeholder="cm" />
              <Input label="Pierna" name="pierna" value={formData.pierna} onChange={handleChange} placeholder="cm" />
              <div className="col-span-2">
                <Input label="Pantorrilla" name="pantorrilla" value={formData.pantorrilla} onChange={handleChange} placeholder="cm" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navegación */}
      <div className="flex justify-between mt-12 gap-4">
        {step > 1 && (
          <button 
            type="button"
            onClick={prevStep} 
            className="p-4 rounded-2xl border border-slate-800 text-slate-400 hover:bg-slate-800 transition-all"
          >
            <ChevronLeft />
          </button>
        )}
        <button 
          type="button"
          onClick={step === 3 ? handleFinalize : nextStep}
          className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
        >
          {step === 3 ? "GENERAR PERFIL BIOMECÁNICO" : "SIGUIENTE ESCANEO"} 
          <ArrowRight size={18} />
        </button>
      </div>

      {/* OVERLAY DE ANÁLISIS */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
          >
            <div className="relative w-48 h-48 mb-12">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-t-2 border-b-2 border-cyan-500 rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity className="w-12 h-12 text-cyan-500 animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">Analizando Estructura</h2>
              <p className="text-cyan-500 font-mono text-xs tracking-[0.3em] uppercase">Sincronizando Ratios Biomecánicos...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Input({ label, name, value, onChange, ...props }: any) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-2">{label}</label>
      <input 
        name={name} value={value} onChange={onChange} {...props}
        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-700"
      />
    </div>
  );
}