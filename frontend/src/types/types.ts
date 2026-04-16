// src/types/bio.ts
export interface BioProfile {
    genero: 'hombre' | 'mujer';
    edad: number;
    altura: number;
    peso: number;
    medidas: {
      hombros: number;
      pecho: number;
      brazo: number;
      antebrazo: number;
      cintura: number;
      cadera: number;
      gluteo: number;
      pierna: number;
      pantorrilla: number;
    };
  }