// lib/engine/routine-generator.ts
import { MASTER_DATASET, DayTemplate, FrequencyDataset } from './master-dataset';

export type RoutineFocus = 'general' | 'chest' | 'back' | 'legs' | 'arms';

// 1. INTERFACES (Sincronizadas con tu Supabase)
export interface CatalogExercise {
  id?: string;
  name_es: string;
  canonical_name: string;
  muscle_group?: string; // Opcional por seguridad
  primary_muscle_group_id?: number | string; 
  target_section: string; // Ej: 'chest_superior', 'glute_medius'
  tension_type: 'stretch' | 'shortened' | 'mid-range';
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
  bioMetrics?: {
    hombros?: number;
    pecho?: number;
    biceps?: number;
    cintura?: number;
    cadera?: number;
    gluteo?: number;
    pierna?: number;
    pantorrilla?: number;
  };
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
  mode: string;
  timeBudget: number;
}

// 2. MOTOR BIOAXIS V8 (LOGIC ENGINE PRO)
export class AITrainingEngine {
  
  private mapToGenerated(order: number, match: CatalogExercise): GeneratedExercise {
    return {
      order,
      name: match.name_es,
      muscle: match.muscle_group || match.target_section || 'General',
      sets: 3,
      reps: "10-12",
      rir: "1-2",
      rest: match.is_bilateral ? "2 min" : "90 seg",
      canonical_name: match.canonical_name,
      target_section: match.target_section,
      tension_type: match.tension_type,
      stability_type: match.stability_type,
      duration_mins: 10
    };
  }

  public generate(params: RoutineParams): GeneratedPlan {
    const timeBudget = params.timeBudgetMins || 60;
    
    // --- REGLAS DE VOLUMEN ESTRICTO (TU CONTRATO) ---
    let targetCount = 6;
    if (timeBudget <= 30) targetCount = 4;
    else if (timeBudget <= 45) targetCount = 5;
    else if (timeBudget <= 60) targetCount = 6;
    else if (timeBudget >= 85) targetCount = 7;

    const genderKey = params.gender === 'mujer' ? 'female' : 'male';
    const baseTemplate = MASTER_DATASET[genderKey][params.daysPerWeek] || MASTER_DATASET[genderKey][3];
    
    // --- LÓGICA DE PROPORCIÓN (GOLDEN / HOURGLASS) ---
    const metrics = params.bioMetrics;
    const hasEnoughMetrics = !!(metrics?.cintura && (metrics?.hombros || metrics?.cadera));
    let ratioMsg = "Enfoque: Equilibrio Biomecánico.";
    let aestheticFocus: string[] = [];

    if (hasEnoughMetrics) {
      if (params.gender === 'hombre') {
        const vTaper = (metrics!.hombros || 0) / (metrics!.cintura || 1);
        if (vTaper < 1.618) {
          aestheticFocus = ['shoulders_lateral', 'back_width'];
          ratioMsg = "Objetivo: V-Taper (Golden Ratio)";
        }
      } else {
        const hourglass = (metrics!.hombros || 0) / (metrics!.cadera || 1);
        if (hourglass < 0.9) {
          aestheticFocus = ['glute_medius', 'shoulders_lateral'];
          ratioMsg = "Objetivo: Hourglass (Curvas y Simetría)";
        }
      }
    }

    const finalPlan = baseTemplate.map((day, dIdx) => {
      const dLabel = (day.dayLabel || '').toLowerCase();
      let finalExs: GeneratedExercise[] = [];

      // Muro de seguridad por día
      let allowedPatterns: string[] = [];
      if (dLabel.includes('empuje')) allowedPatterns = ['chest', 'shoulders', 'triceps'];
      else if (dLabel.includes('tracción')) allowedPatterns = ['back', 'biceps', 'rear_delt'];
      else if (dLabel.includes('pierna') || dLabel.includes('inferior')) allowedPatterns = ['quads', 'glute', 'hamstrings', 'calves', 'abs'];
      else allowedPatterns = ['chest', 'back', 'shoulders', 'arms', 'quads'];

      for (let i = 0; i < targetCount; i++) {
        let match: CatalogExercise | undefined;

        // PRIORIDAD 1: Corregir el Ratio (Solo en los últimos 2 slots)
        if (aestheticFocus.length > 0 && i >= targetCount - 2) {
          match = params.catalog.find(c => {
            const section = (c.target_section || '').toLowerCase();
            const group = (c.muscle_group || '').toLowerCase();
            const notUsed = !finalExs.some(e => e.canonical_name === c.canonical_name);
            const isTarget = aestheticFocus.some(f => section.includes(f));
            const isDayCompatible = allowedPatterns.some(p => section.includes(p) || group.includes(p));
            return notUsed && isTarget && isDayCompatible;
          });
        }

        // PRIORIDAD 2: Master Dataset (Si no se ha llenado el slot)
        if (!match && day.exercises[i]) {
          const masterName = day.exercises[i].name.toLowerCase();
          match = params.catalog.find(c => {
            const nameMatch = (c.canonical_name || '').toLowerCase().includes(masterName.replace(/ /g, '_')) || 
                              (c.name_es || '').toLowerCase() === masterName;
            const notUsed = !finalExs.some(e => e.canonical_name === c.canonical_name);
            return nameMatch && notUsed;
          });
        }

        // PRIORIDAD 3: Relleno Dinámico (Garantizar los 4, 5, 6 o 7 ejercicios)
        if (!match) {
          match = params.catalog.find(c => {
            const section = (c.target_section || '').toLowerCase();
            const group = (c.muscle_group || '').toLowerCase();
            const notUsed = !finalExs.some(e => e.canonical_name === c.canonical_name);
            const isDayCompatible = allowedPatterns.some(p => section.includes(p) || group.includes(p));
            
            // Regla Unilateral para 90 min (Slot 7)
            const uniRule = (targetCount === 7 && i === 6) ? !c.is_bilateral : true;
            
            return notUsed && isDayCompatible && uniRule;
          });
        }

        if (match) finalExs.push(this.mapToGenerated(i + 1, match));
      }

      // PROTOCOLO EXTRA: Pantorrilla por Biometría
      if ((dLabel.includes('pierna') || dLabel.includes('inferior')) && (params.bioMetrics?.pantorrilla || 0) < 35) {
        const hasCalves = finalExs.some(e => e.target_section.includes('calv'));
        if (!hasCalves) {
          const calfEx = params.catalog.find(c => c.target_section.includes('calv') || c.name_es.includes('Talón'));
          if (calfEx) finalExs.push(this.mapToGenerated(99, calfEx));
        }
      }

      return {
        dayNumber: dIdx + 1,
        dayLabel: day.dayLabel,
        exercises: finalExs.map((e, idx) => ({ ...e, order: idx + 1 })),
        totalDayMins: 10 + (finalExs.length * 10)
      };
    });

    return { 
      metadata: params, 
      generatedPlan: finalPlan, 
      isBioDedicated: hasEnoughMetrics, 
      bioMsg: ratioMsg, 
      mode: hasEnoughMetrics ? 'Bio-Ratio-Optimization' : 'General-Hypertrophy', 
      timeBudget 
    };
  }
}