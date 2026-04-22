"use client";
import { useState, useEffect } from "react";
import { Search, X, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { NutritionService } from "@/lib/nutrition-service";

export function FoodSearchModal({ isOpen, onClose, slotName, onAdded }: any) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [grams, setGrams] = useState(100);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false); // Para saber si ya buscamos algo

  const handleSearch = async (e: any) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const data = await NutritionService.searchFood(query);
      setResults(data);
      
      // LÓGICA ALPHA: Si solo hay un resultado exacto, pasar directo a gramos
      if (data.length === 1) {
        setSelectedFood(data[0]);
      }
    } catch (error) {
      console.error("Error en la búsqueda:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    onAdded(selectedFood, grams);
    // Limpiar estados para la próxima vez
    setSelectedFood(null);
    setResults([]);
    setQuery("");
    setSearched(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[3rem] p-8 shadow-2xl">
        
        {selectedFood ? (
          /* APARTADO 2: SELECCIÓN DE GRAMOS */
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <h3 className="text-2xl font-black italic uppercase mb-2 tracking-tighter text-white">¿Qué cantidad?</h3>
            <p className="text-cyan-500 mb-6 font-bold uppercase text-xs tracking-widest">{selectedFood.name_es}</p>
            
            <div className="relative mb-8">
               <input 
                type="number" 
                autoFocus
                value={grams}
                onChange={(e) => setGrams(Number(e.target.value))}
                className="w-full bg-slate-950 border-2 border-cyan-500/30 rounded-3xl py-8 text-5xl text-center font-black text-white outline-none focus:border-cyan-500 transition-all"
              />
              <span className="absolute bottom-4 right-8 text-slate-500 font-black italic">GRS</span>
            </div>
            
            <div className="flex gap-4">
              <button onClick={() => setSelectedFood(null)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Atrás</button>
              <button onClick={handleConfirm} className="flex-1 py-4 bg-cyan-500 text-slate-950 hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Añadir a {slotName}</button>
            </div>
          </div>
        ) : (
          /* APARTADO 1: BÚSQUEDA */
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-xl">
                    <Search className="text-cyan-500" size={18} />
                </div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter">Bio-Buscador</h3>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500"><X size={20}/></button>
            </div>

            <form onSubmit={handleSearch} className="relative mb-6">
              <input 
                type="text" 
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Escribe 'Manzana' y pulsa Enter..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-sm text-white focus:border-cyan-500 outline-none transition-all"
              />
              {loading && <Loader2 size={18} className="absolute right-4 top-4 text-cyan-500 animate-spin" />}
            </form>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {results.length > 0 ? (
                results.map((food: any) => (
                  <button 
                    key={food.id}
                    onClick={() => setSelectedFood(food)}
                    className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-cyan-500 hover:text-slate-950 rounded-2xl transition-all group border border-transparent hover:border-cyan-400"
                  >
                    <div className="text-left">
                      <p className="font-bold text-xs uppercase tracking-wider">{food.name_es}</p>
                      <p className="text-[9px] opacity-60 italic mt-1 font-mono">CAL: {(food.calories_per_g * 100).toFixed(0)} | P: {food.protein_per_g}g | C: {food.carbs_per_g}g (100g)</p>
                    </div>
                    <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
                  </button>
                ))
              ) : searched && !loading ? (
                <div className="text-center py-10">
                  <AlertCircle className="mx-auto text-slate-700 mb-2" size={32} />
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest italic">No se encontró "{query}" en la Bio-Base</p>
                </div>
              ) : (
                <p className="text-center py-10 text-slate-700 text-[10px] font-black uppercase tracking-[0.2em] italic">Esperando entrada de datos...</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}