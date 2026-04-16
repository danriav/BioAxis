"use client";

import { useState } from "react";
import { registerWorkout } from "@/lib/actions/workout";

export function TestWorkoutButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleTestWorkout = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const payload = {
        nombre_sesion: "Sesión Alpha",
        volumen_total_kg: 5000,
        duracion_minutos: 60,
        esfuerzo_percibido_rpe: 8,
        fecha_entrenamiento: new Date().toISOString()
      };

      await registerWorkout(payload);
      setStatus("Éxito: Entrenamiento guardado. Por favor valida en tu consola de Supabase.");
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl flex flex-col items-center gap-3 w-max">
      <h3 className="text-white font-bold italic uppercase text-sm tracking-widest">Test Database (SCD2)</h3>
      <button
        onClick={handleTestWorkout}
        disabled={loading}
        className="bg-gradient-to-r from-cyan-600 to-blue-600 py-3 px-6 rounded-xl text-white font-bold uppercase tracking-widest hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all disabled:opacity-50"
      >
        {loading ? "Insertando..." : "Registrar Sesión Alpha"}
      </button>
      {status && (
        <p className={`text-xs font-mono font-bold max-w-sm text-center ${status.startsWith("Error") ? "text-red-400" : "text-cyan-400"}`}>
          {status}
        </p>
      )}
    </div>
  );
}
