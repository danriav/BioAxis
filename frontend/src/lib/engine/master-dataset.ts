export interface DatasetExercise {
  group: string;
  muscle: string;
  name: string;
  sets: number;
  reps: string;
  rir: string;
  rest: string;
}

export interface DayTemplate {
  dayLabel: string;
  exercises: DatasetExercise[];
}

export type FrequencyDataset = {
  [key in 1 | 2 | 3 | 4 | 5 | 6 | 7]: DayTemplate[];
};

export interface MasterCatalog {
  female: FrequencyDataset;
  male: FrequencyDataset;
}

// Bloques Reutilizables
const F_LOWER_1 = { dayLabel: 'Inferior', exercises: [ { group: 'Inferior', muscle: 'Cuádriceps / Glúteo', name: 'Sentadilla Hack (enfoque en glúteo)', sets: 3, reps: '6 - 8', rir: '1 - 2', rest: '3 minutos' }, { group: 'Inferior', muscle: 'Glúteo', name: 'Hip thrust', sets: 3, reps: '8 - 10', rir: '0', rest: '3 minutos' }, { group: 'Inferior', muscle: 'Femoral', name: 'Curl femoral sentado', sets: 4, reps: '8 - 10', rir: '1 - 2', rest: '3 minutos' }, { group: 'Inferior', muscle: 'Cuádriceps', name: 'Extensión de cuádriceps', sets: 3, reps: '8 - 10', rir: '1', rest: '3 minutos' }, { group: 'Inferior', muscle: 'Abductores', name: 'Abductores', sets: 3, reps: '10 - 12', rir: '0', rest: '2 minutos' }, { group: 'Inferior', muscle: 'Pantorrilla', name: 'Elevaciones de talón', sets: 3, reps: '12 - 14', rir: '0', rest: '2 minutos' } ] };
const F_UPPER_1 = { dayLabel: 'Superior', exercises: [ { group: 'Superior', muscle: 'Hombro frontal', name: 'Press militar', sets: 3, reps: '8 - 10', rir: '0', rest: '2 minutos' }, { group: 'Superior', muscle: 'Hombro lateral', name: 'Elevaciones laterales', sets: 4, reps: '10 - 13', rir: '0', rest: '2 minutos' }, { group: 'Superior', muscle: 'Espalda', name: 'Jalón al pecho', sets: 3, reps: '8 - 10', rir: '0', rest: '3 minutos' }, { group: 'Superior', muscle: 'Pecho', name: 'Press inclinado con mancuernas', sets: 2, reps: '10 - 12', rir: '2 - 3', rest: '2 minutos' }, { group: 'Superior', muscle: 'Tríceps', name: 'Extensión de tríceps con polea', sets: 3, reps: '10 - 13', rir: '0', rest: '2 minutos' }, { group: 'Superior', muscle: 'Bíceps', name: 'Curl predicador', sets: 3, reps: '10 - 13', rir: '0', rest: '2 minutos' } ] };
const F_LOWER_2 = { dayLabel: 'Inferior', exercises: [ { group: 'Inferior', muscle: 'Cuádriceps / Glúteo', name: 'Búlgaras (enfoque en glúteo)', sets: 3, reps: '6 - 8', rir: '1 - 2', rest: '3 minutos' }, { group: 'Inferior', muscle: 'Cuádriceps', name: 'Prensa', sets: 3, reps: '6 - 8', rir: '1 - 2', rest: '3 minutos' }, { group: 'Inferior', muscle: 'Femoral / Glúteo', name: 'Peso muerto rumano', sets: 3, reps: '8 - 10', rir: '1', rest: '3 minutos' }, { group: 'Inferior', muscle: 'Abductores', name: 'Aductores', sets: 3, reps: '10 - 12', rir: '0', rest: '2 minutos' }, { group: 'Inferior', muscle: 'Pantorrilla', name: 'Elevaciones de talón', sets: 4, reps: '10 - 12', rir: '0', rest: '2 minutos' } ] };
const F_UPPER_2 = { dayLabel: 'Superior', exercises: [ { group: 'Superior', muscle: 'Espalda', name: 'Jalón al pecho', sets: 3, reps: '8 - 10', rir: '0', rest: '3 minutos' }, { group: 'Superior', muscle: 'Espalda', name: 'Remo T', sets: 3, reps: '8 - 10', rir: '1 - 2', rest: '3 minutos' }, { group: 'Superior', muscle: 'Hombro posterior', name: 'Face pull', sets: 3, reps: '8 - 10', rir: '1 - 2', rest: '2 minutos' }, { group: 'Superior', muscle: 'Bíceps', name: 'Curl bayesian', sets: 3, reps: '8 - 10', rir: '1 - 2', rest: '2 minutos' } ] };

const M_LEGS_1 = { dayLabel: 'Pierna', exercises: [ { group: 'Pierna', muscle: 'Cuádriceps / Glúteo', name: 'Sentadilla Hack', sets: 3, reps: '6 - 8', rir: '0 - 1', rest: '3 minutos' }, { group: 'Pierna', muscle: 'Cuádriceps / Glúteo', name: 'Búlgaras', sets: 3, reps: '8 - 10', rir: '0 - 1', rest: '3 minutos' }, { group: 'Pierna', muscle: 'Cuádriceps', name: 'Prensa', sets: 3, reps: '6 - 8', rir: '0 - 1', rest: '3 minutos' }, { group: 'Pierna', muscle: 'Femoral', name: 'Curl femoral sentado', sets: 4, reps: '12 - 15', rir: '0', rest: '3 minutos' }, { group: 'Pierna', muscle: 'Aductores', name: 'Aductores', sets: 4, reps: '12 - 15', rir: '0', rest: '2 minutos' }, { group: 'Pierna', muscle: 'Pantorrilla', name: 'Elevaciones de talón', sets: 4, reps: '12 - 15', rir: '0', rest: '2 minutos' }] };
const M_PUSH_1 = { dayLabel: 'Empuje', exercises: [ { group: 'Empuje', muscle: 'Pecho', name: 'Press inclinado con mancuernas', sets: 3, reps: '8 - 10', rir: '0 - 1', rest: '3 minutos' }, { group: 'Empuje', muscle: 'Pecho', name: 'Press de banca', sets: 3, reps: '6 - 8', rir: '0 - 1', rest: '3 minutos' }, { group: 'Empuje', muscle: 'Hombro frontal', name: 'Press militar', sets: 3, reps: '10 - 12', rir: '0', rest: '2 minutos' }, { group: 'Empuje', muscle: 'Tríceps', name: 'Extensión de tríceps', sets: 3, reps: '10 - 12', rir: '0', rest: '2 minutos' }, { group: 'Empuje', muscle: 'Hombro lateral', name: 'Elevaciones laterales', sets: 4, reps: '10 - 13', rir: '0', rest: '2 minutos' }] };
const M_PULL_1 = { dayLabel: 'Tracción', exercises: [ { group: 'Tracción', muscle: 'Espalda', name: 'Jalón al pecho', sets: 3, reps: '6 - 8', rir: '0', rest: '3 minutos' }, { group: 'Tracción', muscle: 'Espalda', name: 'Remo T', sets: 3, reps: '6 - 8', rir: '1', rest: '3 minutos' }, { group: 'Tracción', muscle: 'Espalda', name: 'Remo gironda', sets: 3, reps: '6 - 8', rir: '0', rest: '3 minutos' }, { group: 'Tracción', muscle: 'Bíceps', name: 'Curl predicador', sets: 3, reps: '10 - 12', rir: '0', rest: '2 minutos' }, { group: 'Tracción', muscle: 'Bíceps', name: 'Curl martillo', sets: 3, reps: '8 - 10', rir: '0', rest: '2 minutos' }] };

const M_FULL_1 = { dayLabel: 'Full Body', exercises: [ { group: 'Full', muscle: 'Cuádriceps', name: 'Sentadilla Hack', sets: 3, reps: '6-8', rir:'1', rest:'3 minutos'}, { group: 'Full', muscle: 'Pecho', name: 'Press inclinado con mancuernas', sets: 3, reps: '8-10', rir:'1', rest:'3 minutos'}, { group: 'Full', muscle: 'Espalda', name: 'Jalón al pecho', sets: 3, reps: '8-10', rir:'1', rest:'3 minutos'}, { group: 'Full', muscle: 'Femoral', name: 'Peso muerto rumano', sets: 3, reps: '8-10', rir:'1', rest:'3 minutos'}, { group: 'Full', muscle: 'Hombro', name: 'Elevaciones laterales', sets: 3, reps: '12-15', rir:'0', rest:'2 minutos'} ]};
const F_FULL_1 = { dayLabel: 'Full Body', exercises: [ { group: 'Full', muscle: 'Glúteo', name: 'Hip thrust', sets: 3, reps: '8-10', rir:'1', rest:'3 minutos'}, { group: 'Full', muscle: 'Cuádriceps', name: 'Sentadilla Hack', sets: 3, reps: '8-10', rir:'1', rest:'3 minutos'}, { group: 'Full', muscle: 'Espalda', name: 'Jalón al pecho', sets: 3, reps: '8-10', rir:'1', rest:'3 minutos'}, { group: 'Full', muscle: 'Hombro', name: 'Elevaciones laterales', sets: 3, reps: '12-15', rir:'0', rest:'2 minutos'}, { group: 'Full', muscle: 'Femoral', name: 'Curl femoral', sets: 3, reps: '10-12', rir:'1', rest:'2 minutos'} ]};

const DEFAULT_CORE = { dayLabel: 'Core & Weak Points', exercises: [ { group: 'Core', muscle: 'Abdomen', name: 'Crunch', sets: 3, reps: '12-15', rir:'0', rest:'1.5 minutos'}, { group: 'Core', muscle: 'Abdomen', name: 'Elevación de piernas', sets: 3, reps: '12-15', rir:'0', rest:'1.5 minutos'}, { group: 'Inferior', muscle: 'Pantorrilla', name: 'Elevaciones de talón', sets: 4, reps: '15', rir:'0', rest:'1.5 minutos'} ]};

export const MASTER_DATASET: MasterCatalog = {
  female: {
    1: [ F_FULL_1 ],
    2: [ F_LOWER_1, F_UPPER_1 ],
    3: [ F_LOWER_1, F_UPPER_1, F_LOWER_2 ],
    4: [ F_LOWER_1, F_UPPER_1, F_LOWER_2, F_UPPER_2 ],
    5: [ F_LOWER_1, F_UPPER_1, F_LOWER_2, F_UPPER_2, { dayLabel: 'Inferior', exercises: [...F_LOWER_1.exercises] } ],
    6: [ F_LOWER_1, F_UPPER_1, F_LOWER_2, F_UPPER_2, F_LOWER_1, F_UPPER_1 ],
    7: [ F_LOWER_1, F_UPPER_1, F_LOWER_2, F_UPPER_2, F_LOWER_1, F_UPPER_1, DEFAULT_CORE ]
  },
  male: {
    1: [ M_FULL_1 ],
    2: [ M_PUSH_1, M_LEGS_1 ],
    3: [ M_PUSH_1, M_PULL_1, M_LEGS_1 ],
    4: [ M_PUSH_1, M_PULL_1, M_LEGS_1, { ...M_PUSH_1, dayLabel: 'Upper' } ],
    5: [ M_LEGS_1, M_PUSH_1, M_PULL_1, { ...M_LEGS_1 }, { dayLabel: 'Superior', exercises: [...M_PUSH_1.exercises.slice(0,3), ...M_PULL_1.exercises] } ],
    6: [ M_PUSH_1, M_PULL_1, M_LEGS_1, M_PUSH_1, M_PULL_1, M_LEGS_1 ],
    7: [ M_PUSH_1, M_PULL_1, M_LEGS_1, M_PUSH_1, M_PULL_1, M_LEGS_1, DEFAULT_CORE ]
  }
};
