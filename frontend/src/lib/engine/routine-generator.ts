import { MASTER_DATASET, DayTemplate, DatasetExercise } from './master-dataset';

export type RoutineFocus = 'general' | 'chest' | 'back' | 'legs' | 'arms';

// Interfaz del Catálogo DB expandido
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
  stability_type: 'high_external' | 'low_external'; // Nueva regla de Fatiga Sistémica
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

export class AITrainingEngine {
  
  private calculateExerciseTime(sets: number, restString: string): number {
    let rest = 2; // Default
    if (restString.includes('3')) rest = 3;
    if (restString.includes('1.5') || restString.includes('1 minuto y 30')) rest = 1.5;
    return sets * (1 + rest);
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
      const fallback = catalog.filter(e => e.muscle_section_focus === currentEx.target_section && e.canonical_name !== currentEx.canonical_name);
      if (fallback.length > 0) chosen = fallback[0];
    }

    if (!chosen) return currentEx; 
    
    return {
      ...currentEx,
      name: chosen.name_es,
      canonical_name: chosen.canonical_name,
      equipment_type: chosen.equipment_type,
      stability_type: chosen.stability_type
    } as GeneratedExercise;
  }

  // Auto-Swap de Seguridad para Sistema Central (SNC) y Tiempo Crítico
  private getStableAlternative(originalMatch: CatalogExercise, fullCatalog: CatalogExercise[]): CatalogExercise {
    // Si ya es estable, retornamos
    if (originalMatch.stability_type === 'high_external') return originalMatch;

    // Buscamos un sustituto 'high_external' con la misma física (ej. máquina o polea)
    const stableCandidates = fullCatalog.filter(e => 
      e.muscle_group === originalMatch.muscle_group &&
      e.muscle_section_focus === originalMatch.muscle_section_focus && 
      e.biomechanical_bias === originalMatch.biomechanical_bias &&
      e.stability_type === 'high_external'
    );

    if (stableCandidates.length > 0) {
      return stableCandidates[0]; // Retorna la alternativa biológica idéntica pero guiada (ej. Hack en vez de Barbell)
    }
    
    // Si la ciencia estricta falla, nos guiamos solo por el ángulo principal
    const fallbackStable = fullCatalog.filter(e => 
      e.muscle_group === originalMatch.muscle_group &&
      e.stability_type === 'high_external'
    );
    
    return fallbackStable.length > 0 ? fallbackStable[0] : originalMatch;
  }

  public generate(params: RoutineParams): GeneratedPlan {
    const timeBudget = params.timeBudgetMins || 60;
    const effectiveTime = timeBudget - 15; 
    
    const genderKey = params.gender === 'mujer' ? 'female' : 'male';
    const baseTemplate: DayTemplate[] = MASTER_DATASET[genderKey][params.daysPerWeek] || MASTER_DATASET[genderKey][3]; 
    let workingPlan: DayTemplate[] = JSON.parse(JSON.stringify(baseTemplate));

    let bioMsg = `IA Cronométrica: Empacando bloques en ${timeBudget}m (15m Calentamiento dinámico reservados).`;
    let mode: 'Standard' | 'Deload' | 'Aesthetic-Corrected' = 'Standard';
    let isBioDedicated = false;

    // 1. Correcciones Biométricas
    if (params.focus === 'general' && params.bioMetrics) {
      isBioDedicated = true;
      const { genero, brazo, pantorrilla, hombros, cintura, cadera } = params.bioMetrics;
      const isMale = genero === 'hombre';
      
      if (isMale && hombros && cintura && (hombros / cintura) < 1.6) {
        mode = 'Aesthetic-Corrected';
        bioMsg += " Ratio V-Taper bajo, sobrecargando deltoides.";
        workingPlan.forEach(day => {
          day.exercises.forEach(ex => {
            if (ex.muscle === 'Hombro lateral' || ex.name.toLowerCase().includes('lateral')) ex.sets += 1;
            if (ex.name.toLowerCase().includes('gironda')) ex.sets += 1;
          });
        });
      } else if (!isMale && cintura && cadera && (cintura / cadera) > 0.75) {
        mode = 'Aesthetic-Corrected';
        bioMsg += " Optimizando Ratio Reloj de Arena (sobrecarga glúteo).";
        workingPlan.forEach(day => {
          day.exercises.forEach(ex => {
            if (ex.name.toLowerCase().includes('hip thrust') || ex.muscle === 'Glúteo') ex.sets += 1;
          });
        });
      }
    }

    // 2. Deload Defense (Fatiga Sistémica Activa)
    if (params.recentHardLogs && params.recentHardLogs >= 5) {
      mode = 'Deload';
      bioMsg += " 🚨 Fatiga SNC detectada: Aplicando -1 Set en todo y activando Protección de Estabilidad (Swap Máquinas).";
      workingPlan.forEach(day => {
        day.exercises.forEach(ex => {
          if (ex.sets > 1) ex.sets -= 1;
          ex.rir = '3 - 4 (Descarga)';
        });
      });
    }

    // La condición maestra de Auto-Swap Biomecánico
    const needsSystemicStability = timeBudget <= 45 || mode === 'Deload';
    if(needsSystemicStability && !bioMsg.includes('Protección de Estabilidad')) {
      bioMsg += " 🛡️ Modo Eficiencia: Intercambio a 'High External Stability' activo (Máquinas predominantes).";
    }

    // 3. Compilación Cronométrica
    const finalPlan: GeneratedDay[] = workingPlan.map((day, dIdx) => {
      let dayTimeAccum = 0;
      let finalExs: GeneratedExercise[] = [];
      let orderCounter = 1;

      for (const masterEx of day.exercises) {
        const potentialMatches = params.catalog.filter(c => masterEx.name.toLowerCase().includes(c.canonical_name.replace(/_/g, ' ')));
        
        let matchDef = potentialMatches.length > 0 ? potentialMatches[0] : null;

        // Fallback básico si el string no coincide perfecto pero pertenece al grupo muscular global 
        // (Sirve por si el catalog tiene nombres un poco diferentes al dataset master)
        if (!matchDef) {
           const genericMatches = params.catalog.filter(c => c.name_es.toLowerCase().includes(masterEx.name.toLowerCase()) || masterEx.name.toLowerCase().includes(c.name_es.toLowerCase()));
           if(genericMatches.length > 0) matchDef = genericMatches[0];
        }
        
        // Si no hay definición en catalog, construimos una estática genérica para no romper el front
        if (!matchDef) {
          matchDef = {
             name_es: masterEx.name, canonical_name: 'custom_ex', category: 'strength', muscle_group: masterEx.muscle,
             muscle_section_focus: 'general', biomechanical_bias: 'mid-range', equipment_type: 'dumbbell',
             is_bilateral: true, stability_type: 'low_external'
          };
        }

        // LÓGICA DE FATIGA Y EFICIENCIA (AUTO SWAP ESTABILIDAD)
        if (needsSystemicStability && matchDef.stability_type === 'low_external') {
           matchDef = this.getStableAlternative(matchDef, params.catalog);
        }

        // AUTO-FILTRO BILATERAL
        // Si el tiempo es corto, intentamos descartar de todos modos las unilaterales si encontramos bilateral para el mismo biomecánico
        if (timeBudget <= 60 && !matchDef.is_bilateral) {
           const bilatAlt = params.catalog.find(c => c.muscle_group === matchDef!.muscle_group && c.biomechanical_bias === matchDef!.biomechanical_bias && c.is_bilateral);
           if(bilatAlt) matchDef = bilatAlt;
        }

        const costMins = this.calculateExerciseTime(masterEx.sets, masterEx.rest);
        
        // Si choca contra el muro de tiempo, dejamos de agregar
        if (dayTimeAccum + costMins > effectiveTime + 5 && orderCounter > 3) {
           break; 
        }

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

        if (orderCounter > 8) break; 
      }

      // SMART FILL: Si sobran más de 5 minutos, añadir bloque de Core o HIIT 
      const timeRemaining = effectiveTime - dayTimeAccum;
      if (timeRemaining >= 5) {
        const finisherTime = timeRemaining > 10 ? 10 : timeRemaining;
        finalExs.push({
          order: orderCounter++,
          name: "Core Burst Finisher (Crunches / L-Sits)",
          muscle: "Core",
          sets: 3,
          reps: "15-20",
          rir: "0",
          rest: "1 min",
          canonical_name: "core_burst",
          target_section: "abdomen",
          tension_type: "shortened",
          stability_type: "bodyweight",
          duration_mins: finisherTime
        });
        dayTimeAccum += finisherTime;
        if (!bioMsg.includes('Finisher')) {
           bioMsg += ` Integrado Finisher de Core/Endurance por margen de tiempo (+${finisherTime}m).`;
        }
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
