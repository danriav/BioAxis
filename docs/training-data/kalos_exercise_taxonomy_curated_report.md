# Reporte de curaduría de taxonomía de ejercicios Kalos

Fecha: 2026-05-29

Archivo curado:

- `docs/training-data/kalos_exercise_taxonomy_seed.csv`

## Resumen

| Métrica | Resultado |
| --- | ---: |
| Total de filas | 62 |
| Filas completas en campos centrales | 62 |
| Filas con `secondary_muscles` vacío intencionalmente | 14 |
| Filas con dudas o notas de curaduría | 18 |
| Unsupported/ambiguous | 9 |

Campos centrales validados:

- `movement_pattern`
- `role`
- `fatigue_cost`
- `joint_stress`
- `substitution_group`

`secondary_muscles` se dejó vacío cuando no había músculo secundario claro sin inventar valores fuera de la taxonomía. En la futura representación JSON, esos casos deben serializarse como lista vacía.

## Distribución de roles

| Role | Filas |
| --- | ---: |
| `isolation` | 35 |
| `primary_accessory` | 14 |
| `anchor` | 11 |
| `finisher` | 1 |
| `secondary_accessory` | 1 |

## Distribución de patrones de movimiento

| Movement pattern | Filas |
| --- | ---: |
| `squat` | 10 |
| `horizontal_push` | 7 |
| `elbow_flexion` | 6 |
| `elbow_extension` | 6 |
| `hip_abduction` | 5 |
| `core_flexion` | 4 |
| `shoulder_abduction` | 3 |
| `vertical_pull` | 3 |
| `hip_thrust` | 3 |
| `calf_raise` | 3 |
| `vertical_push` | 2 |
| `hip_adduction` | 2 |
| `hinge` | 2 |
| `knee_flexion` | 2 |
| `horizontal_pull` | 2 |
| `rear_delt` | 1 |
| `knee_extension` | 1 |

## Unsupported / ambiguous

| Exercise | Decision |
| --- | --- |
| `around_the_worlds` | Híbrido pecho/hombro; se mapeó a `shoulder_abduction` por target lateral de hombro. |
| `bulgarian_split_squat` | Split squat/lunge no existe como patrón permitido; se mapeó a `squat`. |
| `deficit_reverse_lunge` | Reverse lunge no existe como patrón permitido; se mapeó a `squat`. |
| `incline_cable_fly` | Fly no existe como patrón permitido; se mapeó a `horizontal_push`. |
| `low_cable_fly` | Fly no existe como patrón permitido; se mapeó a `horizontal_push`. |
| `peck_deck_fly` | Fly no existe como patrón permitido; se mapeó a `horizontal_push`. |
| `reverse_curl_ez` | Curl de antebrazo/braquiorradial; falta patrón de antebrazo, se mapeó a `elbow_flexion`. |
| `step_up_glute_bias` | Step-up no existe como patrón permitido; se mapeó a `squat`. |
| `wrist_curl_barbell` | Flexión de muñeca no existe como patrón permitido; se mapeó a `elbow_flexion` y queda marcado como ambiguo. |

## Decisiones de curaduría importantes

- Los patrones de lunge, split squat y step-up se agruparon temporalmente bajo `squat` para cumplir la taxonomía permitida.
- Las aperturas de pecho y peck deck se agruparon bajo `horizontal_push`, aunque biomecánicamente serían una familia de fly/adduction. Conviene añadir `chest_fly` en una versión futura de la taxonomía.
- Los curls de muñeca/antebrazo se mapearon a `elbow_flexion` por falta de `wrist_flexion` o `forearm_flexion`.
- Los ejercicios de glúteo por extensión de cadera en polea se mapearon a la familia `hip_thrust` cuando no existía un patrón `hip_extension`.
- `joint_stress` usa valores separados por punto y coma para mantener compatibilidad CSV.
- `secondary_muscles` usa códigos musculares existentes separados por punto y coma; queda vacío cuando no hay secundario claro.
- `substitution_group` agrupa familias funcionales estables y no pretende ser un enum cerrado todavía.

## Validaciones realizadas

- No se cambió ningún `exercise_id`.
- No se borraron columnas existentes.
- Todos los valores de `movement_pattern` pertenecen a la especificación.
- Todos los valores de `role` pertenecen a la especificación.
- Todos los valores de `fatigue_cost` pertenecen a la especificación.
- Todos los valores de `joint_stress` pertenecen a la especificación.
- `secondary_muscles` no introduce músculos fuera de la taxonomía usada por Kalos.
- No se modificó DB, frontend, endpoints ni prompts.
