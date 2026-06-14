# Especificación funcional del motor de entrenamiento Kalos

Fecha: 2026-05-29

Estado: especificación implementable. No modifica código, prompts productivos, datasets ni catálogo de ejercicios.

## Objetivo

Definir el comportamiento esperado del nuevo motor de entrenamiento Kalos para Backend, IA y Frontend. El motor debe generar planes de hipertrofia coherentes, personalizados y seguros usando reglas deterministas primero, y la IA solo como capa de explicación, ajuste textual o sustitución controlada.

## Principios

- La estructura semanal se decide antes que los ejercicios.
- El volumen semanal se asigna antes que el llenado de sesiones.
- La prioridad del usuario debe cambiar frecuencia, volumen, orden y selección.
- La variedad se controla por patrón de movimiento y grupo de sustitución, no por aleatoriedad.
- La IA no puede saltarse validaciones de seguridad, volumen, frecuencia, equipo o lesiones.
- La salida final debe ser JSON validable antes de mostrarse en Frontend.

## Inputs funcionales

Obligatorios:

- `days_per_week`: entero 1-7.
- `goal`: `hypertrophy`, `recomposition`, `fat_loss`, `strength_hypertrophy`, `general_fitness`.
- `priority`: `torso`, `legs`, `glutes`, `balanced`.
- `experience`: `beginner`, `intermediate`, `advanced`.
- `time_budget_minutes`: 30-150.
- `available_equipment`: lista.
- `constraints`: lesiones, dolor, ejercicios excluidos, limitaciones de equipo.

Opcionales:

- `sex_reference`: `male`, `female`, `neutral`.
- `anthropometric_buckets`: altura, peso, BMI bucket, ratio type y ratio gap bucket.
- `preferred_exercises`.
- `recent_exercises`.
- `session_days`.
- `cardio_preference`.

## Reglas definitivas de split por frecuencia

### Prioridad balanced

| Días | Beginner | Intermediate | Advanced |
| ---: | --- | --- | --- |
| 1 | Full Body | Full Body | Full Body |
| 2 | Inferior, Superior | Inferior, Superior | Upper, Lower |
| 3 | Full Body A/B/C | Empuje, Pierna, Tracción | Empuje, Pierna, Tracción |
| 4 | Inferior A, Superior A, Inferior B, Superior B | Inferior A, Superior A, Inferior B, Superior B | Upper/Lower A/B |
| 5 | Pierna, Empuje, Tracción, Pierna, Superior | Pierna, Empuje, Tracción, Pierna, Superior | Push, Pull, Legs, Upper, Lower |
| 6 | Push, Pull, Legs, Push, Pull, Legs | Push, Pull, Legs, Push, Pull, Legs | Push A, Pull A, Legs A, Push B, Pull B, Legs B |
| 7 | 6 días + Core/Recovery | 6 días + Core/Recovery | 6 días + Core/Recovery |

### Prioridad glutes

| Días | Split |
| ---: | --- |
| 1 | Full Body con primer bloque glúteo |
| 2 | Inferior glúteo, Superior |
| 3 | Inferior glúteo, Superior, Inferior femoral/glúteo |
| 4 | Inferior A glúteo, Superior A, Inferior B femoral/glúteo, Superior B |
| 5 | Inferior A glúteo, Superior A, Inferior B cuádriceps/glúteo, Tracción/Superior, Inferior C glúteo |
| 6 | Inferior A, Empuje, Inferior B, Tracción, Inferior C, Superior/Recovery |
| 7 | 6 días + Core/Movilidad/Cardio suave |

### Prioridad legs

| Días | Split |
| ---: | --- |
| 1 | Full Body con pierna primero |
| 2 | Inferior, Superior |
| 3 | Pierna A, Superior, Pierna B |
| 4 | Pierna A, Superior A, Pierna B, Superior B |
| 5 | Pierna A, Empuje, Pierna B, Tracción, Pierna C |
| 6 | Pierna A, Empuje, Pierna B, Tracción, Pierna C, Superior/Weak points |
| 7 | 6 días + Core/Recovery |

### Prioridad torso

| Días | Split |
| ---: | --- |
| 1 | Full Body con torso primero |
| 2 | Superior, Inferior |
| 3 | Empuje, Pierna, Tracción |
| 4 | Empuje, Pierna, Tracción, Superior |
| 5 | Empuje A, Tracción A, Pierna, Empuje B, Tracción B/Superior |
| 6 | Push A, Pull A, Legs, Push B, Pull B, Upper/Arms |
| 7 | 6 días + Core/Recovery |

### Reglas por objetivo

- `hypertrophy`: usar el split base de prioridad; volumen medio-alto; RIR objetivo 0-2.
- `recomposition`: igual que hipertrofia, pero con menor fatiga por sesión y cardio 1-3 veces/semana según tiempo.
- `fat_loss`: conservar fuerza/masa con volumen moderado; cardio se programa semanalmente, no como relleno diario; evitar exceso de fallo.
- `strength_hypertrophy`: priorizar primer ejercicio pesado por sesión; menos ejercicios, más descanso, RIR 1-3 en básicos.
- `general_fitness`: full body o upper/lower preferente; volumen moderado; más margen de RIR; técnica sobre fallo.

### Reglas por experiencia

- Beginner: preferir 1-4 días, movimientos estables, máquinas/mancuernas, menos fatiga y menos ejercicios por sesión.
- Intermediate: permitir 3-6 días, más especialización y 1-2 ejercicios por patrón prioritario.
- Advanced: permitir 4-7 días, especialización, rotación A/B/C, técnicas puntuales y volumen alto si pasa validaciones.

## Reglas de volumen semanal

### Rangos por prioridad

| Rol muscular | Beginner | Intermediate | Advanced |
| --- | ---: | ---: | ---: |
| Prioritario | 8-12 series | 12-16 series | 14-20 series |
| Secundario | 5-9 series | 8-12 series | 10-14 series |
| Mantenimiento | 3-6 series | 4-8 series | 6-10 series |
| Accesorio pequeño | 2-6 series | 4-8 series | 6-10 series |

### Límites absolutos por músculo

- Beginner: máximo 12 series/semana por músculo.
- Intermediate: máximo 16 series/semana por músculo.
- Advanced: máximo 20 series/semana por músculo.
- Excepción avanzada: 22 series solo si es prioridad única, sin dolor, con frecuencia 3 y sin exceso de fallo.

### Límites de frecuencia por músculo

- Beginner: 1-2 estímulos por músculo/semana.
- Intermediate: 1-3 estímulos.
- Advanced: 2-4 estímulos solo para prioridades o músculos pequeños.
- Glúteo/pierna prioritarios: 2-3 estímulos.
- Torso prioritario: pecho/espalda/hombros 2 estímulos; brazos 1-2.

### Límites de fatiga por sesión

Usar puntos de fatiga por ejercicio:

- `fatigue_cost: low` = 1 punto.
- `medium` = 2 puntos.
- `high` = 3 puntos.

Límites:

- Beginner: máximo 8 puntos/sesión.
- Intermediate: máximo 12 puntos/sesión.
- Advanced: máximo 16 puntos/sesión.

Límites de series por sesión:

- 30-45 min: 8-10 series efectivas.
- 46-60 min: 10-14 series.
- 61-75 min: 14-18 series.
- 76-90 min: 18-22 series.
- Más de 90 min: máximo 24 series; cardio o movilidad debe ser opcional y justificado.

Reglas de acumulación:

- Máximo 2 ejercicios `high` por sesión beginner.
- Máximo 3 ejercicios `high` por sesión intermediate.
- Máximo 4 ejercicios `high` por sesión advanced.
- Evitar más de 2 patrones con alto estrés lumbar en la misma sesión.
- Evitar más de 3 presses pesados por semana en beginner/intermediate si hay estrés de hombro.

## Reglas de selección de ejercicios

Cada sesión se construye en este orden:

1. Ejercicio ancla.
2. Accesorio principal.
3. Aislamiento o accesorio secundario.
4. Finisher opcional.

### Ejercicio ancla

Definición:

- Primer ejercicio o primer bloque fuerte de la sesión.
- Debe coincidir con el músculo o patrón prioritario del día.
- Debe ser estable, progresable y medible.

Reglas:

- 1 ancla obligatoria por sesión.
- 2 anclas permitidas solo en sesiones advanced o sesiones largas.
- Repetir el mismo ancla en la semana solo si el plan lo declara como especialización.
- El ancla debe tener `role: anchor`, `fatigue_cost: medium` o `high`.

Ejemplos por intención:

- Glúteo: hip thrust, variante de sentadilla/glúteo, bisagra.
- Pierna cuádriceps: sentadilla, hack, prensa.
- Pierna femoral: peso muerto rumano, curl femoral como accesorio fuerte.
- Empuje: press inclinado, press plano, press militar.
- Tracción: jalón, dominada asistida, remo.

### Accesorio principal

Definición:

- Segundo o tercer ejercicio.
- Refuerza el mismo patrón o completa el patrón opuesto.

Reglas:

- 1-2 accesorios principales por sesión.
- Debe aportar volumen significativo sin repetir exactamente el ancla.
- Puede compartir músculo, pero debe variar patrón o perfil de carga.

Ejemplos:

- Después de hip thrust: RDL o prensa con enfoque glúteo.
- Después de sentadilla/hack: extensión de cuádriceps o prensa.
- Después de press inclinado: aperturas o press secundario.
- Después de jalón: remo.

### Aislamiento

Definición:

- Ejercicio monoarticular o de baja complejidad para completar volumen.

Reglas:

- 1-4 aislamientos por sesión según tiempo y nivel.
- Preferir aislamientos para músculos pequeños o para completar volumen sin fatiga sistémica.
- RIR 0-2 permitido en intermedio/avanzado; beginner preferir RIR 1-3.

Ejemplos:

- Elevaciones laterales.
- Curl predicador o Bayesian.
- Extensión de tríceps.
- Curl femoral.
- Extensión de cuádriceps.
- Abductores/aductores.
- Pantorrilla.

### Finisher

Definición:

- Remate metabólico o técnico de baja duración.

Reglas:

- Opcional.
- Solo si la sesión pasa límites de fatiga y tiempo.
- No debe reemplazar volumen principal.
- No usar drop set en básicos pesados.
- Beginner: finisher desactivado por defecto.

Ejemplos:

- Pantorrilla alta repetición.
- Abductores/aductores.
- Abdomen.
- Cardio LISS breve.
- Drop set en aislamiento, solo intermedio/avanzado.

### Sustituciones válidas

Una sustitución es válida si conserva:

- `primary_muscle`.
- `movement_pattern` o patrón equivalente.
- `role`.
- Rango de fatiga igual o menor.
- Equipo disponible.
- Restricciones articulares.

Reglas:

- Si se sustituye ancla, debe elegirse otro ejercicio del mismo `substitution_group`.
- Si hay dolor o restricción, preferir menor `joint_stress`.
- Si falta equipo, preferir mismo patrón con equipo disponible.
- La IA puede sugerir sustituciones, pero el motor debe validarlas.

### Repetición de ejercicios

- No repetir ejercicio exacto más de 1 vez/semana en beginner salvo full body de baja frecuencia.
- No repetir ejercicio exacto más de 2 veces/semana en intermediate/advanced salvo especialización declarada.
- No repetir el mismo ancla en días consecutivos.
- Si se repite, incluir `repeat_justification`: `specialization`, `limited_equipment`, `technical_practice`, `user_preference`.
- Repetir patrón está permitido si cambia variante o perfil: por ejemplo hack en día A, prensa en día B.

## Taxonomía mínima obligatoria

Todo ejercicio disponible para el motor debe incluir:

```json
{
  "exercise_id": "string",
  "name_es": "string",
  "primary_muscle": "glutes",
  "secondary_muscles": ["hamstrings"],
  "movement_pattern": "hip_thrust",
  "role": "anchor",
  "fatigue_cost": "high",
  "equipment": ["machine", "barbell"],
  "joint_stress": ["hip", "lumbar"],
  "substitution_group": "hip_thrust_glutes"
}
```

Valores permitidos:

`movement_pattern`:

- `squat`
- `hinge`
- `hip_thrust`
- `horizontal_push`
- `vertical_push`
- `horizontal_pull`
- `vertical_pull`
- `knee_extension`
- `knee_flexion`
- `hip_abduction`
- `hip_adduction`
- `calf_raise`
- `elbow_flexion`
- `elbow_extension`
- `shoulder_abduction`
- `rear_delt`
- `core_flexion`
- `core_stability`
- `cardio_liss`
- `cardio_hiit`

`role`:

- `anchor`
- `primary_accessory`
- `secondary_accessory`
- `isolation`
- `finisher`
- `warmup`
- `cardio`

`fatigue_cost`:

- `low`
- `medium`
- `high`

`equipment`:

- `barbell`
- `dumbbell`
- `machine`
- `cable`
- `bodyweight`
- `band`
- `smith`
- `bench`
- `cardio_machine`

`joint_stress`:

- `knee`
- `hip`
- `lumbar`
- `shoulder`
- `elbow`
- `wrist`
- `ankle`
- `neck`

`substitution_group`:

- String estable por familia funcional.
- Ejemplos: `incline_press_chest`, `vertical_pull_back`, `row_back`, `hip_thrust_glutes`, `squat_quad_glute`, `hinge_hamstrings`, `lateral_raise_shoulders`, `triceps_extension`, `biceps_curl`, `calf_raise`.

## Contrato de salida esperado

La salida ideal del motor debe ser JSON puro y validable:

```json
{
  "contract_version": "kalos_training_plan.v1",
  "plan_id": "plan_anon_123",
  "input_summary": {
    "days_per_week": 4,
    "goal": "hypertrophy",
    "priority": "glutes",
    "experience": "intermediate",
    "time_budget_minutes": 75,
    "equipment_scope": ["machine", "cable", "dumbbell"],
    "constraints_applied": []
  },
  "program": {
    "name": "Hipertrofia glúteo dominante 4 días",
    "duration_weeks": 8,
    "split": ["Inferior A", "Superior A", "Inferior B", "Superior B"],
    "weekly_volume_targets": {
      "glutes": 16,
      "quads": 12,
      "hamstrings": 10,
      "back": 10,
      "chest": 8,
      "shoulders": 10,
      "biceps": 6,
      "triceps": 6,
      "calves": 8
    },
    "progression": {
      "model": "double_progression",
      "weeks": 8,
      "rir_start": 2,
      "rir_end": 0,
      "deload_week": 5,
      "load_rule": "When all sets reach top reps at target RIR, increase load next exposure."
    },
    "sessions": []
  },
  "quality_checks": {
    "status": "pass",
    "warnings": [],
    "volume_within_limits": true,
    "frequency_within_limits": true,
    "fatigue_within_limits": true,
    "equipment_available": true,
    "constraints_respected": true,
    "duplicate_exercises_justified": true
  }
}
```

### Campos obligatorios por sesión

```json
{
  "session_id": "session_1",
  "day_number": 1,
  "label": "Inferior A",
  "intent": "glute_dominant_heavy",
  "target_muscles": ["glutes", "quads", "hamstrings"],
  "estimated_minutes": 72,
  "fatigue_points": 11,
  "exercises": []
}
```

Obligatorios:

- `session_id`
- `day_number`
- `label`
- `intent`
- `target_muscles`
- `estimated_minutes`
- `fatigue_points`
- `exercises`

### Campos obligatorios por ejercicio

```json
{
  "order": 1,
  "exercise_id": "exercise_hip_thrust",
  "exercise_name": "Hip thrust",
  "primary_muscle": "glutes",
  "secondary_muscles": ["hamstrings"],
  "movement_pattern": "hip_thrust",
  "role": "anchor",
  "sets": 3,
  "rep_range": { "min": 8, "max": 10 },
  "rir_target": { "min": 1, "max": 2 },
  "rest_seconds": 180,
  "fatigue_cost": "high",
  "equipment": "barbell",
  "joint_stress": ["hip", "lumbar"],
  "substitution_group": "hip_thrust_glutes",
  "weekly_set_contribution": { "glutes": 3 },
  "repeat_justification": null,
  "coaching_note": "Mantén control pélvico y pausa breve arriba."
}
```

Obligatorios:

- `order`
- `exercise_id`
- `exercise_name`
- `primary_muscle`
- `movement_pattern`
- `role`
- `sets`
- `rep_range`
- `rir_target`
- `rest_seconds`
- `fatigue_cost`
- `equipment`
- `joint_stress`
- `substitution_group`
- `weekly_set_contribution`

## Validaciones antes de mostrar al usuario

El plan no puede mostrarse si falla cualquiera de estas validaciones:

- `days_per_week` coincide con número de sesiones.
- Cada sesión tiene exactamente un `day_number` único.
- Cada sesión tiene al menos 1 ancla salvo sesiones recovery/core.
- Todo ejercicio existe en catálogo y tiene taxonomía completa.
- Todo equipo requerido está disponible.
- No hay ejercicios excluidos por usuario.
- No hay ejercicios incompatibles con lesiones/restricciones.
- Volumen semanal por músculo está dentro del límite por experiencia.
- Frecuencia por músculo está dentro del límite por experiencia.
- Fatiga por sesión está dentro del límite por experiencia.
- No hay duplicados exactos no justificados.
- No hay más de 2 ejercicios con alto estrés lumbar en una sesión.
- RIR está dentro del rango permitido.
- Descanso está dentro de 30-300 segundos, salvo cardio.
- `estimated_minutes` no excede `time_budget_minutes` por más de 10%.
- El plan incluye `quality_checks.status`.

Validaciones que pueden pasar con advertencia:

- Equipo limitado forzó sustituciones.
- Preferencias del usuario redujeron variedad.
- Tiempo disponible obliga a bajar volumen.
- Prioridad estética compite con objetivo de salud general.
- Falta información de experiencia o restricciones.

## Criterios de seguridad

### Casos que deben mostrar advertencia

Mostrar advertencia no bloqueante cuando:

- Usuario reporta dolor leve o molestia recurrente.
- Usuario tiene experiencia beginner y solicita 6-7 días.
- Usuario pide RIR 0 en todos los ejercicios.
- Usuario pide volumen por encima del máximo.
- Usuario busca pérdida de grasa con volumen extremo.
- Usuario tiene equipo limitado y el plan requiere sustituciones relevantes.
- Usuario solicita ejercicios técnicamente avanzados sin experiencia declarada.

### Casos que la IA no debe resolver

La IA debe rechazar o derivar a profesional si el usuario reporta:

- Dolor torácico, desmayo, mareos severos o falta de aire inusual.
- Dolor agudo articular o muscular durante ejercicio.
- Lesión reciente sin alta médica.
- Posoperatorio o rehabilitación clínica.
- Embarazo de riesgo o posparto inmediato sin autorización.
- Diagnóstico cardiovascular, neurológico o metabólico no controlado.
- Sospecha de trastorno alimentario o solicitud extrema de pérdida de peso.
- Uso de fármacos o sustancias para rendimiento con consulta médica implícita.

La IA no debe:

- Diagnosticar lesiones.
- Prescribir rehabilitación médica.
- Prometer resultados estéticos garantizados.
- Recomendar entrenar con dolor agudo.
- Forzar fallo muscular sistemático.
- Ocultar riesgos por mantener una rutina "más intensa".

### Límites de RIR

- Beginner: RIR mínimo 1 en básicos; RIR 0 solo en aislamientos seguros y opcional.
- Intermediate: RIR 0 permitido en accesorios/aislamientos; básicos preferir 0-2.
- Advanced: RIR 0 permitido de forma estratégica; no en todos los ejercicios ni todas las semanas.
- Dolor/restricción: RIR mínimo 2 y evitar ejercicios de alto estrés en zona afectada.

### Límites de volumen

- No superar límites absolutos por experiencia.
- No subir más de 20% el volumen semanal respecto a historial conocido.
- Si no hay historial, usar el rango bajo del nivel declarado.
- No asignar alto volumen a más de 2 grupos prioritarios simultáneos.

### Límites de frecuencia

- Beginner: máximo 4 días salvo preferencia explícita y volumen bajo.
- 7 días: siempre debe incluir recovery/core/cardio suave, no 7 sesiones duras.
- Músculo prioritario puede entrenarse 3 veces; 4 solo advanced y con volumen distribuido.
- No repetir estímulo pesado del mismo patrón en días consecutivos.

## Responsabilidades por capa

Backend:

- Validar input.
- Ejecutar motor determinista.
- Calcular volumen, frecuencia, fatiga y tiempo.
- Validar contrato final.
- Persistir solo datos necesarios y seguros.

IA:

- Explicar decisiones.
- Sugerir sustituciones dentro de grupos permitidos.
- Adaptar tono y coaching notes.
- Nunca crear estructura saltándose reglas.

Frontend:

- Recoger inputs mínimos.
- Mostrar advertencias y restricciones.
- Mostrar calidad del plan y razones de sustitución.
- Permitir editar preferencias sin romper validaciones.

## Criterio de aceptación para implementación futura

Una implementación cumple esta especificación si:

- Genera planes válidos para 1-7 días.
- Cambia split y volumen según objetivo, prioridad y experiencia.
- Usa anclas, accesorios, aislamientos y finishers de forma explícita.
- Evita repeticiones exactas salvo justificación.
- Aplica límites de fatiga y volumen antes de mostrar la rutina.
- Devuelve JSON con `quality_checks`.
- Bloquea o advierte casos de seguridad.
- Puede ser probado con fixtures de perfiles beginner/intermediate/advanced para torso, pierna, glúteo y balance.
