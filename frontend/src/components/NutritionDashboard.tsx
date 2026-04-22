"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Calendar, Copy, Plus, Zap, UtensilsCrossed } from "lucide-react";
import { createBrowserClient } from '@supabase/ssr';
import { NutritionService } from "@/lib/nutrition-service";
import { FoodSearchModal } from "./FoodSearchModal";

export function NutritionDashboard() {
  // 1. Inicialización del Cliente Supabase (SSR)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 2. Estados Globales del Dashboard
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState("");
  const [meals, setMeals] = useState<any[]>([]);

  // 3. Función para recuperar registros de la base de datos
  const fetchDailyLogs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('nutrition_logs')
        .select(`
          *,
          catalog_foods (
            name_es,
            calories_per_g,
            protein_per_g,
            carbs_per_g,
            fat_per_g
          )
        `)
        .eq('user_id', user.id)
        .eq('consumed_at', selectedDate);
        
      if (error) console.error("Error cargando logs:", error);
      else setMeals(data || []);
    }
  }, [selectedDate, supabase]);

  // Ejecutar carga inicial y cada vez que cambie la fecha
  useEffect(() => {
    fetchDailyLogs();
  }, [fetchDailyLogs]);

  // 4. Calculadora de Totales Dinámicos
  const totals = meals.reduce((acc, item) => {
    const food = item.catalog_foods;
    const qty = item.quantity_g;
    if (!food) return acc;
    return {
      kcal: acc.kcal + (food.calories_per_g * qty),
      prot: acc.prot + (food.protein_per_g * qty),
      carb: acc.carb + (food.carbs_per_g * qty),
      fat: acc.fat + (food.fat_per_g * qty),
    };
  }, { kcal: 0, prot: 0, carb: 0, fat: 0 });

  // 5. Manejadores de Interfaz
  const openSearch = (slot: string) => {
    setActiveSlot(slot);
    setIsModalOpen(true);
  };

  const handleSyncYesterday = async () => {
    setIsSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("Debes iniciar sesión");

      const yesterday = new Date(selectedDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const sourceDate = yesterday.toISOString().split('T')[0];
      
      await NutritionService.syncYesterdayPlan(user.id, sourceDate, selectedDate);
      await fetchDailyLogs(); // Recargar datos tras la sincronización
      alert("Plan del día anterior clonado con éxito 🚀");
    } catch (error) {
      console.error(error);
      alert("Error al sincronizar");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans">
      
      {/* --- SECCIÓN 1: HEADER & CALENDARIO --- */}
      <header className="flex flex-col md:flex-row items-center justify-between mb-8 bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl gap-4">
        <div className="flex items-center gap-4">
          <Calendar className="text-cyan-500" size={24} />
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border-none text-xl font-black uppercase tracking-tighter outline-none cursor-pointer focus:text-cyan-400 transition-colors"
          />
        </div>
        
        <button 
          onClick={handleSyncYesterday}
          disabled={isSyncing}
          className="flex items-center gap-2 bg-white/5 hover:bg-cyan-500 hover:text-slate-950 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 group disabled:opacity-50"
        >
          {isSyncing ? <span className="animate-pulse tracking-tighter">Sincronizando...</span> : (
            <>
              <Copy size={14} className="group-hover:rotate-12 transition-transform" />
              Clonar Plan Anterior
            </>
          )}
        </button>
      </header>

      {/* --- SECCIÓN 2: TARJETAS DE MACROS (DINÁMICAS) --- */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <MacroCard label="Calorías" value={Math.round(totals.kcal)} target="2100" color="bg-cyan-500" icon={<Zap size={14}/>} />
        <MacroCard label="Proteína" value={`${Math.round(totals.prot)}g`} target="160g" color="bg-magenta-500" icon={<UtensilsCrossed size={14}/>} />
        <MacroCard label="Carbos" value={`${Math.round(totals.carb)}g`} target="220g" color="bg-blue-500" />
        <MacroCard label="Grasas" value={`${Math.round(totals.fat)}g`} target="70g" color="bg-slate-400" />
      </section>

      {/* --- SECCIÓN 3: SLOTS DE COMIDA --- */}
      <div className="space-y-6">
        {["Desayuno", "Comida", "Cena", "Snacks"].map((slot) => (
          <MealSlot 
            key={slot}
            title={slot} 
            // Filtramos los registros de meals que pertenecen a este slot
            foods={meals
              .filter(m => m.meal_slot === slot)
              .map(m => ({
                name: m.catalog_foods?.name_es || "Cargando...",
                weight: m.quantity_g
              }))
            } 
            onAdd={() => openSearch(slot)}
          />
        ))}

        <button className="w-full py-8 border-2 border-dashed border-slate-800 rounded-[3rem] text-slate-500 flex items-center justify-center gap-2 hover:border-cyan-500/50 hover:text-cyan-500 transition-all group">
          <Plus size={20} className="group-hover:scale-125 transition-transform" />
          <span className="font-black uppercase italic text-xs tracking-[0.2em]">Configurar Nuevos Slots</span>
        </button>
      </div>

      {/* --- MODAL DE BÚSQUEDA --- */}
      <FoodSearchModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        slotName={activeSlot}
        onAdded={async (food: any, weight: number) => {
            console.log("🚀 Botón presionado. Iniciando guardado..."); // DEBUG 1
            try {
              const { data: { user } } = await supabase.auth.getUser();
              console.log("👤 Usuario detectado:", user?.id); // DEBUG 2
              if (!user) {
                alert("Sesión no detectada. ¡Inicia sesión en Supabase!");
                return;
              }
              console.log("📡 Enviando a Python..."); // DEBUG 3

              await NutritionService.addFoodLog({
                  user_id: user.id,
                  food_id: food.id,
                  meal_slot: activeSlot,
                  quantity_g: weight,
                  target_date: selectedDate
              });

              setIsModalOpen(false);
              await fetchDailyLogs(); // 🔥 Actualización instantánea sin recargar
            } catch (error) {
              alert("Error al conectar con el Bio-Motor");
            }
        }}
      />
    </div>
  );
}

// --- SUB-COMPONENTES AUXILIARES ---

function MacroCard({ label, value, target, color, icon }: any) {
  const percentage = Math.min((parseFloat(value) / parseFloat(target)) * 100, 100);

  return (
    <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[2.5rem] shadow-inner relative overflow-hidden group">
      <div className="flex justify-between items-start mb-3 relative z-10">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">{label}</span>
        <div className="p-2 bg-slate-950 rounded-lg">{icon}</div>
      </div>
      <div className="text-3xl font-black italic tracking-tighter mb-4">
        {value} <span className="text-[10px] text-slate-600 font-normal not-italic uppercase tracking-widest ml-1">/ {target}</span>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color} shadow-[0_0_15px_rgba(6,182,212,0.4)]`} 
        />
      </div>
    </div>
  );
}

function MealSlot({ title, foods, onAdd }: any) {
  return (
    <div className="group bg-slate-900/20 border border-white/5 hover:border-cyan-500/20 rounded-[2.5rem] p-8 transition-all hover:bg-slate-900/30">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white/90 group-hover:text-cyan-400 transition-colors">{title}</h3>
        <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/20 to-transparent mx-6 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="space-y-4 mb-8">
        {foods.length > 0 ? (
          foods.map((food: any, i: number) => (
            <div key={i} className="flex justify-between items-center text-sm text-slate-400 py-3 border-b border-white/5 last:border-0 italic hover:text-white transition-colors">
              <span className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/50" />
                {food.name}
              </span>
              <span className="text-[10px] font-mono bg-slate-950 px-2 py-1 rounded border border-white/5">{food.weight}G</span>
            </div>
          ))
        ) : (
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-700 italic py-2">Sin registros para esta sesión</p>
        )}
      </div>

      <button 
        onClick={onAdd}
        className="w-full py-4 rounded-2xl border border-dashed border-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] hover:border-cyan-500/50 hover:text-cyan-500 transition-all flex items-center justify-center gap-3 group/btn"
      >
        <Plus size={14} className="group-hover/btn:rotate-90 transition-transform" />
        Registrar Alimento
      </button>
    </div>
  );
}