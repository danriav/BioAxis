// lib/actions/generate-routine.ts
"use server";

export async function generateAIWorkout(days: number, focus: string, userMetrics: any) {
  // 1. Imprimimos en consola para que sepas que el servidor recibió el click
  console.log(`[SIMULADOR IA] Generando rutina de ${days} días enfocada en: ${focus}`);

  // 2. Simulamos el tiempo que tardaría la IA de OpenAI en pensar (2.5 segundos)
  await new Promise(resolve => setTimeout(resolve, 2500));

  // 3. Devolvemos el JSON perfecto y estructurado a costo cero
  return {
    bioMsg: `(MODO SIMULADOR) Análisis biomecánico completado. Foco asignado a ${focus} (MAV: 18 series). Demás grupos en Mínimo Efectivo.`,
    timeBudget: 60,
    generatedPlan: [
      {
        dayNumber: 1,
        dayLabel: focus === 'legs' ? "Tren Inferior (Foco Cuádriceps)" : "Torso Alpha (Empuje)",
        totalDayMins: 55,
        exercises: [
          {
            order: 1,
            canonical_name: focus === 'legs' ? "barbell_squat" : "barbell_bench_press",
            name: focus === 'legs' ? "Sentadilla Libre con Barra" : "Press de Banca con Barra",
            sets: 4,
            reps: "6-8",
            rir: 2,
            duration_mins: 15,
            stability_type: "low_external"
          },
          {
            order: 2,
            canonical_name: focus === 'shoulders' ? "military_press" : "incline_db_press",
            name: focus === 'shoulders' ? "Press Militar con Barra" : "Press Inclinado con Mancuernas",
            sets: 3,
            reps: "8-10",
            rir: 1,
            duration_mins: 12,
            stability_type: "mid_external"
          },
          {
            order: 3,
            canonical_name: "cable_lateral_raise",
            name: "Elevación Lateral en Polea",
            sets: 4,
            reps: "12-15",
            rir: 0,
            duration_mins: 10,
            stability_type: "high_external"
          }
        ]
      },
      {
        dayNumber: 2,
        dayLabel: focus === 'back' ? "Densidad de Espalda" : "Tirón Biomecánico",
        totalDayMins: 45,
        exercises: [
          {
            order: 1,
            canonical_name: "pull_up",
            name: "Dominadas",
            sets: 4,
            reps: "Al fallo",
            rir: 0,
            duration_mins: 15,
            stability_type: "low_external"
          },
          {
            order: 2,
            canonical_name: "barbell_bicep_curl",
            name: "Curl con Barra",
            sets: 3,
            reps: "10-12",
            rir: 1,
            duration_mins: 10,
            stability_type: "mid_external"
          }
        ]
      }
    ]
  };
}