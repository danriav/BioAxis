"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon,Flame, Copy, Plus, Zap, UtensilsCrossed } from "lucide-react";
import { createBrowserClient } from '@supabase/ssr';
import { NutritionService } from "@/lib/nutrition-service";
import { FoodSearchModal } from "./FoodSearchModal";
import { CheckCircle2, MoreHorizontal, Trash2 } from "lucide-react";

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
  const defaultSlots = ["Desayuno", "Comida", "Cena", "Snacks"];
  const [slots, setSlots] = useState<string[]>(defaultSlots);

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
        
      if (error) {
        console.error("Error cargando logs:", error);
      } else {
        setMeals(data || []);
        // LOGICA BIO-INTELIGENTE: Extraer slots únicos de la BD y combinarlos con los por defecto
        if (data) {
          const dbSlots = Array.from(new Set(data.map(m => m.meal_slot)));
          const combinedSlots = Array.from(new Set([...defaultSlots, ...dbSlots]));
          setSlots(combinedSlots);
        }
      }
    }
  }, [selectedDate, supabase]);

  // Ejecutar carga inicial y cada vez que cambie la fecha
  useEffect(() => {
    fetchDailyLogs();
  }, [fetchDailyLogs]);

  const handleAddNewSlot = () => {
    const newSlotName = `Sesión ${slots.length + 1}`;
    setSlots([...slots, newSlotName]);
  };

  const handleRenameSlot = (oldName: string, newName: string) => {
    // Si el nombre ya existe, evitamos duplicados
    if (slots.includes(newName)) return alert("Ya existe una sesión con ese nombre");
    
    // Actualizamos el array de slots en el front
    const updatedSlots = slots.map(slot => slot === oldName ? newName : slot);
    setSlots(updatedSlots);

    // NOTA PARA EL FUTURO: Aquí eventualmente haremos un fetch(PUT) a FastAPI 
    // para actualizar el nombre en los registros existentes en la BD.
  };

  const handleDeleteSlot = (slotNameToDelete: string) => {
    // 1. Capa de Seguridad: Verificar si hay alimentos dentro
    const hasItems = meals.some(m => m.meal_slot === slotNameToDelete);
    
    if (hasItems) {
      const confirmDelete = window.confirm(
        `⚠️ ADVERTENCIA BIO-SISTEMA ⚠️\n\nEl slot "${slotNameToDelete}" tiene alimentos registrados.\nSi lo eliminas, los alimentos desaparecerán de la vista actual.\n\n¿Proceder con la eliminación?`
      );
      if (!confirmDelete) return;
    }

    // 2. Ejecutar la eliminación del estado del Frontend
    const updatedSlots = slots.filter(slot => slot !== slotNameToDelete);
    setSlots(updatedSlots);

    // NOTA FUTURA PARA EL BACKEND:
    // Si queremos que los registros se borren realmente de la base de datos, 
    // aquí llamaríamos a: NutritionService.deleteLogsBySlot(user.id, selectedDate, slotNameToDelete)
  };

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
    // CAMBIO IMPORTANTE: max-w-7xl para usar todo el ancho del PC, y fondo slate oscuro
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10 font-sans max-w-7xl mx-auto">
      
      {/* SECCIÓN 1: CALENDARIO */}
      <WeeklyCalendar 
        selectedDate={selectedDate} 
        onSelectDate={setSelectedDate} 
        streak={3} 
      />

      {/* SECCIÓN 2: MACROS GLOBALES */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Aquí van tus MacroCards actuales */}
        <MacroCard label="Calorías" value={Math.round(totals.kcal)} target="2100" color="bg-cyan-500" icon={<Zap size={14}/>} />
        <MacroCard label="Proteína" value={`${Math.round(totals.prot)}g`} target="160g" color="bg-magenta-500" />
        <MacroCard label="Carbos" value={`${Math.round(totals.carb)}g`} target="220g" color="bg-blue-500" />
        <MacroCard label="Grasas" value={`${Math.round(totals.fat)}g`} target="70g" color="bg-slate-400" />
      </section>

      {/* SECCIÓN 3: SLOTS DE COMIDA EN GRID */}
      {/* CAMBIO IMPORTANTE: grid-cols-1 para móvil, grid-cols-2 para PC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
        {slots.map((slot) => (
          <MealSlot 
            key={slot}
            title={slot} 
            logs={meals.filter(m => m.meal_slot === slot)} 
            onAdd={() => openSearch(slot)}
            onRename={handleRenameSlot}
            onDelete={handleDeleteSlot} 
          />
        ))}
      </div>
      {/* NUEVO BOTÓN PARA AGREGAR SLOTS */}
            <div className="mt-8">
              <button 
                onClick={handleAddNewSlot}
                className="w-full py-6 rounded-[1.5rem] border-2 border-dashed border-slate-800 text-slate-500 font-black italic uppercase tracking-widest hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all flex items-center justify-center gap-3 group"
              >
                <span className="text-2xl group-hover:scale-125 transition-transform">+</span>
                Añadir Nueva Comida
              </button>
            </div>
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

// --- NUEVO COMPONENTE: CALENDARIO SEMANAL ---
function WeeklyCalendar({ selectedDate, onSelectDate, streak = 0 }: any) {
  const getWeekDates = (baseDateStr: string) => {
    const baseDate = new Date(baseDateStr + "T12:00:00Z"); 
    const day = baseDate.getUTCDay();
    const diff = baseDate.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(baseDate);
    monday.setUTCDate(diff);
    const week = [];
    const dayNames = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM']; // Nombres más largos para PC
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      week.push({
        dateStr,
        dayName: dayNames[i],
        dayNumber: d.getUTCDate(),
        isSelected: dateStr === selectedDate
      });
    }
    return week;
  };

  const weekDays = getWeekDates(selectedDate);
  const isTodaySelected = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-[1.5rem] p-6 mb-8 backdrop-blur-sm">
      {/* Cabecera Superior */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black italic tracking-tighter text-white">BIO-PLAN</h2>
          <div className="h-4 w-px bg-white/20"></div>
          {/* Nueva Racha (Streak) estilo Tech */}
          <div className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1 rounded-md border border-cyan-500/20">
            <Zap size={16} className="text-cyan-400" />
            <span className="font-mono text-cyan-400 font-bold text-sm">{streak} DÍAS</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-white/5">
          <CalendarIcon size={16} className="text-slate-400" />
          <span className="font-mono font-bold text-sm text-slate-200">
            {isTodaySelected ? "HOY" : new Date(selectedDate + "T12:00:00Z").toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Días de la Semana (Diseño Desktop) */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, i) => (
          <button 
            key={i} 
            onClick={() => onSelectDate(day.dateStr)}
            className={`flex flex-col items-center gap-2 py-4 rounded-xl transition-all border-b-2 ${
              day.isSelected 
                ? "bg-slate-800/80 border-cyan-500 text-white shadow-[0_4px_20px_-10px_rgba(6,182,212,0.3)]" 
                : "border-transparent text-slate-500 hover:bg-slate-800/40 hover:text-slate-300"
            }`}
          >
            <span className="text-xs font-bold tracking-widest">{day.dayName}</span>
            <span className={`text-2xl font-black font-mono ${day.isSelected ? "text-cyan-400" : ""}`}>
              {day.dayNumber}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MealSlot({ title, logs, onAdd, onRename, onDelete }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);

  const slotTotals = logs.reduce((acc: any, log: any) => {
    const food = log.catalog_foods;
    const qty = log.quantity_g;
    if (!food) return acc;
    return {
      kcal: acc.kcal + (food.calories_per_g * qty),
      prot: acc.prot + (food.protein_per_g * qty),
      carb: acc.carb + (food.carbs_per_g * qty),
      fat: acc.fat + (food.fat_per_g * qty),
    };
  }, { kcal: 0, prot: 0, carb: 0, fat: 0 });

  const handleSaveRename = () => {
    setIsEditing(false);
    if (editValue.trim() !== "" && editValue !== title) {
      onRename(title, editValue.trim());
    } else {
      setEditValue(title); // Restaurar si lo dejó en blanco
    }
  };

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-[1.5rem] p-6 text-white flex flex-col h-full hover:border-cyan-500/20 transition-colors">
      
      {/* Cabecera del Slot (AHORA EDITABLE) */}
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5 min-h-[3rem]">
        {isEditing ? (
          <div className="flex items-center gap-2 w-full mr-4">
            <input 
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveRename}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
              className="bg-slate-950 border-b-2 border-cyan-500 text-white px-2 py-1 text-lg font-black italic uppercase tracking-widest outline-none w-full"
            />
            {/* BOTÓN DE ELIMINAR */}
            <button 
              // Usamos onMouseDown en lugar de onClick (explicación abajo)
              onMouseDown={(e) => { 
                e.preventDefault(); 
                onDelete(title); 
              }} 
              className="p-2 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-colors group/delete"
              title="Eliminar sesión"
            >
              <Trash2 size={20} className="group-hover/delete:scale-110 transition-transform" />
            </button>
          </div>
        ) : (
          <h3 
            onClick={() => setIsEditing(true)}
            title="Clic para editar o eliminar"
            className="text-lg font-black italic uppercase tracking-widest cursor-pointer hover:text-cyan-400 transition-colors flex items-center gap-3 group w-full"
          >
            {title}
            <span className="text-[10px] font-normal text-slate-500 bg-white/5 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              ✏️ Editar
            </span>
          </h3>
        )}

        {/* Mostramos las calorías solo si no estamos editando para dar espacio */}
        {!isEditing && (
          <div className="text-[10px] font-mono font-bold text-cyan-500 bg-cyan-500/10 px-2 py-1 rounded whitespace-nowrap">
            {Math.round(slotTotals.kcal)} KCAL
          </div>
        )}
      </div>

      {/* Resumen de Macros del Slot */}
      <div className="flex gap-4 text-xs font-mono text-slate-400 mb-6 bg-slate-950 p-3 rounded-xl border border-white/5">
        <div><span className="text-slate-500">P:</span> <span className="text-white">{Math.round(slotTotals.prot)}g</span></div>
        <div><span className="text-slate-500">C:</span> <span className="text-white">{Math.round(slotTotals.carb)}g</span></div>
        <div><span className="text-slate-500">G:</span> <span className="text-white">{Math.round(slotTotals.fat)}g</span></div>
      </div>

      {/* Lista de Alimentos (Igual que antes) */}
      <div className="space-y-2 mb-6 flex-1">
        {logs.length > 0 ? (
          logs.map((log: any, i: number) => {
            const food = log.catalog_foods;
            const itemKcal = Math.round(food.calories_per_g * log.quantity_g);
            return (
              <div key={i} className="flex justify-between items-center p-3 bg-slate-950/50 rounded-lg hover:bg-slate-800 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  <span className="font-medium text-sm text-slate-300 group-hover:text-white transition-colors uppercase tracking-wide">{food.name_es}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-slate-500">{log.quantity_g}g</span>
                  <span className="bg-slate-800 px-2 py-1 rounded text-slate-300">{itemKcal} kcal</span>
                </div>
              </div>
            );
          })
        ) : (
           <div className="h-full flex items-center justify-center border-2 border-dashed border-white/5 rounded-xl py-6">
              <span className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Sin Datos</span>
           </div>
        )}
      </div>

      <button 
        onClick={onAdd}
        className="w-full py-3 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-all border border-transparent hover:border-cyan-500/20"
      >
        + Añadir Alimento
      </button>
    </div>
  );
}