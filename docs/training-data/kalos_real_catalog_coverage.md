# Kalos Real Catalog Coverage

Fecha: 2026-05-29

Auditoría read-only del catálogo real disponible en Supabase usando
`KalosExerciseCatalogAdapter`. No se modificaron datos, no se ejecutaron
migraciones, no se crearon endpoints y no se llamó IA.

## Método

Consulta read-only vía Supabase API sobre:

- `exercises`
- `muscle_groups`

Columnas leídas de `exercises`:

- `id`
- `canonical_name`
- `name_es`
- `equipment_type`
- `primary_muscle_group_id`
- `allows_quad_focus`
- `allows_glute_focus`
- `target_section`
- `tension_type`
- `stability_type`
- `is_bilateral`
- `biomechanical_bias`

La primera consulta intentó leer `movement_pattern`, pero Supabase real respondió
que la columna no existe. El audit se repitió con las columnas reales
disponibles.

Los ejemplos se anonimizan con hashes cortos de `exercise_id`. No se incluyen
nombres de ejercicios ni secretos.

## Resultado

```json
{
  "total_items": 62,
  "complete_items": 0,
  "coverage_ratio": 0.0,
  "missing_by_field": {
    "equipment": 1,
    "fatigue_cost": 62,
    "joint_stress": 62,
    "movement_pattern": 62,
    "role": 62,
    "substitution_group": 62
  },
  "unsupported_values": {
    "equipment": ["other"]
  }
}
```

## Lectura Técnica

El catálogo real tiene ejercicios y músculo primario mapeable, pero no tiene
campos suficientes para generar un `KalosExerciseCatalogItem` completo:

- `movement_pattern`: falta en 62/62.
- `role`: falta en 62/62 porque depende de patrón/fatiga o curaduría explícita.
- `fatigue_cost`: falta en 62/62 porque el catálogo real no expone
  `joint_complexity` ni `fatigue_cost`.
- `joint_stress`: falta en 62/62 porque depende de patrón o curaduría.
- `substitution_group`: falta en 62/62 porque depende de patrón + músculo o
  curaduría estable.
- `equipment`: falta en 1/62 por valor no soportado `other`.

## Ejemplos Anonimizados De Filas Incompletas

| anon_id | missing_fields | source_warnings |
| --- | --- | --- |
| `exercise_34dd158114` | `movement_pattern`, `role`, `fatigue_cost`, `joint_stress`, `substitution_group` |  |
| `exercise_2dc974b2b1` | `movement_pattern`, `role`, `fatigue_cost`, `joint_stress`, `substitution_group` |  |
| `exercise_1036a08788` | `movement_pattern`, `role`, `fatigue_cost`, `joint_stress`, `substitution_group` |  |
| `exercise_b6855b4a2a` | `movement_pattern`, `role`, `fatigue_cost`, `joint_stress`, `substitution_group` |  |
| `exercise_1e5a8f30bb` | `movement_pattern`, `role`, `fatigue_cost`, `joint_stress`, `substitution_group` | `allows_glute_focus_requires_variant_taxonomy` |
| `exercise_879d1360f2` | `movement_pattern`, `role`, `fatigue_cost`, `joint_stress`, `substitution_group` |  |
| `exercise_7de211ee8f` | `movement_pattern`, `role`, `fatigue_cost`, `joint_stress`, `substitution_group` |  |
| `exercise_da5e41a62a` | `movement_pattern`, `role`, `fatigue_cost`, `joint_stress`, `substitution_group` |  |
| `exercise_cf39f28e41` | `movement_pattern`, `role`, `fatigue_cost`, `joint_stress`, `substitution_group` |  |
| `exercise_6a0fb7b5cc` | `movement_pattern`, `role`, `fatigue_cost`, `joint_stress`, `substitution_group` |  |
| `exercise_b1cd7a7064` | `movement_pattern`, `role`, `fatigue_cost`, `joint_stress`, `substitution_group` |  |
| `exercise_bb0ee537df` | `movement_pattern`, `role`, `fatigue_cost`, `joint_stress`, `substitution_group` |  |

Total de filas incompletas: 62.

## Campos Que Requieren Curaduría Manual

Prioridad P0 para generación segura:

- `movement_pattern`
- `fatigue_cost`
- `joint_stress`
- `substitution_group`

Prioridad P1:

- `role`
- `secondary_muscles`
- soporte para equipamiento `other` o reemplazo por valores Kalos permitidos
- taxonomía por variante cuando `allows_quad_focus` o `allows_glute_focus`
  cambian el objetivo biomecánico.

## Riesgos

- Con cobertura actual `0.0`, el catálogo real no debe alimentar generación
  Kalos productiva sin curaduría o reglas adicionales aprobadas.
- El adaptador puede mapear `equipment_type` y músculo primario, pero no puede
  inferir de forma segura patrón, fatiga, estrés articular ni sustitución sin
  datos faltantes.
- `target_section`, `tension_type`, `stability_type` y `biomechanical_bias`
  pueden ayudar en una fase futura, pero aún no son equivalentes directos al
  contrato Kalos.

## Recomendación

Antes de conectar Kalos al catálogo real:

1. Agregar o curar `movement_pattern` por ejercicio.
2. Curar `fatigue_cost` por ejercicio o por variante.
3. Curar `joint_stress`.
4. Definir `substitution_group` estable.
5. Resolver `equipment_type = other`.
6. Re-ejecutar esta auditoría hasta que `coverage_ratio` sea aceptable para
   generación segura.

