// lib/engine/routine-generator.ts
import { MASTER_DATASET, DayTemplate, FrequencyDataset } from './master-dataset';

export type RoutineFocus = 'general' | 'chest' | 'back' | 'legs' | 'arms';

// 1. INTERFACES DE CONTRATO (Blindaje Total)
export interface CatalogExercise {
  id?: string;
  name_es: string;
  canonical_name: string;
  muscle_group?: string; 
  primary_muscle_group_id?: number | string; 
  target_section: string; // 'glute_medius', 'shoulders_lateral', 'chest_superior', etc.
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

// 2. MOTOR BIOAXIS V10.2 (ESTÉTICA POR GÉNERO Y SEGURIDAD DE GRUPO)
export class AITrainingEngine {
  
  private mapToGenerated(order: number, match: CatalogExercise): GeneratedExercise {
    return {
      order,
      name: match.name_es,
      muscle: match.muscle_group || match.target_section || 'General',
      sets: 3,
      reps: "10-12",
      rir: "1-2",
      rest: match.is_bilateral ? "2 min" : "60-90 seg",
      canonical_name: match.canonical_name,
      target_section: match.target_section || 'general',
      tension_type: match.tension_type || 'mid-range',
      stability_type: match.stability_type || 'low_external',
      duration_mins: 10
    };
  }

  public generate(params: RoutineParams): GeneratedPlan {
    const timeBudget = params.timeBudgetMins || 60;
    
    // --- 1. CONTRATO DE VOLUMEN (4, 5, 6, 7 bloques) ---
    let targetCount = 6;
    if (timeBudget <= 30) targetCount = 4;
    else if (timeBudget <= 45) targetCount = 5;
    else if (timeBudget <= 60) targetCount = 6;
    else if (timeBudget >= 85) targetCount = 7;

    const genderKey = params.gender === 'mujer' ? 'female' : 'male';
    const baseTemplate = MASTER_DATASET[genderKey][params.daysPerWeek] || MASTER_DATASET[genderKey][3];
    
    // --- 2. LÓGICA DE RATIO Y PRIORIDAD ESTÉTICA ---
    const m = params.bioMetrics;
    const hasEnoughMetrics = !!(m?.cintura && (m?.hombros || m?.cadera));
    let aestheticFocus: string[] = [];
    let bioMsg = "Análisis BioAxis: Equilibrio Biomecánico.";

    if (params.gender === 'hombre') {
      aestheticFocus = ['shoulders_lateral', 'back_width', 'shoulders_front'];
      if (hasEnoughMetrics) {
        const vTaper = (m!.hombros || 0) / (m!.cintura || 1);
        if (vTaper < 1.618) bioMsg = "Objetivo: Golden Ratio (V-Taper Masculino).";
      }
    } else {
      aestheticFocus = ['glute_medius', 'glute_max', 'hamstrings', 'shoulders_lateral'];
      if (hasEnoughMetrics) {
        const hourglass = (m!.hombros || 0) / (m!.cadera || 1);
        if (hourglass < 0.9) bioMsg = "Objetivo: Hourglass Ratio (Glúteo y Simetría).";
      }
    }

    const finalPlan = baseTemplate.map((day, dIdx) => {
      const dLabel = (day.dayLabel || '').toLowerCase();
      let finalExs: GeneratedExercise[] = [];

      // --- 3. BLUEPRINT DE SEGURIDAD (Aislamiento por día) ---
      let allowedSections: string[] = [];
      let blueprint: string[] = [];

      const isPush = dLabel.includes('empuje') || dLabel.includes('push');
      const isPull = dLabel.includes('tracción') || dLabel.includes('pull');
      const isLegs = dLabel.includes('pierna') || dLabel.includes('inferior') || dLabel.includes('legs');
      const isUpper = dLabel.includes('superior') || dLabel.includes('torso') || dLabel.includes('upper');

      if (isPush) {
        allowedSections = ['chest', 'shoulders', 'triceps', 'pecho', 'hombro', 'tríceps'];
        blueprint = ['chest_medial', 'chest_superior', 'shoulders_lateral', 'triceps', 'chest_medial', 'shoulders_front', 'triceps'];
      } else if (isPull) {
        allowedSections = ['back', 'biceps', 'rear_delt', 'espalda', 'bíceps', 'antebrazo', 'tracción'];
        blueprint = ['back_width', 'back_thickness', 'rear_delt', 'biceps', 'back_width', 'biceps', 'biceps'];
      } else if (isLegs) {
        allowedSections = ['quads', 'glute', 'hamstrings', 'calves', 'abs', 'pierna', 'cuádriceps', 'femoral'];
        blueprint = ['quads', 'glute_medius', 'hamstrings', 'glute_max', 'quads', 'calves', 'abs'];
      } else if (isUpper) {
        allowedSections = ['chest', 'back', 'shoulders', 'arms', 'pecho', 'espalda', 'hombro', 'bíceps', 'tríceps'];
        blueprint = ['chest_medial', 'back_width', 'chest_superior', 'back_thickness', 'shoulders_lateral', 'biceps', 'triceps'];
      } else {
        allowedSections = ['chest', 'back', 'shoulders', 'arms', 'quads', 'glute', 'pierna'];
        blueprint = ['chest', 'back', 'quads', 'shoulders', 'biceps', 'triceps', 'abs'];
      }

      // Función interna para validar que el ejercicio no "se escape" de su día
      const isValidForDay = (c: CatalogExercise) => {
        const section = (c.target_section || '').toLowerCase();
        const group = (c.muscle_group || '').toLowerCase();
        return allowedSections.some(s => section.includes(s) || group.includes(s));
      };

      for (let i = 0; i < targetCount; i++) {
        let match: CatalogExercise | undefined;
        const currentSlotGoal = blueprint[i] || 'general';

        // PRIORIDAD 1: Especialización Estética (Solo si encaja en el día)
        match = params.catalog.find(c => {
          const section = (c.target_section || '').toLowerCase();
          const notUsed = !finalExs.some(e => e.canonical_name === c.canonical_name);
          const isAesthetic = aestheticFocus.some(f => section.includes(f));
          return notUsed && isAesthetic && isValidForDay(c) && section.includes(currentSlotGoal);
        });

        // PRIORIDAD 2: Master Dataset Match (Con validación de aduanas)
        if (!match && day.exercises[i]) {
          const masterName = (day.exercises[i].name || '').toLowerCase();
          match = params.catalog.find(c => {
            const cName = (c.canonical_name || '').toLowerCase().replace(/_/g, ' ');
            const nEs = (c.name_es || '').toLowerCase();
            const isNameMatch = masterName.includes(cName) || nEs.includes(masterName);
            const notUsed = !finalExs.some(e => e.canonical_name === c.canonical_name);
            return isNameMatch && notUsed && isValidForDay(c);
          });
        }

        // PRIORIDAD 3: Relleno por Blueprint dinámico
        if (!match) {
          match = params.catalog.find(c => {
            const section = (c.target_section || '').toLowerCase();
            const notUsed = !finalExs.some(e => e.canonical_name === c.canonical_name);
            const isSlotMatch = section.includes(currentSlotGoal.split('_')[0]);
            const uniRule = (targetCount === 7 && i === 6) ? !c.is_bilateral : true;

            return notUsed && isValidForDay(c) && isSlotMatch && uniRule;
          });
        }

        // PRIORIDAD 4: Rescate Final (Cualquier cosa del grupo correcto)
        if (!match) {
          match = params.catalog.find(c => {
            const notUsed = !finalExs.some(e => e.canonical_name === c.canonical_name);
            return notUsed && isValidForDay(c);
          });
        }

        if (match) finalExs.push(this.mapToGenerated(i + 1, match));
      }

      // --- 4. PROTOCOLO PANTORRILLA ---
      if (isLegs && (params.bioMetrics?.pantorrilla || 0) < 36) {
        const hasCalves = finalExs.some(e => e.target_section.includes('calv') || e.name.toLowerCase().includes('talón'));
        if (!hasCalves) {
          const calfEx = params.catalog.find(c => (c.target_section || '').includes('calv') || (c.name_es || '').includes('Talón'));
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
      bioMsg, 
      mode: `BioAxis-V10.2-${params.gender === 'mujer' ? 'Hourglass' : 'GoldenRatio'}`, 
      timeBudget 
    };
  }
}