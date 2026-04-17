// lib/engine/routine-generator.ts
import { MASTER_DATASET, DayTemplate, DatasetExercise } from './master-dataset';

export type RoutineFocus = 'general' | 'chest' | 'back' | 'legs' | 'arms';

// 1. INTERFACES DEL MOTOR
export interface CatalogExercise {
  id?: string;
  name_es: string;
  canonical_name: string;
  category: string;
  muscle_group: string;
  muscle_section_focus: string;
  biomechanical_bias: 'stretch' | 'shortened' | 'mid-range';
  equipment_type: 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight';
  is_bilateral: boolean;
  stability_type: 'high_external' | 'low_external';
}

export interface RoutineParams {
  daysPerWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  focus: RoutineFocus;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  gender?: 'hombre' | 'mujer';
  recentHardLogs?: number;
  bioMetrics?: any;
  timeBudgetMins?: number;
  catalog: CatalogExercise[];
}

export interface GeneratedExercise {
  order: number;
  name: string;
  muscle: string;
  sets: number;
  reps: string;
  rir: string;
  rest: string;
  canonical_name: string;
  target_section: string;
  tension_type: string;
  stability_type: string;
  duration_mins: number;
}

export interface GeneratedDay {
  dayNumber: number;
  dayLabel: string;
  exercises: GeneratedExercise[];
  totalDayMins: number;
}

export interface GeneratedPlan {
  metadata: RoutineParams;
  generatedPlan: GeneratedDay[];
  isBioDedicated: boolean;
  bioMsg: string;
  mode: 'Standard' | 'Deload' | 'Aesthetic-Corrected';
  timeBudget: number;
}

// 2. CLASE DEL MOTOR DE ENTRENAMIENTO (SISTEMA EXPERTO)
export class AITrainingEngine {
  
  private calculateExerciseTime(sets: number, restString: string): number {
    let rest = 2; // Default
    if (restString.includes('3')) rest = 3;
    if (restString.includes('1.5') || restString.includes('1.5 minutos')) rest = 1.5;
    return sets * (1.5 + rest); // 1.5 min por ejecución + descanso
  }

  // Swap Manual del UI
  public swapExercise(currentEx: GeneratedExercise, catalog: CatalogExercise[]): GeneratedExercise {
    const candidates = catalog.filter(e => 
      e.muscle_section_focus === currentEx.target_section && 
      e.biomechanical_bias === currentEx.tension_type &&
      e.canonical_name !== currentEx.canonical_name
    );
    
    let chosen: CatalogExercise | null = null;
    if (candidates.length > 0) {
      const priority = candidates.find(c => c.equipment_type === 'dumbbell' || c.equipment_type === 'cable');
      chosen = priority || candidates[0];
    } else {
      const fallback = catalog.filter(e => e.muscle_group === currentEx.muscle && e.canonical_name !== currentEx.canonical_name);
      if (fallback.length > 0) chosen = fallback[0];
    }

    if (!chosen) return currentEx; 
    
    return {
      ...currentEx,
      name: chosen.name_es,
      canonical_name: chosen.canonical_name,
      stability_type: chosen.stability_type,
      tension_type: chosen.biomechanical_bias
    };
  }

  // Auto-Swap de Seguridad para Sistema Nervioso Central (SNC)
  private getStableAlternative(originalMatch: CatalogExercise, fullCatalog: CatalogExercise[]): CatalogExercise {
    if (originalMatch.stability_type === 'high_external') return originalMatch;

    const stableCandidates = fullCatalog.filter(e => 
      e.muscle_group === originalMatch.muscle_group &&
      e.muscle_section_focus === originalMatch.muscle_section_focus && 
      e.biomechanical_bias === originalMatch.biomechanical_bias &&
      e.stability_type === 'high_external'
    );

    return stableCandidates.length > 0 ? stableCandidates[0] : originalMatch;
  }

  // GENERADOR PRINCIPAL
  public generate(params: RoutineParams): GeneratedPlan {
    const timeBudget = params.timeBudgetMins || 60;
    const effectiveTime = timeBudget - 15; // Margen para calentamiento
    
    const genderKey = params.gender === 'mujer' ? 'female' : 'male';
    const baseTemplate: DayTemplate[] = MASTER_DATASET[genderKey][params.daysPerWeek] || MASTER_DATASET[genderKey][3]; 
    let workingPlan: DayTemplate[] = JSON.parse(JSON.stringify(baseTemplate));

    let bioMsg = `Motor BioAxis: Perfilando para ${timeBudget}m.`;
    let mode: 'Standard' | 'Deload' | 'Aesthetic-Corrected' = 'Standard';
    let isBioDedicated = false;

    // --- REGLA DE ORO: CONTROL DE FRECUENCIA DE CORE ---
    let coreDaysAdded = 0;
    const MAX_CORE_PER_WEEK = 2; // Máximo 2 días de abdomen sin importar el tiempo

    // 1. CORRECCIONES ESTÉTICAS (BIOMÉTRICAS)
    if (params.focus === 'general' && params.bioMetrics) {
      isBioDedicated = true;
      const { genero, hombros, cintura, cadera } = params.bioMetrics;
      const isMale = genero === 'hombre';
      
      if (isMale && hombros && cintura && (hombros / cintura) < 1.6) {
        mode = 'Aesthetic-Corrected';
        bioMsg += " 🎯 V-Taper bajo: Priorizando deltoides.";
        workingPlan.forEach(day => {
          day.exercises.forEach(ex => {
            if (ex.muscle.includes('Hombro lateral')) ex.sets += 1;
          });
        });
      } else if (!isMale && cintura && cadera && (cintura / cadera) > 0.72) {
        mode = 'Aesthetic-Corrected';
        bioMsg += " 🎯 Optimizando Ratio Cintura/Cadera (Glúteo prioritario).";
        workingPlan.forEach(day => {
          day.exercises.forEach(ex => {
            if (ex.muscle === 'Glúteo' || ex.name.includes('Hip thrust')) ex.sets += 1;
          });
        });
      }
    }

    // 2. DELOAD DEFENSE (SNC)
    if (params.recentHardLogs && params.recentHardLogs >= 5) {
      mode = 'Deload';
      bioMsg += " 🚨 Fatiga SNC: Modo Descarga activo (-1 Set + Estabilidad Máxima).";
      workingPlan.forEach(day => {
        day.exercises.forEach(ex => {
          if (ex.sets > 1) ex.sets -= 1;
          ex.rir = '3 - 4';
        });
      });
    }

    const needsSystemicStability = timeBudget <= 45 || mode === 'Deload';

    // 3. COMPILACIÓN DE RUTINA
    const finalPlan: GeneratedDay[] = workingPlan.map((day, dIdx) => {
      let dayTimeAccum = 0;
      let finalExs: GeneratedExercise[] = [];
      let orderCounter = 1;

      // Verificamos si este día ya trae Core desde el Dataset (ej. el día 7 de abdomen)
      const datasetHasCore = day.exercises.some(ex => ex.group === 'Core');
      if (datasetHasCore) coreDaysAdded++;

      for (const masterEx of day.exercises) {
        // Buscar el ejercicio en el catálogo de Supabase
        let matchDef = params.catalog.find(c => 
          masterEx.name.toLowerCase().includes(c.canonical_name.replace(/_/g, ' ')) ||
          c.name_es.toLowerCase() === masterEx.name.toLowerCase()
        );

        if (!matchDef) {
           // Fallback si no hay match perfecto
           matchDef = {
             name_es: masterEx.name, canonical_name: 'custom_ex', category: 'strength',
             muscle_group: masterEx.muscle, muscle_section_focus: 'general',
             biomechanical_bias: 'mid-range', equipment_type: 'machine',
             is_bilateral: true, stability_type: 'high_external'
           };
        }

        // Aplicar Auto-Swap si necesitamos estabilidad (tiempo corto o deload)
        if (needsSystemicStability && matchDef.stability_type === 'low_external') {
           matchDef = this.getStableAlternative(matchDef, params.catalog);
        }

        const costMins = this.calculateExerciseTime(masterEx.sets, masterEx.rest);
        
        // Si se acaba el tiempo, dejamos de añadir ejercicios
        if (dayTimeAccum + costMins > effectiveTime + 5 && orderCounter > 3) break;

        dayTimeAccum += costMins;

        finalExs.push({
          order: orderCounter++,
          name: matchDef.name_es,
          muscle: masterEx.muscle,
          sets: masterEx.sets,
          reps: masterEx.reps,
          rir: masterEx.rir,
          rest: masterEx.rest,
          canonical_name: matchDef.canonical_name,
          target_section: matchDef.muscle_section_focus,
          tension_type: matchDef.biomechanical_bias,
          stability_type: matchDef.stability_type,
          duration_mins: costMins
        });

        if (orderCounter > 9) break; 
      }

      // --- SMART FILL REFINADO: REGLA ANTISATURACIÓN DE CORE ---
      const timeRemaining = effectiveTime - dayTimeAccum;
      
      if (timeRemaining >= 10 && coreDaysAdded < MAX_CORE_PER_WEEK && !datasetHasCore) {
        finalExs.push({
          order: orderCounter++,
          name: "Abdominal Control (Enfoque en Estabilidad)",
          muscle: "Core",
          sets: 3,
          reps: "15-20",
          rir: "0",
          rest: "1 min",
          canonical_name: "core_finisher",
          target_section: "abs_general",
          tension_type: "shortened",
          stability_type: "bodyweight",
          duration_mins: 10
        });
        dayTimeAccum += 10;
        coreDaysAdded++;
        if (!bioMsg.includes('Core Finisher')) bioMsg += " + Core Finisher programado.";
      }

      return {
        dayNumber: dIdx + 1,
        dayLabel: day.dayLabel,
        exercises: finalExs,
        totalDayMins: dayTimeAccum + 15
      };
    });

    return {
      metadata: params,
      generatedPlan: finalPlan,
      isBioDedicated,
      bioMsg,
      mode,
      timeBudget
    };
  }
}