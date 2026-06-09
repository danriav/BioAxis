# Auditoría y modelado de rutinas de referencia Kalos

Fecha: 2026-05-29

Este reporte analiza las rutinas humanas de referencia y las compara contra el generador actual. Los archivos fuente con nombres personales se citan con alias anonimizados (`manual_reference_01.xlsx` a `manual_reference_04.xlsx`). No se modificó código productivo, prompts productivos ni rutinas originales.

## Alcance

Fuentes humanas:

- `manual_reference_01.xlsx`
- `manual_reference_02.xlsx`
- `manual_reference_03.xlsx`
- `manual_reference_04.xlsx`

Fuentes generadas o derivadas:

- `usuarios_medidas_para_entrenamiento.csv`
- `rutinas_para_entrenamiento.csv`
- `docs/training-data/clean_training_dataset.jsonl`
- `docs/training-data/clean_training_dataset_summary.json`

Código revisado solo para diagnóstico:

- `frontend/src/lib/engine/routine-generator.ts`
- `frontend/src/lib/engine/master-dataset.ts`
- `backend/app/schemas/training.py`

## Hallazgos de rutinas humanas

Las rutinas humanas no son simples listas de ejercicios. Tienen una lógica clara de sesión: abren con movimientos de mayor demanda o mayor prioridad, luego bajan hacia accesorios, aislamiento y músculos pequeños.

Estructuras humanas observadas:

| Frecuencia | Estructuras típicas |
| --- | --- |
| 3 días | Empuje, Pierna, Tracción; o Inferior, Superior, Inferior |
| 4 días | Pierna, Superior, Pierna, Superior; o Pierna, Empuje, Tracción, Pierna |
| 5 días | Pierna, Empuje, Pierna, Tracción, Pierna; o Pierna, Empuje, Tracción, Pierna, Superior |

Patrón principal:

- En perfiles con sesgo inferior/glúteo, la semana repite pierna 2-3 veces.
- En perfiles con sesgo torso, se conservan empuje/tracción y superior, con pecho/espalda/brazos más presentes.
- Las sesiones suelen tener 5-13 ejercicios, promedio 6.77.
- El orden de sesión se mantiene bastante estable: compuesto o prioridad primero, accesorio después, aislamiento al final.

Ejercicios que más aparecen en referencias humanas:

| Ejercicio | Conteo |
| --- | ---: |
| Elevaciones de talón | 20 |
| Aductores | 13 |
| Hip thrust | 11 |
| Extensión de cuádriceps | 11 |
| Curl femoral sentado | 11 |
| Press inclinado con mancuernas | 10 |
| Curl predicador | 10 |
| Abductores | 10 |
| Peso muerto rumano con barra | 9 |
| Press militar | 9 |

Inicio de sesión:

- Pierna/inferior suele iniciar con hip thrust, sentadilla hack, sentadilla libre o búlgaras.
- Empuje suele iniciar con press inclinado o press militar.
- Tracción suele iniciar con jalón al pecho o remo.
- Superior alterna entre pecho, espalda y hombro frontal como primer bloque según la intención del día.

## Volumen, intensidad y descansos

Descansos:

- 120 segundos: 147 apariciones.
- 180 segundos: 122 apariciones.
- 60 segundos: 22 apariciones.

Lectura:

- Multiarticulares pesados y básicos: 180 segundos.
- Accesorios principales: 120 segundos.
- Aislamientos muy locales, abdomen o remates: 60-120 segundos.

RIR:

- RIR 0: 127 apariciones.
- RIR 1-2: 85 apariciones.
- RIR 0-1: 54 apariciones.
- RIR 2-3: aparece en trabajo menos prioritario o de menor agresividad.

Rangos de repeticiones:

- 8-10 y 10-12 son los rangos centrales.
- 6-8 se usa para básicos pesados.
- 12-15 aparece en accesorios, pantorrilla, abductores/aductores y trabajo de bombeo.
- Hay señales humanas de técnicas puntuales como drop set, pero no una progresión longitudinal completa.

## Reglas humanas extraídas

1. Seleccionar split por frecuencia y prioridad corporal
   - 1 día: full body.
   - 2 días: inferior/superior.
   - 3 días: inferior/superior/inferior si el objetivo prioriza glúteo-pierna; empuje/pierna/tracción si se busca balance o torso.
   - 4 días: pierna/superior/pierna/superior o pierna/empuje/tracción/pierna.
   - 5 días: repetir pierna o el bloque prioritario, no solo añadir días genéricos.

2. Ordenar por intención, no por rotación mecánica
   - Primer ejercicio: patrón más importante del día o mayor carga.
   - Segundo-tercero: segundo patrón grande o accesorio con alta transferencia.
   - Mitad de sesión: aislamientos grandes o músculos secundarios.
   - Final: pantorrilla, abductores/aductores, brazos, abdomen o técnicas de bombeo.

3. Distribuir volumen por rol muscular
   - Prioridad alta: 12-18 series semanales.
   - Mantenimiento/soporte: 6-12 series semanales.
   - Músculo pequeño o accesorio: 3-10 series semanales.
   - Evitar que todos los grupos reciban volumen alto simultáneamente.

4. Mantener frecuencia coherente
   - Glúteo, cuádriceps, femoral y pantorrilla: normalmente 2 días por semana, 3 si son prioridad.
   - Pecho, espalda, hombros: 1-2 días por semana según objetivo.
   - Brazos: 1-2 estímulos, muchas veces integrados en empuje/tracción o superior.

5. Asignar descansos por tipo de ejercicio
   - Básico pesado: 180 segundos.
   - Accesorio principal: 120-180 segundos.
   - Aislamiento: 60-120 segundos.

6. Usar RIR como control de esfuerzo
   - Básicos: RIR 0-2.
   - Accesorios: RIR 0-2.
   - Trabajo sensible o menos prioritario: RIR 2-3.
   - No prescribir fallo absoluto indiscriminadamente.

## Comparación con rutinas generadas

Lo que la IA/generador ya copia bien:

- Reconoce splits básicos: full body, upper/lower, push/pull/legs.
- Usa rangos de hipertrofia razonables: 6-8, 8-10, 10-12.
- Asigna 180 segundos a músculos grandes y 120 segundos a accesorios.
- Incluye ejercicios centrales de las referencias: hip thrust, sentadilla hack, press inclinado, jalón, remo, curl femoral, elevaciones laterales, abductores/aductores, pantorrilla.
- Usa medidas corporales para priorizar hombros/espalda en hombre y glúteo/hombros en mujer.

Lo que repite demasiado:

- El generador actual tiende a llenar sesiones ciclando músculos objetivo y tomando el primer ejercicio disponible del catálogo.
- Las rutinas generadas sobreusan ejercicios de polea o variantes concretas cuando aparecen primero o son muy frecuentes en el catálogo.
- Top generado muestra repeticiones muy altas: elevaciones laterales en polea, curl Bayesian, peso muerto rumano, talón de pie, step up, búlgaras.
- La lógica de cardio se inyecta por tiempo disponible y puede aparecer en todas las sesiones largas, no como decisión programática semanal.

Decisiones humanas que la IA no entiende todavía:

- Diferencia entre "primer ejercicio por prioridad" y "primer ejercicio encontrado".
- Alternancia entre variantes de rodilla y cadera dentro de semanas con varias piernas.
- Uso de superior como día mixto de balance, no solo como suma de músculos.
- Ajuste fino de pecho bajo en rutinas con prioridad glúteo-pierna.
- Uso de técnicas como drop set en ejercicios puntuales, no como propiedad global.
- Separación entre estímulo pesado, accesorio estable y remate metabólico.

Errores o riesgos de variedad, volumen y selección:

- Volumen demasiado uniforme: muchos grupos quedan cerca de rangos medios-altos aunque no sean prioridad.
- Falta de rotación por patrón: dos días de pierna pueden parecerse demasiado si ambos usan los mismos básicos.
- Falta de control por articulación: demasiados presses o demasiada bisagra pueden acumular fatiga local.
- No hay memoria de ejercicios usados recientemente dentro del plan.
- No se usa `_priorities` dentro de `fillSessionToBudget`; se calcula prioridad estética, pero la selección no la aplica realmente.
- `fitnessLevel` y `focus` aparecen como inputs, pero no gobiernan volumen, dificultad, ejercicio ni progresión en el generador actual.

## Brechas del generador actual

1. Selección de ejercicios
   - Usa `catalog.find` y toma la primera coincidencia por músculo.
   - Falta scoring por patrón, prioridad, fatiga, biomecánica, equipamiento, nivel y variedad.

2. Prioridades corporales
   - Calcula prioridades, pero no las usa para cambiar volumen ni orden.
   - La prioridad debería afectar series, frecuencia, primer ejercicio y selección de variantes.

3. Progresión
   - No hay mesociclo explícito.
   - No hay doble progresión, deload, ni progresión de RIR.
   - El campo `totalDayMins` es estimado por series, no por ejercicios/rest real.

4. Diferenciación por sexo/biotipo
   - Hay splits diferentes en `master-dataset.ts`, pero el motor actual usa reglas generales.
   - La lógica hombre/mujer se reduce a ratios estéticos y mensaje, sin suficiente impacto programático.

5. Seguridad y límites
   - No se observan filtros por dolor, lesión, equipo disponible, experiencia o contraindicaciones.
   - No hay advertencias médicas ni redirección a profesional ante dolor, embarazo, hipertensión, posquirúrgico, lesión o enfermedad.

6. Contrato backend
   - `TrainingPlanCreate.frequency_days` limita frecuencia a 3-6.
   - Las referencias y dataset incluyen estructuras de 1, 2 y 7 días.

## Taxonomía propuesta de ejercicios

Cada ejercicio debería tener metadatos mínimos:

- `movement_pattern`: squat, hinge, hip_thrust, horizontal_push, vertical_push, horizontal_pull, vertical_pull, knee_extension, knee_flexion, abduction, adduction, calf_raise, elbow_flexion, elbow_extension, core, cardio.
- `primary_muscle`
- `secondary_muscles`
- `joint_stress`: knee, hip, lumbar, shoulder, elbow, wrist, ankle.
- `loading_profile`: stretch, shortened, mid_range, mixed.
- `skill_level`: novice, intermediate, advanced.
- `fatigue_cost`: low, medium, high.
- `equipment`: machine, cable, dumbbell, barbell, bodyweight, band.
- `role`: primary, secondary, accessory, finisher.
- `substitution_group`: stable family for swaps.

## Criterios para variar sin perder coherencia

- No cambiar el patrón si el objetivo del día exige continuidad; cambiar variante dentro de la misma familia.
- Alternar rodilla/cadera en piernas múltiples: hack/prensa/extensión vs hip thrust/RDL/curl femoral.
- Alternar jalón y remo en tracción.
- Alternar press inclinado/plano y aperturas en empuje.
- Mantener al menos un ejercicio ancla por músculo prioritario durante 4-8 semanas.
- Variar accesorios y remates con más libertad.
- Evitar repetir el mismo ejercicio exacto más de 2 veces por semana salvo que sea una decisión explícita.
- No usar cardio como relleno automático diario; asignarlo por objetivo metabólico, recuperación y tolerancia.

## Plantilla ideal de rutina Kalos

```json
{
  "program": {
    "frequency_days": 4,
    "split": ["Inferior A", "Superior A", "Inferior B", "Superior B"],
    "duration_weeks": 8,
    "progression": {
      "model": "double_progression",
      "rir_week_1": 2,
      "rir_week_4": 0,
      "deload_week": 5
    },
    "weekly_volume_targets": {
      "glutes": 16,
      "quads": 12,
      "hamstrings": 10,
      "chest": 8,
      "back": 10,
      "shoulders": 10
    },
    "sessions": [
      {
        "day": 1,
        "label": "Inferior A",
        "intent": "glute_dominant_heavy",
        "exercises": [
          {
            "order": 1,
            "role": "primary",
            "movement_pattern": "hip_thrust",
            "sets": 3,
            "reps": "8-10",
            "rir": "1-2",
            "rest_seconds": 180
          }
        ]
      }
    ]
  }
}
```

## Inputs necesarios desde perfil

Obligatorios:

- Frecuencia semanal disponible.
- Tiempo por sesión.
- Objetivo: hipertrofia, recomposición, pérdida de grasa, fuerza-hipertrofia o salud general.
- Nivel de experiencia.
- Sexo o preferencia de referencia corporal, si el usuario desea personalización estética.
- Equipamiento disponible.
- Lesiones, dolor, restricciones y ejercicios excluidos.

Deseables:

- Historial de entrenamiento.
- Ejercicios preferidos.
- Ejercicios recientes para evitar repetición.
- Medidas corporales en buckets o ratios derivados.
- Adherencia esperada y recuperación.
- Sueño, estrés y tolerancia a volumen.

No recomendado para almacenar sin necesidad:

- Medidas exactas identificables.
- Diagnósticos médicos detallados.
- Fotos o datos biométricos sensibles sin consentimiento explícito.

## Recomendaciones Backend/IA

Backend:

- Ajustar contrato para soportar 1-7 días o decidir explícitamente que producción solo permite 3-6.
- Agregar validadores de volumen semanal por músculo.
- Agregar validadores de frecuencia por músculo.
- Agregar `movement_pattern`, `exercise_role`, `fatigue_cost`, `equipment`, `joint_stress` y `substitution_group`.
- Agregar quality checks: duplicados, exceso de series, exceso de patrones similares, descanso incompatible, sesiones fuera del tiempo.

IA:

- Usar IA solo después de que el motor determinista arme estructura, volumen y límites.
- Usar RAG con ejemplos anonimizados para estilo humano, orden, variación y sustituciones.
- No permitir que IA sobreescriba contraindicaciones, volumen máximo ni exclusiones.
- Solicitar explicación breve cuando el plan cambie por medidas/objetivo, pero evitar lenguaje médico o diagnóstico.

Generador:

- Reemplazar `catalog.find` por ranking.
- Usar prioridades en selección real, orden y volumen.
- Separar split selection, volume allocation, exercise selection, progression y explanation.
- Añadir memoria intra-plan para evitar repeticiones excesivas.
- Programar cardio por objetivo semanal, no como inyección automática por sesión larga.

## Riesgos de seguridad y límites médicos

- No prescribir entrenamiento ante dolor agudo, lesión reciente, posoperatorio, embarazo de riesgo o condición médica sin recomendar evaluación profesional.
- No diagnosticar asimetrías, patologías ni composición corporal.
- No prometer reducción localizada de grasa.
- No usar medidas corporales para lenguaje corporal negativo.
- No llevar todos los ejercicios a RIR 0 en principiantes.
- No combinar volumen alto, frecuencia alta y fallo frecuente sin control de recuperación.
- Incluir advertencias cuando el usuario reporte mareos, dolor torácico, pérdida de fuerza repentina, dolor articular persistente o síntomas neurológicos.

## Propuesta de siguiente implementación

Fase 1: Motor determinista

- Crear módulo de programación con splits por frecuencia/objetivo.
- Crear asignador de volumen semanal por prioridad.
- Crear selector de ejercicios con scoring.
- Añadir validadores de volumen, frecuencia, duplicados y tiempo.

Fase 2: Taxonomía

- Enriquecer catálogo de ejercicios con patrones, roles, fatiga, estrés articular y sustituciones.
- Mapear ejercicios actuales del dataset limpio.
- Crear grupos de sustitución por patrón y músculo.

Fase 3: RAG controlado

- Indexar ejemplos anonimizados por sexo, objetivo, frecuencia, ratio bucket, experiencia y split.
- Recuperar ejemplos solo para guiar estilo/orden, no para copiar planes completos.

Fase 4: Progresión

- Implementar doble progresión.
- Añadir progresión de RIR por semana.
- Añadir semana de descarga y criterios de ajuste.

Fase 5: Integración IA

- IA genera explicación, notas y alternativas.
- Motor valida salida final contra contrato y reglas.
- Si falla validación, se repara con reglas deterministas antes de mostrar al usuario.

## Cierre

La firma humana de Kalos no es solo una lista de ejercicios frecuentes. Es una combinación de prioridad estética, estructura semanal, orden por intención, fatiga controlada, descansos por tipo de ejercicio y variación por patrón. El generador actual ya captura varios ingredientes, pero necesita una capa determinista más fuerte para que la IA no confunda repetición de ejemplos con programación real.
