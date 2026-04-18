// lib/engine/routine-generator.ts
import { MASTER_DATASET, DayTemplate } from './master-dataset';

export class AITrainingEngine {
  
  public generate(params: any): any {
    const { gender, bioMetrics, catalog, timeBudgetMins, daysPerWeek } = params;
    const timeBudget = timeBudgetMins || 60;
    
    // 1. CONTRATO DE VOLUMEN (Basado en tus tablas)
    let targetCount = 6;
    if (timeBudget >= 85) targetCount = 7; 
    else if (timeBudget <= 45) targetCount = 5;

    // 2. CÁLCULO DE DEFICIT ESTÉTICO (Hourglass Logic)
    const m = bioMetrics;
    const ratioSimetria = (m?.hombros || 0) / (m?.cadera || 1); // Meta 1.0
    const ratioCurvatura = (m?.cintura || 0) / (m?.cadera || 1); // Meta 0.7
    
    // ¿Necesitamos ensanchar cadera o espalda?
    const needsHipWidth = ratioSimetria > 1.05; 
    const needsV_Taper = ratioCurvatura > 0.75;

    let globalUsedIds: string[] = [];

    const finalPlan = [1, 2, 3, 4, 5].slice(0, daysPerWeek).map((dayNum) => {
      let dayExs: any[] = [];
      let blueprint: string[] = [];
      let dayLabel = "";

      // 3. SELECCIÓN DE DÍA BASADO EN TU ESTRATEGIA DE 5 DÍAS
      // Adaptamos la lógica de tu tabla de 5 días
      if (dayNum === 1) { 
        dayLabel = "Pierna (Cuádriceps/Glúteo Focus)";
        blueprint = ['quads', 'glute_max', 'hamstrings', 'quads', 'glute_medius', 'calves', 'abs'];
      } else if (dayNum === 2) {
        dayLabel = "Empuje (Hombro/Pecho/Tríceps)";
        blueprint = ['shoulders_front', 'shoulders_lateral', 'triceps', 'triceps', 'triceps', 'chest_superior', 'chest_medial'];
      } else if (dayNum === 3) {
        dayLabel = "Pierna (Cadena Posterior/Glúteo)";
        blueprint = ['glute_max', 'quads', 'hamstrings', 'glute_medius', 'calves', 'adductores', 'abs'];
      } else if (dayNum === 4) {
        dayLabel = "Tracción (Espalda/Bíceps)";
        blueprint = ['back_width', 'back_thickness', 'back_width', 'rear_delt', 'biceps', 'biceps', 'biceps'];
      } else {
        dayLabel = "Pierna (Enfoque Glúteo)";
        blueprint = ['glute_max', 'hamstrings', 'quads', 'glute_medius', 'adductores', 'calves', 'abs'];
      }

      // 4. BÚSQUEDA INTELIGENTE CON BIAS DE MÉTRICAS
      for (let i = 0; i < targetCount; i++) {
        let slotGoal = blueprint[i];
        
        // AJUSTE DINÁMICO POR MÉTRICAS:
        // Si falta cadera, reemplazamos un slot genérico por Glúteo Medio
        if (needsHipWidth && slotGoal === 'abs' && i > 4) slotGoal = 'glute_medius';
        // Si falta V-Taper, reemplazamos un slot de espalda por Back Width
        if (needsV_Taper && slotGoal.includes('back')) slotGoal = 'back_width';

        let match = catalog.find((c: any) => {
          const section = (c.target_section || '').toLowerCase();
          const isNotUsed = !globalUsedIds.includes(c.id || c.canonical_name);
          const isMatch = section.includes(slotGoal.split('_')[0]);
          
          // Validar que el ejercicio sea del grupo correcto del día
          const isCorrectGroup = this.validateGroup(dayLabel, c);
          
          return isMatch && isNotUsed && isCorrectGroup;
        });

        // Fallback: Si ya se usaron todos los de esa sección, permitir repetir pero no en el mismo día
        if (!match) {
          match = catalog.find((c: any) => 
            (c.target_section || '').toLowerCase().includes(slotGoal.split('_')[0]) && 
            this.validateGroup(dayLabel, c) &&
            !dayExs.some(e => e.canonical_name === c.canonical_name)
          );
        }

        if (match) {
          dayExs.push({
            order: i + 1,
            name: match.name_es,
            muscle: match.target_section,
            canonical_name: match.canonical_name,
            sets: 3,
            reps: this.getRepsForSection(slotGoal),
            rest: match.is_bilateral ? "3 min" : "2 min",
            rir: i < 3 ? "1-2" : "0" // Los primeros ejercicios más pesados, últimos al fallo
          });
          globalUsedIds.push(match.id || match.canonical_name);
        }
      }

      return {
        dayNumber: dayNum,
        dayLabel: dayLabel,
        exercises: dayExs
      };
    });

    return { 
      metadata: params, 
      generatedPlan: finalPlan,
      bioMsg: needsHipWidth ? "Énfasis en Glúteo Medio para Hourglass" : "Equilibrio General",
      mode: "BioAxis-Custom-V12"
    };
  }

  private validateGroup(label: string, c: any): boolean {
    const section = (c.target_section || '').toLowerCase();
    const group = (c.muscle_group || '').toLowerCase();
    if (label.includes("Pierna")) return ['quad', 'glute', 'hamstring', 'calv', 'abs', 'pierna', 'femoral', 'aductor', 'abductor'].some(s => section.includes(s) || group.includes(s));
    if (label.includes("Empuje")) return ['chest', 'shoulder', 'tricep', 'pecho', 'hombro'].some(s => section.includes(s) || group.includes(s));
    if (label.includes("Tracción")) return ['back', 'bicep', 'rear', 'espalda', 'bíceps', 'tracción'].some(s => section.includes(s) || group.includes(s));
    return true;
  }

  private getRepsForSection(section: string): string {
    if (section.includes('quads') || section.includes('glute_max')) return "6-8";
    if (section.includes('back') || section.includes('chest')) return "8-10";
    return "10-13";
  }
}