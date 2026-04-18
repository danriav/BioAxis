// lib/engine/routine-generator.ts
import { MASTER_DATASET } from './master-dataset';

export type RoutineFocus = 'general' | 'chest' | 'back' | 'legs' | 'arms';

export interface CatalogExercise {
  id?: string;
  name_es: string;
  canonical_name: string;
  muscle_group?: string; 
  target_section: string; 
  tension_type: 'stretch' | 'shortened' | 'mid-range';
  equipment_type: 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight';
  is_bilateral: boolean;
  stability_type: 'high_external' | 'low_external';
}

export interface RoutineParams {
  daysPerWeek: 3 | 4 | 5 | 6 | 7;
  focus: RoutineFocus;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  gender?: 'hombre' | 'mujer';
  height?: number; 
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
}

export interface GeneratedDay {
  dayNumber: number;
  dayLabel: string;
  exercises: GeneratedExercise[];
  totalDayMins: number; // Sincronizado con tu UI
}

export interface GeneratedPlan {
  metadata: RoutineParams;
  generatedPlan: GeneratedDay[];
  isBioDedicated: boolean;
  bioMsg: string;
  mode: string;
}

export class AITrainingEngine {
  private analyzeSymmetry(m: any, height: number, gender: string): { msg: string, penalize: string[] } {
    if (!m?.cintura || !height) return { msg: "Análisis BioAxis: Equilibrio General.", penalize: [] };
    const penalize: string[] = [];
    let messages: string[] = [];

    if (m.biceps && m.pantorrilla) {
      if (m.biceps / m.pantorrilla > 1.18) {
        messages.push("Aviso: Desbalance superior (Johnny Bravo)");
        penalize.push('biceps', 'triceps');
      }
    }

    const waistHeightRatio = m.cintura / height;
    if (waistHeightRatio > 0.54) { 
      messages.push("Enfoque: Recomposición Corporal");
      return { msg: messages.join(" | "), penalize: ['abs'] }; 
    }

    if (gender === 'mujer') {
      if (m.hombros && (m.hombros / m.cintura < 1.15)) messages.push("Objetivo: X-Frame");
      if (m.biceps && (m.biceps / height > 0.21)) {
        messages.push("Hipertrofia de brazos avanzada");
        penalize.push('biceps', 'triceps');
      }
    }

    return { msg: messages.length > 0 ? messages.join(" | ") : "Estructura Óptima y Proporcionada", penalize };
  }

  public generate(params: RoutineParams): GeneratedPlan {
    const height = params.height || 160;
    const analysis = this.analyzeSymmetry(params.bioMetrics, height, params.gender || 'mujer');
    let aestheticFocus = params.gender === 'mujer' ? ['glute_medius', 'glute_max', 'hamstrings', 'shoulders_lateral'] : ['shoulders_lateral', 'back_width'];
    
    aestheticFocus = aestheticFocus.filter(f => !analysis.penalize.includes(f));
    let globalUsedIds: string[] = [];

    const finalPlan = [1, 2, 3, 4, 5].slice(0, params.daysPerWeek).map((dayNum) => {
      let dayExs: GeneratedExercise[] = [];
      let blueprint: string[] = [];
      let dayLabel = "";

      if (dayNum === 1) { dayLabel = "Pierna (Cuádriceps/Glúteo)"; blueprint = ['quads', 'glute_max', 'hamstrings', 'quads', 'glute_medius', 'calves', 'abs']; }
      else if (dayNum === 2) { dayLabel = "Empuje (Tren Superior)"; blueprint = ['shoulders_lateral', 'chest_superior', 'triceps', 'shoulders_front', 'triceps', 'chest_medial', 'abs']; }
      else if (dayNum === 3) { dayLabel = "Pierna (Isquios/Glúteo)"; blueprint = ['glute_max', 'hamstrings', 'glute_medius', 'quads', 'hamstrings', 'adductores', 'calves']; }
      else if (dayNum === 4) { dayLabel = "Tracción (Tren Superior)"; blueprint = ['back_width', 'back_thickness', 'rear_delt', 'biceps', 'back_width', 'biceps', 'abs']; }
      else { dayLabel = "Pierna (Enfoque Glúteo)"; blueprint = ['glute_max', 'quads', 'hamstrings', 'glute_medius', 'adductores', 'calves', 'abs']; }

      const limit = (params.timeBudgetMins || 60) >= 85 ? 7 : 6;

      for (let i = 0; i < limit; i++) {
        let slotGoal = blueprint[i];
        if (analysis.penalize.some(p => slotGoal.includes(p))) slotGoal = aestheticFocus[0] || 'back_width';

        let match = params.catalog.find((c) => {
          const section = (c.target_section || '').toLowerCase();
          return section.includes(slotGoal.split('_')[0]) && !globalUsedIds.includes(c.id || c.canonical_name) && this.validateGroup(dayLabel, c);
        });

        if (match) {
          dayExs.push({
            order: i + 1, name: match.name_es, muscle: match.target_section,
            canonical_name: match.canonical_name, sets: 3, reps: i < 3 ? "6-8" : "10-12",
            rir: i < 3 ? "2" : "0", rest: match.is_bilateral ? "3 min" : "2 min",
            target_section: match.target_section
          });
          globalUsedIds.push(match.id || match.canonical_name);
        }
      }

      return { dayNumber: dayNum, dayLabel, exercises: dayExs, totalDayMins: 10 + (dayExs.length * 10) };
    });

    return { metadata: params, generatedPlan: finalPlan, isBioDedicated: !!params.bioMetrics?.cintura, bioMsg: analysis.msg, mode: "BioAxis-V13" };
  }

  private validateGroup(label: string, c: CatalogExercise): boolean {
    const s = c.target_section.toLowerCase();
    if (label.includes("Pierna")) return ['quad', 'glute', 'hamstring', 'calv', 'abs', 'aductor', 'abductor'].some(k => s.includes(k));
    if (label.includes("Empuje")) return ['chest', 'shoulder', 'tricep'].some(k => s.includes(k));
    if (label.includes("Tracción")) return ['back', 'bicep', 'rear'].some(k => s.includes(k));
    return true;
  }
}