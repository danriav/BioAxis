"use client";
import { useState, useMemo } from "react";
import { Search, X, ChevronRight, Loader2, AlertCircle, Zap, Activity, Droplet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NutritionService } from "@/lib/nutrition-service";

export function FoodSearchModal({ isOpen, onClose, slotName, onAdded }: any) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [grams, setGrams] = useState(100);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // 1. MOTOR DE BÚSQUEDA (Case-Insensitive manejado por Backend)
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const data = await NutritionService.searchFood(query);
      setResults(data);
    } catch (error) {
      console.error("Error en la Bio-Base:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. CÁLCULOS BIOMÉTRICOS EN TIEMPO REAL
  // Usamos useMemo para que el cálculo sea instantáneo al escribir los gramos
  const analysis = useMemo(() => {
    if (!selectedFood) return null;
    const factor = grams / 100;
    return {
      kcal: (selectedFood.calories_per_g * 100 * factor).toFixed(0),
      protein: (selectedFood.protein_per_g * 100 * factor).toFixed(1),
      carbs: (selectedFood.carbs_per_g * 100 * factor).toFixed(1),
      fat: (selectedFood.fat_per_g * 100 * factor).toFixed(1),
      // Ejemplo de micronutrientes
      potasio: (selectedFood.potassium_mg * 100 * factor).toFixed(0),
      vitC: (selectedFood.vitamin_c_mg * 100 * factor).toFixed(0),
    };
  }, [selectedFood, grams]);

  const handleConfirm = () => {
    onAdded(selectedFood, grams);
    resetAndClose();
  };

  const resetAndClose = () => {
    setSelectedFood(null);
    setResults([]);
    setQuery("");
    setSearched(false);
    setGrams(100);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8">
          {selectedFood ? (
            /* --- VISTA 2: ANALIZADOR DETALLADO --- */
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <header className="flex justify-between items-start">
                <div>
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                    {selectedFood.name_es}
                  </h3>
                  <p className="text-cyan-500 font-bold text-xs uppercase tracking-[0.3em]">
                    Variante: {selectedFood.variant || "Estándar"}
                  </p>
                </div>
                <button onClick={() => setSelectedFood(null)} className="p-2 bg-white/5 rounded-full"><X size={20}/></button>
              </header>

              {/* SELECTOR DE PORCIÓN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-slate-950/50 p-6 rounded-[2rem] border border-white/5">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Cantidad Manual (g)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={grams}
                      onChange={(e) => setGrams(Number(e.target.value))}
                      className="w-full bg-slate-900 border-2 border-cyan-500/20 rounded-2xl py-4 px-6 text-2xl font-black text-white focus:border-cyan-500 outline-none transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-black italic">GRS</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Porciones Bio-Predefinidas</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setGrams(100)}
                      className="flex-1 py-2 bg-white/5 hover:bg-cyan-500/20 rounded-xl text-[10px] font-bold uppercase transition-all border border-white/5"
                    >
                      100g
                    </button>
                    {selectedFood.default_portion_grams && (
                      <button 
                        onClick={() => setGrams(selectedFood.default_portion_grams)}
                        className="flex-1 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-xl text-[10px] font-bold uppercase transition-all border border-cyan-500/20"
                      >
                        1 Unidad ({selectedFood.default_portion_grams}g)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* GRID DE NUTRIENTES DINÁMICOS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <NutrientCard label="Calorías" value={analysis?.kcal} unit="kcal" color="text-white" icon={<Zap size={12}/>}/>
                <NutrientCard label="Proteína" value={analysis?.protein} unit="g" color="text-magenta-500" icon={<Activity size={12}/>}/>
                <NutrientCard label="Carbos" value={analysis?.carbs} unit="g" color="text-cyan-500"/>
                <NutrientCard label="Grasas" value={analysis?.fat} unit="g" color="text-yellow-500"/>
              </div>

              {/* MICRONUTRIENTES */}
              <div className="bg-white/5 p-4 rounded-2xl flex justify-around border border-white/5">
                <div className="text-center">
                  <p className="text-[8px] uppercase text-slate-500 font-black">Potasio (K+)</p>
                  <p className="text-sm font-mono text-slate-300">{analysis?.potasio}mg</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-[8px] uppercase text-slate-500 font-black">Vit. C</p>
                  <p className="text-sm font-mono text-slate-300">{analysis?.vitC}mg</p>
                </div>
              </div>

              <button 
                onClick={handleConfirm}
                className="w-full py-5 bg-cyan-500 text-slate-950 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all"
              >
                Confirmar Registro en {slotName}
              </button>
            </div>
          ) : (
            /* --- VISTA 1: BUSCADOR MEJORADO --- */
            <>
              <header className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Bio-Explorador</h3>
                <button onClick={onClose} className="text-slate-500 hover:text-white"><X /></button>
              </header>

              <form onSubmit={handleSearch} className="flex gap-2 mb-8">
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="BUSCAR (EJ: MANZANA ROJA)..."
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:border-cyan-500 outline-none transition-all uppercase placeholder:normal-case"
                  />
                  {loading && <Loader2 className="absolute right-4 top-4 animate-spin text-cyan-500" size={20}/>}
                </div>
                <button 
                  type="submit"
                  className="bg-cyan-500 text-slate-950 px-6 rounded-2xl hover:bg-cyan-400 transition-colors"
                >
                  <Search size={20} />
                </button>
              </form>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence>
                  {results.map((food: any) => (
                    <motion.button 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={food.id}
                      onClick={() => {
                        setSelectedFood(food);
                        setGrams(food.default_portion_grams || 100);
                      }}
                      className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 rounded-[1.5rem] transition-all border border-transparent hover:border-white/10 group"
                    >
                      <div className="text-left">
                        <p className="font-black text-xs uppercase tracking-widest">{food.name_es}</p>
                        <p className="text-[10px] text-cyan-500/60 italic font-medium">{food.variant || "Genérica"}</p>
                      </div>
                      <ChevronRight size={18} className="text-slate-700 group-hover:text-cyan-500 transition-colors" />
                    </motion.button>
                  ))}
                </AnimatePresence>

                {searched && results.length === 0 && !loading && (
                  <div className="text-center py-12 bg-white/2 rounded-[2rem] border border-dashed border-white/5">
                    <AlertCircle className="mx-auto text-slate-800 mb-3" size={40} />
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic">Elemento no hallado en la Bio-Base</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Sub-componente para las tarjetas de nutrientes
function NutrientCard({ label, value, unit, color, icon }: any) {
  return (
    <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
        {icon}
        <span className="text-[7px] font-black uppercase text-slate-600 tracking-tighter">{label}</span>
      </div>
      <div className={`text-lg font-black italic tracking-tighter ${color}`}>
        {value} <span className="text-[8px] font-normal text-slate-500 italic">{unit}</span>
      </div>
    </div>
  );
}