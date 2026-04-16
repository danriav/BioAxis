import { BioProfile } from "@/types/types";

export function analyzeSymmetry(profile: BioProfile) {
  const { medidas, peso, altura } = profile;
  
  // 1. Cálculo del V-Taper (Hombros / Cintura)
  const vTaper = medidas.hombros / medidas.cintura;
  
  // 2. Cálculo del Ratio de Extremidades (Brazo vs Pantorrilla)
  const armCalfGap = Math.abs(medidas.brazo - medidas.pantorrilla);
  
  // 3. Determinación de Enfoque
  let focus = "Equilibrado";
  let advice = "Tu estructura es balanceada. Mantén el volumen actual.";

  if (vTaper > 1.58) {
    focus = "Especialización de Densidad";
    advice = "Hombros dominantes. Prioriza espesor de espalda y tren inferior.";
  } else if (medidas.pantorrilla < medidas.brazo - 2) {
    focus = "Especialización Tren Inferior";
    advice = "Déficit en pantorrillas detectado. Aumentar frecuencia a F3.";
  }

  return { vTaper, armCalfGap, focus, advice };
}