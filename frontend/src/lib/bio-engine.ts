export type BioFocus = 'legs' | 'arms' | 'torso' | 'balanced' | 'shoulders_back';

type BodyMeasures = {
  brazo: number;
  pantorrilla: number;
  hombro: number;
  cintura: number;
};

export const analyzeBodyProfile = (measures: BodyMeasures): BioFocus => {
  const armSize = measures.brazo;
  const calfSize = measures.pantorrilla;
  const shoulderSize = measures.hombro;
  
  // Lógica de ejemplo: Si los hombros son > 1.55 veces la cintura, son dominantes
  if (shoulderSize / measures.cintura > 1.58) {
    return 'shoulders_back'; // Tu perfil actual
  }
  
  if (calfSize < armSize - 2) {
    return 'legs'; // Prioridad tren inferior
  }
  
  return 'balanced';
};
