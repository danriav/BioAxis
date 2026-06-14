// src/lib/utils/biometric-validator.ts

type BiometricInput = {
  peso?: string | number;
  altura?: string | number;
  brazo?: string | number;
  gluteo?: string | number;
  pierna?: string | number;
  genero?: string;
};

export const validateBiometrics = (m: BiometricInput) => {
  // Convertimos a números para comparar con seguridad
  const peso = parseFloat(String(m.peso)) || 0;
  const altura = parseFloat(String(m.altura)) || 0;
  const brazo = parseFloat(String(m.brazo)) || 0;
  const gluteo = parseFloat(String(m.gluteo)) || 0;
  const pierna = parseFloat(String(m.pierna)) || 0;
  const genero = m.genero;

  if (peso <= 0 || altura <= 0) return null; // Ignorar si están vacíos

  // 1. EL "SHE-HULK" CHECK (Brazo vs Peso/Género)
  // 45cm de brazo en una mujer de 60kg es físicamente imposible (nivel Mr. Olympia)
  if (genero === 'mujer' && brazo > 40 && peso < 75) {
    return "Error de coherencia: Un brazo de ese volumen requeriría una masa muscular total muy superior. Por favor, verifica la medida.";
  }

  // 2. EL "JOHNNY BRAVO" CHECK (Brazo vs Pierna)
  if (brazo > pierna && brazo > 0 && pierna > 0) {
    return "Anomalía detectada: La medida del brazo no puede ser superior a la de la pierna. Revisa tus perímetros.";
  }

  // 3. EL CHECK DE VOLUMEN (Glúteo vs Peso)
  if (gluteo > peso * 2.3 && gluteo > 0) {
    return "La medida de glúteo ingresada es desproporcionada para tu peso corporal. Verifica si son centímetros reales.";
  }

  // 4. CHECK DE ALTURA (Mínimo realismo)
  if (altura < 130 || altura > 230) {
    return "La altura ingresada está fuera de los rangos de análisis de Kalos.";
  }

  return null; // Todo OK
};
