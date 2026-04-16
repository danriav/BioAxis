export type BioFocus = 'legs' | 'arms' | 'torso' | 'balanced' | 'shoulders_back';

export const analyzeBodyProfile = (measures: any): BioFocus => {
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