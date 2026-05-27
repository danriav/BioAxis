"use client";

import { useMemo, useState } from "react";
import { Activity, AlertCircle, ChevronRight, Loader2, Search, X, Zap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  NutritionApiError,
  NutritionService,
  type FoodSearchItem,
} from "@/lib/nutrition-service";

type FoodSearchModalProps = {
  accessToken: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAdded: (food: FoodSearchItem, grams: number) => Promise<void>;
  onAuthError: (message: string) => void;
  onError: (message: string) => void;
  slotName: string;
};

export function FoodSearchModal({
  accessToken,
  isOpen,
  onClose,
  onAdded,
  onAuthError,
  onError,
  slotName,
}: FoodSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodSearchItem | null>(null);
  const [grams, setGrams] = useState(100);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    if (!accessToken) {
      onAuthError("Inicia sesion para buscar alimentos.");
      return;
    }

    setLoading(true);
    setSearched(true);
    setLocalMessage(null);

    try {
      const data = await NutritionService.searchFood(query, accessToken);
      setResults(data);
    } catch (error) {
      if (error instanceof NutritionApiError && error.status === 401) {
        onAuthError("Tu sesion expiro. Inicia sesion otra vez.");
      } else if (error instanceof NutritionApiError && error.status === 403) {
        setLocalMessage("No tienes acceso para buscar en la Bio-Base.");
      } else {
        setLocalMessage("No pudimos buscar alimentos en este momento.");
      }
    } finally {
      setLoading(false);
    }
  };

  const analysis = useMemo(() => {
    if (!selectedFood) return null;
    const caloriesPerGram = Number(selectedFood.calories_per_g) || 0;
    const proteinPerGram = Number(selectedFood.protein_per_g) || 0;
    const carbsPerGram = Number(selectedFood.carbs_per_g) || 0;
    const fatPerGram = Number(selectedFood.fat_per_g) || 0;
    const potassiumMgPerGram = Number(selectedFood.potassium_mg_per_g) || 0;
    const vitaminCMgPerGram = Number(selectedFood.vitamin_c_mg_per_g) || 0;

    return {
      kcal: (caloriesPerGram * grams).toFixed(0),
      protein: (proteinPerGram * grams).toFixed(1),
      carbs: (carbsPerGram * grams).toFixed(1),
      fat: (fatPerGram * grams).toFixed(1),
      potassium: (potassiumMgPerGram * grams).toFixed(0),
      vitaminC: (vitaminCMgPerGram * grams).toFixed(0),
    };
  }, [selectedFood, grams]);

  const resetAndClose = () => {
    setSelectedFood(null);
    setResults([]);
    setQuery("");
    setSearched(false);
    setGrams(100);
    setLocalMessage(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!selectedFood) return;

    try {
      await onAdded(selectedFood, grams);
      resetAndClose();
    } catch {
      onError("No pudimos registrar el alimento.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bio-Explorador"
      className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8">
          {selectedFood ? (
            <div className="space-y-6">
              <header className="flex justify-between items-start">
                <div>
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                    {selectedFood.name_es}
                  </h3>
                  <p className="text-cyan-500 font-bold text-xs uppercase tracking-[0.3em]">
                    Variante: {selectedFood.variant || "Estandar"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Volver a resultados"
                  onClick={() => setSelectedFood(null)}
                  className="p-2 bg-white/5 rounded-full text-white"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-slate-950/50 p-6 rounded-[2rem] border border-white/5">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">
                    Cantidad Manual (g)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={5000}
                      value={grams}
                      onChange={(e) => setGrams(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full bg-slate-900 border-2 border-cyan-500/20 rounded-2xl py-4 px-6 text-2xl font-black text-white focus:border-cyan-500 outline-none transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-black italic">GRS</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">
                    Porciones Bio-Predefinidas
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setGrams(100)} className="flex-1 py-2 bg-white/5 hover:bg-cyan-500/20 rounded-xl text-[10px] font-bold uppercase transition-all border border-white/5">
                      100g
                    </button>
                    {selectedFood.default_portion_grams && (
                      <button type="button" onClick={() => setGrams(selectedFood.default_portion_grams || 100)} className="flex-1 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-xl text-[10px] font-bold uppercase transition-all border border-cyan-500/20">
                        1 Unidad ({selectedFood.default_portion_grams}g)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <NutrientCard label="Calorias" value={analysis?.kcal} unit="kcal" color="text-white" icon={<Zap size={12} />} />
                <NutrientCard label="Proteina" value={analysis?.protein} unit="g" color="text-fuchsia-500" icon={<Activity size={12} />} />
                <NutrientCard label="Carbos" value={analysis?.carbs} unit="g" color="text-cyan-500" />
                <NutrientCard label="Grasas" value={analysis?.fat} unit="g" color="text-yellow-500" />
              </div>

              <div className="bg-white/5 p-4 rounded-2xl flex justify-around border border-white/5">
                <div className="text-center">
                  <p className="text-[8px] uppercase text-slate-500 font-black">Potasio</p>
                  <p className="text-sm font-mono text-slate-300">{analysis?.potassium}mg</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-[8px] uppercase text-slate-500 font-black">Vit. C</p>
                  <p className="text-sm font-mono text-slate-300">{analysis?.vitaminC}mg</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirm}
                className="w-full py-5 bg-cyan-500 text-slate-950 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all"
              >
                Confirmar Registro en {slotName}
              </button>
            </div>
          ) : (
            <>
              <header className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Bio-Explorador</h3>
                <button
                  type="button"
                  aria-label="Cerrar buscador"
                  onClick={resetAndClose}
                  className="text-slate-500 hover:text-white"
                >
                  <X />
                </button>
              </header>

              <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="BUSCAR (EJ: MANZANA ROJA)..."
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:border-cyan-500 outline-none transition-all uppercase placeholder:normal-case"
                  />
                  {loading && <Loader2 className="absolute right-4 top-4 animate-spin text-cyan-500" size={20} />}
                </div>
                <button
                  type="submit"
                  aria-label="Buscar alimento"
                  className="bg-cyan-500 text-slate-950 px-6 rounded-2xl hover:bg-cyan-400 transition-colors"
                >
                  <Search size={20} />
                </button>
              </form>

              {localMessage && (
                <div role="status" className="mb-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                  {localMessage}
                </div>
              )}

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence>
                  {results.map((food) => (
                    <motion.button
                      type="button"
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
                        <p className="font-black text-xs uppercase tracking-widest text-white">{food.name_es}</p>
                        <p className="text-[10px] text-cyan-500/60 italic font-medium">{food.variant || "Generica"}</p>
                      </div>
                      <ChevronRight size={18} className="text-slate-700 group-hover:text-cyan-500 transition-colors" />
                    </motion.button>
                  ))}
                </AnimatePresence>

                {searched && results.length === 0 && !loading && (
                  <div className="text-center py-12 rounded-[2rem] border border-dashed border-white/5">
                    <AlertCircle className="mx-auto text-slate-800 mb-3" size={40} />
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic">
                      Elemento no hallado en la Bio-Base
                    </p>
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

type NutrientCardProps = {
  label: string;
  value?: string;
  unit: string;
  color: string;
  icon?: React.ReactNode;
};

function NutrientCard({ label, value, unit, color, icon }: NutrientCardProps) {
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
