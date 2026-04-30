// src/components/auth/bio-form.tsx
"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Activity, Loader2, ShieldCheck, 
  Flame, Scale, TrendingUp 
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { validateBiometrics } from "@/lib/utils/biometric-validator";

export function BioForm() {
  const [step, setStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "es";

  // 1. Añadimos los nuevos campos al estado inicial
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
    pantorrilla: "",
    objetivo_metabolico: "mantenimiento", // Valor por defecto seguro
    dias_entrenamiento: 4 // Promedio ideal por defecto
  });

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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

      const edadCalculada = calculateAge(formData.fechaNacimiento);

      // 1. Apagar perfiles anteriores (Historial Clínico Perfecto SCD2)
      await supabase
        .from("dim_atleta")
        .update({ is_current: false, valid_to: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_current", true);

      // 2. Insertar nuevo perfil como el único activo
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
          objetivo_metabolico: formData.objetivo_metabolico,
          dias_entrenamiento_semana: formData.dias_entrenamiento,
          is_current: true
        });

      if (insertError) throw insertError;

      // 3. Guardar nombre en la sesión segura
      if (formData.nombre) {
        const { error: authUpdateError } = await supabase.auth.updateUser({
          data: { display_name: formData.nombre }
        });
        if (authUpdateError) console.warn("Aviso:", authUpdateError.message);
      }

      // 4. PROTOCOLO DE REDIRECCIÓN (La solución a tu pantalla de carga)
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Pausa para la UX
      localStorage.removeItem("userBioProfile");
      
      router.refresh(); // 💡 Forzamos a Next.js a limpiar la caché del servidor
      router.push(`/${locale}/dashboard`); // 💡 Lanzamos al usuario al Dashboard

    } catch (error: any) {
      console.error(error);
      alert("Error al sincronizar biometría: " + error.message);
      setIsAnalyzing(false); // Apagamos el loader si hay error
    }
  };

  const isStep1Valid = formData.nombre && formData.genero && formData.fechaNacimiento && formData.altura;
  const isStep2Valid = formData.peso && parseFloat(formData.peso) > 0; 

  return (
    <div className="max-w-2xl mx-auto bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[3rem] shadow-2xl relative">
      
      {/* 3. Actualizamos la barra de progreso a 4 pasos (0, 1, 2, 3) */}
      <div className="flex justify-between mb-8 px-4">
        {[0, 1, 2, 3].map((i) => (
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
                <p className="text-sm font-black text-cyan-500 uppercase tracking-widest italic">Directriz Metabólica</p>
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

        {/* PASO 1: PERFIL BASE (Se mantiene igual) */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <header className="mb-8 text-left">
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Estructura Base</h2>
              <p className="text-slate-500 text-sm font-medium mt-2">Datos inmutables para el cálculo estructural.</p>
            </header>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 text-left">
                <Input label="¿Cómo te llamas?" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Tu nombre" type="text" />
              </div>
              <div className="col-span-2 flex gap-4 mt-2 mb-2">
                <button type="button" onClick={() => setFormData({ ...formData, genero: "hombre" })} className={`flex-1 py-4 rounded-2xl border font-bold transition-all uppercase tracking-widest text-sm ${formData.genero === "hombre" ? "border-cyan-500 bg-cyan-500/10 text-white" : "border-slate-800 text-slate-500 hover:border-slate-700 hover:text-white"}`}>Hombre</button>
                <button type="button" onClick={() => setFormData({ ...formData, genero: "mujer" })} className={`flex-1 py-4 rounded-2xl border font-bold transition-all uppercase tracking-widest text-sm ${formData.genero === "mujer" ? "border-cyan-500 bg-cyan-500/10 text-white" : "border-slate-800 text-slate-500 hover:border-slate-700 hover:text-white"}`}>Mujer</button>
              </div>
              <div className="text-left col-span-1"><Input label="Nacimiento" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} type="date" /></div>
              <div className="text-left col-span-1"><Input label="Altura Física" name="altura" value={formData.altura} onChange={handleChange} placeholder="Ej: 175 cm" type="number" /></div>
            </div>
            <div className="mt-8 flex justify-end">
              <button type="button" disabled={!isStep1Valid} onClick={nextStep} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 py-4 rounded-2xl text-white font-black flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-[0.2em]">Siguiente Fase <ArrowRight size={20} /></button>
            </div>
          </motion.div>
        )}

        {/* PASO 2: MASA Y PERÍMETROS (Actualizamos botones para ir al Paso 3) */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <header className="mb-6 text-left flex flex-col items-start">
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Masa y Perímetros</h2>
              <p className="text-slate-500 text-sm font-medium text-left mt-2 block">
                {formData.nombre ? `${formData.nombre}, el` : "El"} peso es <b className="text-cyan-500">obligatorio</b> para generar rutinas equilibradas. Las medidas musculares nos ayudan a detectar desbalances (opcionales).
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
              <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-800"></div></div>
              <div className="relative flex justify-center"><span className="bg-slate-900/50 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Perímetros Opcionales</span></div>
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
              <button type="button" disabled={!isStep2Valid} onClick={nextStep} className="p-4 rounded-2xl text-slate-400 font-bold hover:text-white hover:bg-slate-800 transition-all text-xs uppercase tracking-widest disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400">Saltar Perímetros</button>
              <div className="flex gap-4">
                <button type="button" onClick={prevStep} className="p-4 rounded-2xl border border-slate-800 text-slate-400 hover:bg-slate-800 transition-all font-bold tracking-widest uppercase text-xs">Atrás</button>
                <button type="button" disabled={!isStep2Valid} onClick={nextStep} className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 py-4 px-8 rounded-2xl text-white font-black flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-widest text-xs">Siguiente Fase <ArrowRight size={16}/></button>
              </div>
            </div>
          </motion.div>
        )}

        {/* 4. EL NUEVO PASO 3: DIRECTRIZ METABÓLICA */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <header className="text-left flex flex-col items-start">
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Directriz Metabólica</h2>
              <p className="text-slate-500 text-sm font-medium text-left mt-2 block">
                Define tu objetivo termodinámico actual. Esto ajustará tus macros y el volumen de entrenamiento en el Sintetizador Alpha.
              </p>
            </header>

            {/* SELECCIÓN DE OBJETIVO */}
            <div className="space-y-3">
              <ObjectiveCard 
                title="Oxidación Lipídica" subtitle="Déficit Calórico" icon={Flame} color="text-rose-500" bg="bg-rose-500"
                selected={formData.objetivo_metabolico === 'deficit'}
                onClick={() => setFormData({...formData, objetivo_metabolico: 'deficit'})}
              />
              <ObjectiveCard 
                title="Recomposición" subtitle="Mantenimiento" icon={Scale} color="text-cyan-500" bg="bg-cyan-500"
                selected={formData.objetivo_metabolico === 'mantenimiento'}
                onClick={() => setFormData({...formData, objetivo_metabolico: 'mantenimiento'})}
              />
              <ObjectiveCard 
                title="Síntesis Muscular" subtitle="Superávit Calórico" icon={TrendingUp} color="text-emerald-500" bg="bg-emerald-500"
                selected={formData.objetivo_metabolico === 'superavit'}
                onClick={() => setFormData({...formData, objetivo_metabolico: 'superavit'})}
              />
            </div>

            {/* FRECUENCIA DE ENTRENAMIENTO */}
            <div className="text-left">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2 mb-3 block">
                Frecuencia de Entrenamiento (Días x Semana)
              </label>
              <div className="flex gap-2 justify-between">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setFormData({...formData, dias_entrenamiento: d})}
                    className={`flex-1 py-4 rounded-[1rem] font-black text-lg transition-all ${
                      formData.dias_entrenamiento === d 
                        ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                        : 'bg-slate-900/50 text-slate-500 border border-slate-800 hover:border-cyan-500/30 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between mt-12 gap-4">
              <button type="button" onClick={prevStep} className="p-4 rounded-2xl border border-slate-800 text-slate-400 hover:bg-slate-800 transition-all font-bold tracking-widest uppercase text-xs">
                Atrás
              </button>
              <button
                type="button"
                onClick={handleFinalize}
                className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 py-4 px-8 rounded-2xl text-white font-black flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-widest text-xs"
              >
                {isAnalyzing ? <Loader2 className="animate-spin" /> : "Sincronizar Ecosistema"}
              </button>
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
              <p className="text-cyan-500 font-mono text-xs tracking-[0.2em] uppercase">Sincronizando directriz metabólica...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Subcomponente reutilizable para los Inputs
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

// Subcomponente para las tarjetas de Objetivo
function ObjectiveCard({ title, subtitle, icon: Icon, selected, onClick, color, bg }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-5 rounded-[1.5rem] border transition-all text-left ${
        selected 
          ? `bg-slate-900 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)]` 
          : `bg-slate-950/40 border-slate-800 hover:border-slate-700`
      }`}
    >
      <div className={`p-3 rounded-xl ${selected ? `${bg}/10 ${color}` : 'bg-slate-900 text-slate-500'}`}>
        <Icon size={24} />
      </div>
      <div>
        <h4 className={`font-black italic uppercase tracking-wide ${selected ? 'text-white' : 'text-slate-400'}`}>{title}</h4>
        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${selected ? color : 'text-slate-600'}`}>{subtitle}</p>
      </div>
    </button>
  );
}