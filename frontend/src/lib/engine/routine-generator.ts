export type RoutineFocus = 'general' | 'chest' | 'back' | 'legs' | 'shoulders' | 'arms';

export interface CatalogExercise {
  id: string;
  name_es: string;
  canonical_name: string;
  biomechanical_bias: 'stretch' | 'shortened' | 'mid-range';
  primary_muscle_group_id: string;
  muscle_groups: { display_name_es: string };
}

export interface RoutineParams {
  daysPerWeek: number;
  focus: RoutineFocus;
  fitnessLevel: string;
  gender: string;
  bioMetrics: any;
  height: number;
  timeBudgetMins: number;
  catalog: CatalogExercise[];
}

export class AITrainingEngine {
  private getDailySeriesLimit(mins: number): number {
    if (mins <= 45) return 9;
    if (mins <= 60) return 12;
    if (mins <= 75) return 15;
    if (mins <= 90) return 18;
    return 21; // 120 min
  }

  // 🟢 MAPA MAESTRO DE SPLITS (1 a 7 días sin repeticiones)
  private getDayStructure(dayIdx: number, daysPerWeek: number) {
    const splits: Record<number, any[]> = {
      1: [{ label: "Full Body Alpha", muscles: ['Glúteos', 'Pecho', 'Espalda', 'Cuádriceps', 'Hombros'] }],
      2: [
        { label: "Tren Inferior (Base)", muscles: ['Cuádriceps', 'Glúteos', 'Femorales'] },
        { label: "Tren Superior (Base)", muscles: ['Pecho', 'Espalda', 'Hombros'] }
      ],
      3: [
        { label: "Push (Empuje)", muscles: ['Pecho', 'Hombros', 'Tríceps'] },
        { label: "Pull (Tracción)", muscles: ['Espalda', 'Bíceps', 'Abdomen'] },
        { label: "Legs (Pierna)", muscles: ['Cuádriceps', 'Glúteos', 'Femorales'] }
      ],
      4: [
        { label: "Lower A (Cuádriceps/Glúteo)", muscles: ['Cuádriceps', 'Glúteos', 'Abductores'] },
        { label: "Upper A (Pecho/Espalda)", muscles: ['Pecho', 'Espalda', 'Hombros'] },
        { label: "Lower B (Isquios/Glúteo)", muscles: ['Glúteos', 'Femorales', 'Pantorrillas'] },
        { label: "Upper B (Brazos/Hombro)", muscles: ['Hombros', 'Bíceps', 'Tríceps', 'Abdomen'] }
      ],
      5: [
        { label: "Push (Pecho/Hombro)", muscles: ['Pecho', 'Hombros', 'Tríceps'] },
        { label: "Pull (Espalda/Bíceps)", muscles: ['Espalda', 'Bíceps', 'Antebrazo'] },
        { label: "Legs (Pierna Completa)", muscles: ['Cuádriceps', 'Glúteos', 'Femorales'] },
        { label: "Upper Body (Torso)", muscles: ['Pecho', 'Espalda', 'Hombros'] },
        { label: "Lower Body (Cadera)", muscles: ['Glúteos', 'Femorales', 'Abdomen'] }
      ],
      6: [
        { label: "Push A", muscles: ['Pecho', 'Hombros', 'Tríceps'] },
        { label: "Pull A", muscles: ['Espalda', 'Bíceps', 'Abdomen'] },
        { label: "Legs A", muscles: ['Cuádriceps', 'Glúteos'] },
        { label: "Push B", muscles: ['Hombros', 'Pecho', 'Tríceps'] },
        { label: "Pull B", muscles: ['Espalda', 'Antebrazo', 'Bíceps'] },
        { label: "Legs B", muscles: ['Glúteos', 'Femorales', 'Pantorrillas'] }
      ],
      7: [
        { label: "Push", muscles: ['Pecho', 'Hombros'] },
        { label: "Pull", muscles: ['Espalda', 'Bíceps'] },
        { label: "Legs", muscles: ['Cuádriceps', 'Glúteos'] },
        { label: "Upper", muscles: ['Pecho', 'Espalda'] },
        { label: "Lower", muscles: ['Glúteos', 'Femorales'] },
        { label: "Arms & Shoulders", muscles: ['Hombros', 'Bíceps', 'Tríceps'] },
        { label: "Core & Recovery", muscles: ['Abdomen', 'Pantorrillas', 'Antebrazo'] }
      ]
    };

    const currentSplit = splits[daysPerWeek] || splits[1];
    return currentSplit[dayIdx % currentSplit.length];
  }

  generate(params: RoutineParams) {
    const { daysPerWeek, gender, bioMetrics, timeBudgetMins, catalog } = params;
    const priorities = this.calculateAestheticPriorities(bioMetrics, gender);
    const dailySeriesLimit = this.getDailySeriesLimit(timeBudgetMins);
    
    const generatedPlan = [];
    for (let i = 0; i < daysPerWeek; i++) {
      const structure = this.getDayStructure(i, daysPerWeek);
      let dayExercises = this.fillSessionToBudget(structure.muscles, dailySeriesLimit, catalog, priorities);
      
      // 🟢 INYECCIÓN DE CARDIO (Si el tiempo es > 90 min)
      if (timeBudgetMins >= 90) {
        dayExercises.push(this.getVirtualCardio(bioMetrics));
      }

      generatedPlan.push({
        dayLabel: structure.label,
        exercises: dayExercises,
        totalDayMins: (dailySeriesLimit * 4) + 10 
      });
    }

    return { generatedPlan, bioMsg: this.generateBioMessage(priorities, gender) };
  }

  private fillSessionToBudget(targetMuscles: string[], limit: number, catalog: any[], priorities: any) {
    let sessionEx: any[] = [];
    let currentSeries = 0;
    let mIdx = 0;

    while (currentSeries < limit && sessionEx.length < 12) {
      const m = targetMuscles[mIdx % targetMuscles.length];
      const ex = catalog.find(c => (c.muscle_groups?.display_name_es === m) && !sessionEx.find(s => s.id === c.id));

      if (ex) {
        const sci = this.getScientificParams(m, ex.biomechanical_bias);
        const sets = Math.min(3, limit - currentSeries);
        if (sets > 0) {
          sessionEx.push({ ...ex, sets, ...sci });
          currentSeries += sets;
        }
      }
      mIdx++;
      if (mIdx > 60) break;
    }
    return sessionEx;
  }

  private getScientificParams(muscle: string, bias: string) {
    if (['Cuádriceps', 'Pecho', 'Espalda', 'Glúteos'].includes(muscle)) {
      return { reps: "6-8", rest: 180, rir: 1, notes: "Tensión mecánica máxima. Rango pesado." };
    }
    return { reps: "10-12", rest: 120, rir: 0, notes: "Enfoque metabólico y control." };
  }

  private getVirtualCardio(metrics: any) {
    return {
      id: "cardio-virtual",
      name_es: "Caminadora (Inclinación)",
      sets: 1,
      reps: "15 min",
      rest: 0,
      rir: "LISS",
      biomechanical_bias: "CARDIO",
      notes: "Caminata 5km/h - Inclinación 10%. Objetivo: Oxidación de grasa post-pesas."
    };
  }

  private calculateAestheticPriorities(metrics: any, gender: string) {
    const p: Record<string, string> = {};
    if (!metrics) return p;
    const ratio = gender === 'hombre' ? metrics.hombros / metrics.cintura : metrics.cintura / metrics.cadera;
    if (gender === 'hombre' && ratio < 1.6) { p['Hombros'] = 'ALPHA'; p['Espalda'] = 'ALPHA'; }
    if (gender === 'mujer' && ratio > 0.7) { p['Glúteos'] = 'ALPHA'; p['Hombros'] = 'ALPHA'; }
    return p;
  }

  private generateBioMessage(priorities: any, gender: string) {
    const alphas = Object.keys(priorities);
    return alphas.length > 0 ? `Priorizando ${alphas.join(' y ')} para ajustar tu ratio.` : "Estructura balanceada.";
  }
}