"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Activity, Loader2, ShieldCheck } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { validateBiometrics } from "@/lib/utils/biometric-validator";

export function BioForm() {
  const [step, setStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "es";

  const [formData, setFormData] = useState({
    nombre: "",
    genero: "",
    fechaNacimiento: "", 
    altura: "",
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

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 🧠 FUNCIÓN PARA CALCULAR LA EDAD EXACTA
  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleFinalize = async () => {
    // --- 🛑 PROTOCOLO DE SINCERIDAD ---
    const errorMsg = validateBiometrics(formData);
    
    if (errorMsg) {
      alert(`⚠️ ERROR DE COHERENCIA: ${errorMsg}`);
      return; 
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

      // Calculamos la edad justo antes de enviar a la DB
      const edadCalculada = calculateAge(formData.fechaNacimiento);

      const { error: insertError } = await supabase
        .from("dim_atleta")
        .insert({
          user_id: user.id,
          genero: formData.genero,
          edad: edadCalculada, 
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

      // 🛑 EL FIX: Upsert para garantizar el guardado del nombre
      if (formData.nombre) {
        const { error: profileError } = await supabase
          .from("user_profiles")
          .upsert({ 
            user_id: user.id, 
            display_name: formData.nombre 
          }, { 
            onConflict: 'user_id' 
          });
          
        if (profileError) {
          console.error("Error al guardar el nombre en el perfil:", profileError);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      localStorage.removeItem("userBioProfile");
      router.push(`/${locale}/dashboard`);

    } catch (error: any) {
      console.error(error);
      alert("Error al sincronizar biometría: " + error.message);
      setIsAnalyzing(false);
    }
  };

  // VALIDADORES DE PASOS
  const isStep1Valid = formData.nombre && formData.genero && formData.fechaNacimiento && formData.altura;
  const isStep2Valid = formData.peso && parseFloat(formData.peso) > 0; 

  return (
    <div className="max-w-2xl mx-auto bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[3rem] shadow-2xl relative">
      
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
        
        {/* PASO 0: BIENVENIDA */}
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <header className="mb-8 text-center flex flex-col items-center">
              <div className="p-4 bg-cyan-500/10 rounded-full mb-6 text-cyan-400 border border-cyan-500/20">
                <Activity size={40} />
              </div>
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                Inicialización del <span className="text-cyan-500">Sistema</span>
              </h2>
              <p className="text-slate-400 text-sm font-medium mt-4 max-w-sm mx-auto leading-relaxed">
                Estás a punto de configurar tu Ecosistema BioAxis. Necesitamos datos precisos para calibrar tu motor de hipertrofia y generar rutinas milimétricas.
              </p>
            </header>

            <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-6 space-y-4 text-left">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">1</div>
                <p className="text-sm font-bold text-white uppercase tracking-widest">Estructura Base</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">2</div>
                <p className="text-sm font-bold text-white uppercase tracking-widest">Masa y Perímetros</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-500 border border-cyan-500/30 flex items-center justify-center text-xs font-bold">3</div>
                <p className="text-sm font-black text-cyan-500 uppercase tracking-widest italic">Sincronización Total</p>
              </div>
            </div>
            
            <div className="mt-8">
              <button
                type="button"
                onClick={nextStep}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 py-4 rounded-2xl text-white font-black flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all uppercase tracking-[0.2em]"
              >
                Comenzar Calibración <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {/* PASO 1: PERFIL BASE */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <header className="mb-8 text-left">
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                Estructura Base
              </h2>
              <p className="text-slate-500 text-sm font-medium mt-2">
                Datos inmutables para el cálculo estructural.
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
                  className={`flex-1 py-4 rounded-2xl border font-bold transition-all uppercase tracking-widest text-sm ${
                    formData.genero === "hombre" ? "border-cyan-500 bg-cyan-500/10 text-white" : "border-slate-800 text-slate-500 hover:border-slate-700 hover:text-white"
                  }`}
                >Hombre</button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, genero: "mujer" })}
                  className={`flex-1 py-4 rounded-2xl border font-bold transition-all uppercase tracking-widest text-sm ${
                    formData.genero === "mujer" ? "border-cyan-500 bg-cyan-500/10 text-white" : "border-slate-800 text-slate-500 hover:border-slate-700 hover:text-white"
                  }`}
                >Mujer</button>
              </div>

              <div className="text-left col-span-1">
                <Input label="Nacimiento" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} type="date" />
              </div>
              <div className="text-left col-span-1">
                <Input label="Altura Física" name="altura" value={formData.altura} onChange={handleChange} placeholder="Ej: 175 cm" type="number" />
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                disabled={!isStep1Valid}
                onClick={nextStep}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 py-4 rounded-2xl text-white font-black flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-[0.2em]"
              >
                Siguiente Fase <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {/* PASO 2: MASA Y PERÍMETROS */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <header className="mb-6 text-left flex flex-col items-start">
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Masa y Perímetros</h2>
              <p className="text-slate-500 text-sm font-medium text-left mt-2 block">
                {formData.nombre ? `${formData.nombre}, el` : "El"} peso es <b className="text-cyan-500">obligatorio</b> para generar rutinas equilibradas. Las medidas musculares nos ayudan a detectar desbalances (opcionales) y a generar rutinas personalizadas.
              </p>
            </header>

            <div className="bg-cyan-500/5 border border-cyan-500/30 p-6 rounded-[2rem] mb-6">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="text-cyan-500" size={20} />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Dato Requerido</h3>
              </div>
              <Input label="Peso Corporal" name="peso" value={formData.peso} onChange={handleChange} placeholder="Ej: 75 Kg" type="number" />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-900/50 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Perímetros Opcionales
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-left mt-6">
              <Input label="Hombros" name="hombros" value={formData.hombros} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Pecho" name="pecho" value={formData.pecho} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Brazo" name="brazo" value={formData.brazo} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Antebrazo" name="antebrazo" value={formData.antebrazo} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Cintura" name="cintura" value={formData.cintura} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Cadera" name="cadera" value={formData.cadera} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Glúteo" name="gluteo" value={formData.gluteo} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Pierna" name="pierna" value={formData.pierna} onChange={handleChange} placeholder="cm" type="number" />
              <Input label="Pantorrilla" name="pantorrilla" value={formData.pantorrilla} onChange={handleChange} placeholder="cm" type="number" />
            </div>
            
            <div className="flex flex-col-reverse md:flex-row justify-between mt-12 gap-4">
              <button
                type="button"
                disabled={!isStep2Valid}
                onClick={handleFinalize}
                className="p-4 rounded-2xl text-slate-400 font-bold hover:text-white hover:bg-slate-800 transition-all text-xs uppercase tracking-widest disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              >
                Saltar Perímetros
              </button>
              
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="p-4 rounded-2xl border border-slate-800 text-slate-400 hover:bg-slate-800 transition-all font-bold tracking-widest uppercase text-xs"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  disabled={!isStep2Valid}
                  onClick={handleFinalize}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 py-4 px-8 rounded-2xl text-white font-black flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-widest text-xs"
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" /> : "FINALIZAR PERFIL"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
          >
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-cyan-500 animate-spin mx-auto mb-6" />
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">
                Generando Ecosistema Alpha
              </h2>
              <p className="text-cyan-500 font-mono text-xs tracking-[0.2em] uppercase">Sincronizando biometría y calibres...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Input({ label, name, value, onChange, type, ...props }: any) {
  return (
    <div className="flex flex-col gap-2 group text-left">
      <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2 group-focus-within:text-cyan-500 transition-colors">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        {...props}
        className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-700 font-medium w-full"
        style={type === 'date' ? { colorScheme: 'dark' } : {}} 
      />
    </div>
  );
}