# Auditoría práctica de rutinas generadas por Kalos

Fecha: 2026-06-08

Actualización de matriz: 2026-06-09

Alcance: revisión coach/técnica de rutinas generadas por Kalos para perfiles sintéticos, usando como eje de adaptación los ratios antropométricos. No se modificó código, prompts productivos, datasets ni archivos originales de `Rutinas_de_referencia/`.

## Resumen ejecutivo

Dictamen MVP: **APTO para MVP controlado con guardrails coach**.

Kalos ya genera planes razonables en varios escenarios compactos y balanceados. La estructura semanal suele ser coherente, los ratios sí cambian la prioridad muscular esperada, el RIR por nivel está generalmente dentro de rangos seguros y la fatiga por sesión se mantiene controlada. El caso más sólido observado es `balanced`, 3-4 días, 45-75 min, nivel intermedio.

La matriz actual ya no muestra fallas técnicas del motor:

- **0 de 216 casos quedaron bloqueados técnicamente** por falla del motor o `invalid_generated_plan`.
- **128 de 216 rutinas quedaron aprobadas** sin observación coach relevante.
- **88 de 216 rutinas son válidas pero mejorables** por criterio coach.
- El ratio `torso` ya no bloquea técnicamente; sus observaciones vigentes se concentran en densidad de sesión.
- El ratio `glutes_legs` ya no deja cuádriceps en 0 en la matriz actual.
- En 75-120 min, la observación vigente principal es densidad baja frente al tiempo disponible, especialmente en beginner.

Conclusión: Kalos ya puede considerarse viable para MVP si Backend separa bloqueo técnico de observación coach y aplica guardrails mínimos antes de mostrar la rutina.

## Matriz de casos probados

Se evaluó una matriz sintética de **216 combinaciones**:

- Género: hombre, mujer.
- Experiencia: beginner, intermediate, advanced.
- Frecuencia: 3, 4, 5 y 6 días.
- Tiempo: 45, 75 y 120 min.
- Ratio/prioridad: balanced, torso, glutes_legs.

Resultado global actual:

| Estado | Casos | Lectura práctica |
|---|---:|---|
| Aprobadas | 128 | Rutinas viables sin observaciones mayores. |
| Observación coach | 88 | Rutinas válidas, pero mejorables por densidad o proporción. |
| Bloqueo técnico | 0 | No hubo falla del motor ni `invalid_generated_plan`. |

Distribución relevante:

| Dimensión | Hallazgo |
|---|---|
| Beginner | 12 aprobadas, 60 observaciones coach, 0 bloqueos técnicos. Es el nivel más sensible por densidad. |
| Intermediate | 56 aprobadas, 16 observaciones coach, 0 bloqueos técnicos. Mejor equilibrio general. |
| Advanced | 60 aprobadas, 12 observaciones coach, 0 bloqueos técnicos. Buena estabilidad técnica. |
| Balanced | 54 aprobadas, 18 observaciones coach, 0 bloqueos técnicos. Es el modo más estable. |
| Torso | 36 aprobadas, 36 observaciones coach, 0 bloqueos técnicos. La deuda vigente es densidad, no bloqueo. |
| Glutes/legs | 38 aprobadas, 34 observaciones coach, 0 bloqueos técnicos. Cuádriceps en 0 ya no aparece. |

## Actualización 2026-06-09

### Bloqueo técnico vs observación coach

**Bloqueo técnico** significa que la rutina no debe llegar al usuario porque el motor falló, lanzó excepción o el validador devolvió `invalid_generated_plan`. En la matriz actual hay **0/216 bloqueos técnicos**.

**Observación coach** significa que la rutina es válida y puede mostrarse, pero tiene una decisión mejorable desde ciencia del entrenamiento: densidad baja, prioridad no dominante o uso incompleto del tiempo disponible. En la matriz actual hay **88/216 rutinas con observación coach**.

Resultado actual:

| Estado | Casos | Acción recomendada |
|---|---:|---|
| Aprobada | 128 | Mostrar normalmente. |
| Observación coach | 88 | Mostrar en MVP si no viola pisos bloqueantes; idealmente ajustar densidad antes de mostrar. |
| Bloqueo técnico | 0 | No hay casos vigentes. |

### Observaciones coach vigentes

Las observaciones se cuentan por evento, no solo por rutina, porque una misma rutina puede tener varias sesiones subdensas.

| Observación | Eventos | Lectura |
|---|---:|---|
| `density_low` | 186 | Hay sesiones válidas pero con menos ejercicios de los esperados para el tiempo. |
| `glutes_legs_priority_not_dominant` | 21 | El ratio lower no siempre domina cuando el tiempo permite más volumen. |

Ejemplos concretos vigentes:

- hombre, beginner, 3d, 75 min, balanced: Full Body A y B quedan en 4 ejercicios para 75 min; RIR seguro, pero densidad baja.
- hombre, beginner, 4d, 120 min, balanced: varias sesiones quedan en 4 ejercicios aunque el usuario pidió 120 min.
- mujer, beginner, 5d, 75 min, glutes_legs: aparecen sesiones de 4 ejercicios y un `Core Recovery` de 1 ejercicio; técnicamente válido, pero subutiliza tiempo.
- hombre, beginner, 6d, 120 min, torso: Push y Legs quedan en 4 ejercicios y Upper en 5; la prioridad está estructurada, pero la densidad no acompaña 120 min.
- `glutes_legs` ya no presenta cuádriceps en 0; la observación vigente es que en algunos casos la prioridad lower no domina tanto como debería cuando hay 75-120 min disponibles.

### Umbrales mínimos aceptables por prioridad

Estos umbrales son criterios coach. No son equivalentes a bloqueo técnico del motor, pero sí deben decidir si la rutina se muestra, se ajusta o se bloquea por calidad.

| Prioridad | Mínimo aceptable | Debe bloquear por calidad si... |
|---|---|---|
| `balanced` | Pecho, espalda, hombros, cuádriceps, femorales y glúteos no deben quedar en 0 series directas semanales. | Cualquier músculo base queda en 0, salvo restricción médica/equipo explícita. |
| `glutes_legs` | Glúteos/femorales/abductores pueden dominar, pero cuádriceps debe conservar piso mínimo. | Cuádriceps queda en 0 o por debajo del piso de tiempo en rutinas de hipertrofia. |
| `torso` | Espalda/hombros pueden dominar, pero pecho y pierna de mantenimiento deben conservar piso mínimo. | Pecho queda en 0 o pierna total queda por debajo del piso de mantenimiento. |

Pisos prácticos por tiempo:

| Tiempo | Piso músculo base | Piso cuádriceps en `glutes_legs` | Piso pierna total en `torso` |
|---|---:|---:|---:|
| 45 min | 2 series directas | 2 series | 4 series entre quads/femorales/glúteos |
| 75 min | 4 series directas | 4 series | 8 series entre quads/femorales/glúteos |
| 120 min | 6 series directas | 6 series | 12 series entre quads/femorales/glúteos |

### Densidad esperada por tiempo

| Tiempo | Densidad esperada | Aceptable para MVP | Debe ajustar/bloquear por calidad si... |
|---|---|---|---|
| 45 min | 3-4 ejercicios por sesión. | 3 ejercicios si hay anchor + accesorio + aislamiento o patrón complementario. | 1-2 ejercicios en una sesión normal no recovery. |
| 75 min | 5-6 ejercicios por sesión. | 4 ejercicios solo en beginner o si la fatiga ya está en techo seguro. | 4 ejercicios repetidos en varias sesiones sin razón; 1-3 ejercicios en sesión normal. |
| 120 min | 6-8 ejercicios o 5 ejercicios + bloque técnico/core/movilidad. | 5 ejercicios si hay fatiga alta y buen volumen semanal. | 4 o menos ejercicios sin bloque complementario; estimación de duración muy por debajo del tiempo pedido. |

### MVP: observaciones aceptables vs bloqueantes

Aceptables para MVP:

- Densidad ligeramente baja en beginner si el RIR y la fatiga son conservadores.
- Brazos, calves, abductores/aductores o core con volumen bajo cuando el tiempo es 45 min.
- Prioridad ratio moderada que no domine completamente, si los pisos base están cubiertos.
- Sesiones de 75 min con 4 ejercicios cuando la sesión tiene anchor pesado, accesorio principal y suficiente volumen semanal.

Deben bloquear o autoajustar antes de mostrarse:

- Cualquier bloqueo técnico, excepción del motor o `invalid_generated_plan`.
- `balanced` con pecho, espalda, hombros, cuádriceps, femorales o glúteos en 0.
- `glutes_legs` con cuádriceps en 0 o por debajo del piso mínimo.
- `torso` con pecho en 0 o pierna total bajo piso de mantenimiento.
- Beginner con RIR 0.
- Anchor pesado con RIR 0.
- Sesión normal de 75/120 min con 1-3 ejercicios sin justificación de equipo, dolor, recovery o fatiga.

### Hallazgos ya corregidos por cambios recientes

1. **Bloqueos técnicos corregidos.** La matriz pasó de 34 bloqueos técnicos a 0/216.

2. **Errores de esquema por hombros corregidos.** Ya no aparece `weekly_volume_targets.shoulders` por encima del máximo del contrato.

3. **Advanced ya no bloquea.** Todos los casos advanced generan una rutina válida; las deudas restantes son coach.

4. **Torso 3d 45 intermedio mejoró de forma importante.** Ahora genera `Push / Legs / Pull`, con chest, back, quads, hamstrings y glutes directos.

5. **Balanced 4d 75 cubre brazos directos.** El caso mujer, intermediate, 4d, 75 min, balanced genera bíceps 3 y tríceps 6, además de chest/back/shoulders/quads/hamstrings/glutes.

6. **`glutes_legs` ya no deja cuádriceps en 0.** Los ejemplos antiguos con `quads 0` se conservan solo como histórico corregido; no aparecen en la matriz vigente.

### Top 5 reglas que Backend debe implementar primero

1. **Separar estado técnico de estado coach.**
   - `technical_block`: excepción, motor fallido o `invalid_generated_plan`.
   - `coach_observation`: plan válido pero mejorable.
   - `coach_block`: plan válido técnicamente pero no mostrable por violar pisos mínimos.

2. **Completar densidad por tiempo sin romper fatiga.**
   - 75 min: buscar 5-6 ejercicios en sesiones normales.
   - 120 min: buscar 6-8 ejercicios o bloque técnico/core/movilidad.
   - Si no se puede agregar carga útil, devolver nota interna de densidad limitada.

3. **Aplicar pisos musculares antes del bonus por ratio.**
   - Primero cubrir mínimos base.
   - Después aplicar prioridad por ratio.
   - Nunca permitir que el ratio borre un patrón esencial.

4. **Mantener `glutes_legs` con cuádriceps protegido como regresión test.**
   - La matriz vigente ya no muestra `quads 0`.
   - Mantener test para que no regrese.
   - Si cuádriceps cae bajo, insertar patrón knee-dominant antes de agregar más abductores/finishers.

5. **Autoajustar `torso` si pecho o pierna quedan bajos.**
   - Mantener espalda/hombro como prioridad.
   - Reservar piso para pecho y lower maintenance.
   - Sacrificar brazos/forearms/finishers antes que pierna mínima.

## Rutinas aprobadas

### Ejemplo 1: hombre, beginner, 3 días, 45 min, balanced

Split generado:

- Full Body A
- Full Body B
- Full Body C

Volumen semanal directo:

| Músculo | Series |
|---|---:|
| quads | 6 |
| glutes | 3 |
| chest | 2 |
| back | 2 |
| shoulders | 2 |
| biceps | 2 |
| triceps | 2 |
| hamstrings | 2 |

Sesiones ejemplo:

- Full Body A: Sentadilla con Barra, Press Landmine, Fondos en Banco.
- Full Body B: Hip Thrust, Peso Muerto Rumano, Elevaciones Laterales en Polea.
- Full Body C: Sentadilla Goblet, Dominadas Asistidas, Curl Bayesian.

Dictamen coach: aprobado para 45 min beginner. Es simple, tolerable y no intenta meter volumen avanzado. El estímulo es mínimo, pero aceptable para una rutina de entrada.

### Ejemplo 2: hombre, intermediate, 3 días, 75 min, balanced

Split generado:

- Full Body A
- Full Body B
- Full Body C

Volumen semanal directo:

| Músculo | Series |
|---|---:|
| chest | 9 |
| quads | 9 |
| biceps | 6 |
| shoulders | 6 |
| triceps | 6 |
| back | 3 |
| glutes | 3 |
| hamstrings | 3 |

Densidad y fatiga:

| Día | Ejercicios | Fatiga | Min estimados |
|---|---:|---:|---:|
| Full Body A | 5 | 9 | 70 |
| Full Body B | 5 | 10 | 70 |
| Full Body C | 5 | 8 | 70 |

Dictamen coach: aprobado con matiz. Es realizable en 75 min, tiene densidad suficiente y respeta una estructura full body. La mejora pendiente sería subir espalda a mantenimiento más robusto cuando el objetivo es hipertrofia balanceada.

### Ejemplo 3: hombre, advanced, 6 días, 120 min, torso

Split generado:

- Push A
- Pull A
- Legs
- Push B
- Pull B
- Upper Arms

Volumen semanal directo:

| Músculo | Series |
|---|---:|
| back | 18 |
| shoulders | 14 |
| biceps | 10 |
| triceps | 10 |
| chest | 8 |
| forearms | 8 |
| quads | 4 |
| glutes | 2 |
| hamstrings | 2 |
| abductors/adductors/calves | 2 cada uno |

Dictamen coach: observado, no bloqueado. El énfasis en espalda/hombro tiene sentido por ratio y ya no rompe contrato de hombro, pero la suma de quads+hamstrings+glutes queda baja para 6 días y 120 min. Debe conservar más pierna de mantenimiento aunque la prioridad sea torso.

## Rutinas con observaciones

### Observación 1: beginner, 3 días, 75 min, balanced

Split:

- Full Body A
- Full Body B
- Full Body C

Densidad observada:

| Día | Ejercicios | Fatiga | Min estimados |
|---|---:|---:|---:|
| Full Body A | 4 | 8 | 60 |
| Full Body B | 4 | 8 | 60 |
| Full Body C | 5 | 7 | 70 |

Ejercicios:

- Full Body A: Sentadilla con Barra, Press Landmine, Fondos en Banco, Elevaciones Laterales en Polea.
- Full Body B: Hip Thrust, Peso Muerto Rumano, Aperturas Inclinadas en Polea, Face Pull.

Dictamen coach: usable, pero subutiliza el tiempo. Para 75 min debería tener 5 ejercicios por sesión o agregar trabajo técnico ligero, core, calves o movilidad activa sin elevar demasiado la fatiga.

### Observación 2: hombre, beginner, 3 días, 75 min, torso

Split:

- Push
- Legs
- Pull

Volumen semanal directo:

| Músculo | Series |
|---|---:|
| back | 6 |
| shoulders | 6 |
| chest | 3 |
| quads | 3 |
| glutes | 2 |
| hamstrings | 2 |
| biceps | 2 |
| triceps | 2 |
| calves | 2 |

Dictamen coach: observación importante. El ratio torso incrementa espalda/hombro y ya conserva una sesión de piernas, pero pecho queda en 3 series y quads+hamstrings+glutes suman 7 contra un piso esperado de 8 para 75 min. Además Push y Legs quedan en 4 ejercicios, bajos para el tiempo disponible.

## Histórico corregido

### Histórico corregido 1: mujer, intermediate, 4 días, 75 min, glutes_legs con quads 0

Estado actual: **corregido en la matriz vigente**. Ya no aparecen casos `glutes_legs` con cuádriceps en 0.

Split histórico:

- Lower A
- Upper A
- Lower B
- Upper B

Volumen semanal directo:

| Músculo | Series |
|---|---:|
| glutes | 12 |
| hamstrings | 9 |
| abductors | 9 |
| back | 6 |
| biceps | 6 |
| chest | 6 |
| shoulders | 6 |
| triceps | 6 |
| quads | 0 |

Ejemplo Lower A:

- Hip Thrust
- Peso Muerto Rumano
- Abductores en Máquina
- Patada de Glúteo en Polea
- Curl Femoral Tumbado

Dictamen histórico: el sesgo por ratio funcionaba, pero excedía su función al dejar cuádriceps sin estímulo directo. Este hallazgo queda movido a histórico corregido y debe mantenerse como test de regresión.

### Histórico corregido 2: mujer, advanced, 6 días, 120 min, glutes_legs con quads 0

Estado actual: **corregido en la matriz vigente**. Ya no aparecen casos `glutes_legs` con cuádriceps en 0.

Split histórico:

- Glutes A
- Push
- Glutes B
- Pull
- Glutes C
- Upper B

Volumen semanal directo:

| Músculo | Series |
|---|---:|
| glutes | 18 |
| abductors | 12 |
| chest | 12 |
| hamstrings | 12 |
| back | 8 |
| biceps | 6 |
| shoulders | 6 |
| triceps | 6 |
| forearms | 4 |
| quads | 0 |

Dictamen histórico: no había justificación fisiológica para omitir cuádriceps directo en 6 días advanced. El caso queda documentado como histórico corregido; si reaparece, debe tratarse como bloqueo coach o autoajuste obligatorio.

## Rutinas bloqueadas

En la matriz actual se detectaron **0 bloqueos técnicos**. No hubo excepción del motor, falla del generador ni `invalid_generated_plan` en las 216 combinaciones.

La palabra "bloqueada" debe reservarse para dos estados distintos:

| Estado | Definición | Acción |
|---|---|---|
| Bloqueo técnico | Falla del motor, excepción o `invalid_generated_plan`. | No mostrar; ejecutar fallback o devolver error controlado. |
| Bloqueo coach | Plan técnicamente válido que viola un mínimo no negociable de seguridad/coherencia. | Autoajustar antes de mostrar; si no se puede, pedir cambio de configuración. |
| Observación coach | Plan válido con mejora recomendable, pero no peligrosa ni incoherente. | Puede mostrarse en MVP con etiqueta interna o ajuste futuro. |

Bloqueos coach recomendados aunque no sean fallas técnicas:

| Caso | Debe bloquear/autoajustar si... |
|---|---|
| `balanced` | Pecho, espalda, hombros, cuádriceps, femorales o glúteos quedan en 0. |
| `glutes_legs` | Cuádriceps queda en 0 o bajo el piso del tiempo disponible. |
| `torso` | Pecho queda en 0 o pierna de mantenimiento cae bajo piso. |
| Beginner | Cualquier ejercicio aparece con RIR 0. |
| Anchors pesados | Aparecen con RIR 0 de forma prescrita. |
| 75/120 min | Una sesión normal queda con 1-3 ejercicios sin justificación. |

## Comparación contra rutinas humanas de referencia

La auditoría previa de rutinas manuales muestra patrones humanos consistentes:

- El creador humano prioriza sin borrar mantenimiento básico.
- Los días inferiores suelen conservar al menos un patrón dominante de rodilla y uno de bisagra/cadera.
- Los días superiores suelen incluir empuje, tracción y algún aislamiento de brazo cuando la densidad lo permite.
- La variedad se controla por patrón y rol, no solo por nombre de ejercicio.
- En mujeres o prioridades de glúteo, glúteo/abductores aumentan, pero las piernas no se convierten únicamente en glúteo.
- En prioridades de torso, espalda/hombro suben, pero pecho y brazos no desaparecen.

Kalos copia bien la intención general de split y prioridad, pero todavía le falta la capa humana de "cobertura mínima antes de especialización".

## Reglas nuevas recomendadas

### 1. Ratio como modificador, no como reemplazo

El ratio debe ajustar pesos de selección y volumen, pero no puede anular cobertura base.

Regla propuesta:

- Primero cumplir mínimos semanales por frecuencia, tiempo y nivel.
- Después aplicar volumen adicional al grupo priorizado por ratio.
- Si no hay capacidad de sesión, sacrificar finishers o músculos menores antes que músculos base.

### 2. Pisos de cobertura para hipertrofia

Para 3-4 días y objetivo hipertrofia:

| Músculo base | Piso semanal recomendado |
|---|---:|
| chest | 4-6 series |
| back | 4-6 series |
| shoulders | 4-6 series |
| quads | 4-6 series |
| hamstrings | 3-6 series |
| glutes | 3-6 series |
| biceps | 2-4 series |
| triceps | 2-4 series |

Para 5-6 días:

- Subir pisos a 6-8 series para músculos grandes.
- Mantener brazos en 4-6 series si el tiempo es al menos 75 min.
- No permitir quads, chest, back o shoulders en 0 series directas salvo restricción médica/equipo explícita.

### 3. Reglas por ratio

`balanced`:

- Mantener 2 estímulos semanales para torso y pierna.
- En 4 días, Upper A/B debe incluir bíceps y tríceps directos al menos una vez.

`torso`:

- Priorizar shoulders/back.
- Mantener chest mínimo 4-6 series.
- Mantener quads/hamstrings/glutes mínimo 3-6 series.
- No permitir que shoulders supere el máximo del contrato por querer compensar ratios.

`glutes_legs`:

- Priorizar glutes/hamstrings/abductors.
- Mantener quads mínimo 4-6 series.
- No dejar todos los días lower como variantes de glúteo sin patrón de rodilla.
- Aductores y calves son opcionales; quads no.

### 4. Densidad por tiempo

Regla de aceptación:

- 45 min: 3-4 ejercicios.
- 75 min: 5-6 ejercicios, salvo beginner con limitación explícita.
- 120 min: 6-8 ejercicios o bloque técnico/accesorio; no quedarse en 4 ejercicios.

Si no se agrega ejercicio por fatiga, debe agregarse trabajo de bajo costo: core, movilidad activa, calves, técnica, respiración o calentamiento específico.

### 5. Fatiga

Reglas de contención:

- Beginner: no perseguir densidad a costa de superar fatiga 8.
- Intermediate: fatiga sesión 8-12.
- Advanced: fatiga sesión 10-16, pero con control de RIR 0 y sin repetir aislamientos pesados al fallo.

### 6. RIR por nivel

El comportamiento actual es razonable como base:

- Beginner: anchors RIR 2-4; accesorios RIR 2-3; aislamientos RIR 1-3; sin RIR 0.
- Intermediate: anchors RIR 1-3; accesorios RIR 1-2; aislamientos/finishers pueden tocar RIR 0 de forma limitada.
- Advanced: anchors RIR 1-2; accesorios/aislamientos pueden bajar a RIR 0-2, con límite semanal.

Regla adicional:

- No usar RIR 0 sistemático en sentadillas, presses pesados, peso muerto rumano, hip thrust pesado ni ejercicios con alta demanda lumbar.

## Cambios sugeridos para Backend

1. Agregar una validación coach posterior al plan:
   - Detectar músculos base en 0 series directas.
   - Detectar pisos incumplidos por nivel/frecuencia/tiempo.
   - Detectar prioridad por ratio aplicada sin mantenimiento.

2. Implementar fallback cuando falla validación:
   - Reducir prioridad extrema a moderada.
   - Bajar volumen objetivo del músculo disparado.
   - Recalcular con balanced si el segundo intento falla.
   - Devolver plan seguro, no error técnico.

3. Separar `target_volume` de `minimum_coverage`:
   - `minimum_coverage` es obligatorio.
   - `target_volume` es deseable.
   - `priority_bonus` se aplica solo después del mínimo.

4. Penalizar redundancia por `substitution_group`:
   - Evitar 2-3 variantes casi iguales en la misma sesión.
   - Permitir repetición solo si es patrón intencional avanzado.

5. Mejorar estimación de duración:
   - Calcular por sets, reps, descanso y rol.
   - No usar solo cantidad de ejercicios.
   - Marcar sesión irreal si 7 ejercicios con descansos largos supera tiempo disponible.

6. Ajustar límites de hombro:
   - En ratio torso, limitar shoulders antes de que el esquema Pydantic rechace el plan.
   - Redistribuir exceso hacia back, chest o brazos si hay margen.

7. Agregar tests de aceptación:
   - balanced 4D 75 debe tener bíceps y tríceps directos.
   - glutes_legs 4D/6D debe mantener quads directo.
   - torso 3D/4D debe mantener chest y piernas en piso mínimo.
   - beginner nunca debe tener RIR 0.
   - ningún plan válido debe dejar chest/back/quads/hamstrings/glutes/shoulders en 0 salvo restricción explícita.

## Cambios sugeridos para Frontend

1. Mostrar el sesgo por ratio como "prioridad sugerida", no como verdad absoluta.

2. Si Backend aplica fallback, mostrar texto discreto:
   - "Ajustamos la prioridad para mantener una rutina equilibrada y segura."

3. En preview, mostrar cobertura semanal por músculo:
   - Directo.
   - Secundario.
   - Bajo mínimo.

4. Mostrar advertencia si el usuario combina:
   - beginner + 6 días.
   - torso extremo + poco tiempo.
   - glutes_legs + omisión de cuádriceps.

5. Permitir que el usuario cambie prioridad sin editar medidas:
   - Balanced.
   - Torso.
   - Glutes/legs.
   - Mantener salud articular / bajo impacto.

## Criterios de aceptación medibles

Kalos puede considerarse listo para MVP cuando pase estos criterios en la misma matriz de 216 casos:

1. 0 casos bloqueados sin fallback.
2. Al menos 90% de casos aprobados sin observaciones críticas.
3. Ningún plan de hipertrofia debe dejar en 0 series directas:
   - chest
   - back
   - shoulders
   - quads
   - hamstrings
   - glutes
4. Balanced 4D 75 debe incluir bíceps y tríceps directos al menos una vez por semana.
5. Glutes/legs 4D y 6D debe incluir quads directo con mínimo 4-6 series.
6. Torso debe mantener chest mínimo 4-6 series y piernas mínimo 3-6 series.
7. Beginner debe mantener RIR mínimo mayor a 0 en todos los ejercicios.
8. Advanced puede usar RIR 0 solo en roles seguros y dentro del límite semanal.
9. 75 min debe producir normalmente 5-6 ejercicios por sesión.
10. 120 min no debe quedarse en 4 ejercicios salvo catálogo/equipo limitado y advertencia explícita.

## Dictamen final

**AJUSTAR.** Kalos tiene una base prometedora y el uso de ratios ya genera cambios fisiológicamente reconocibles. Aun así, los ratios deben operar dentro de pisos de cobertura muscular, límites de volumen y fallbacks seguros. La prioridad antropométrica debe especializar la rutina, no convertirla en una rutina incompleta.
