# Kalos Catalog Adapter Coverage

Fecha: 2026-05-29

Estado: Fase 2 backend. No agrega endpoints, no ejecuta migraciones, no llama IA
y no cambia generación productiva.

## Objetivo

El adaptador `KalosExerciseCatalogAdapter` convierte filas del catálogo actual
de ejercicios al schema interno `KalosExerciseCatalogItem`, usado por el futuro
motor Kalos para razonar sobre taxonomía de ejercicios.

## Fuente Actual

El modelo actual `backend/app/models/training.py::Exercise` expone:

- `id`
- `canonical_name`
- `equipment_type`
- `movement_pattern`
- `primary_muscle_group`
- `joint_complexity`
- `allows_quad_focus`
- `allows_glute_focus`
- `is_bilateral`
- `requires_spotter`

Estos campos permiten inferir parte del contrato Kalos, pero no cubren toda la
taxonomía requerida.

## Campos Kalos

| Campo Kalos | Fuente actual | Estado |
| --- | --- | --- |
| `exercise_id` | `id` | Cubierto. |
| `name_es` | `name_es`, `display_name` o `canonical_name` | Cubierto como fallback. |
| `primary_muscle` | mapa externo `muscle_group_id -> code` o relación con `code` | Parcial; requiere join/mapa. |
| `movement_pattern` | `movement_pattern` legacy | Parcial; se mapean valores compatibles. |
| `role` | inferido desde `movement_pattern` y `fatigue_cost` | Heurístico. |
| `fatigue_cost` | `fatigue_cost` si existe; si no, `joint_complexity` | Heurístico. |
| `equipment` | `equipment_type` | Parcial; lista multi-equipo no existe aún. |
| `joint_stress` | inferido desde `movement_pattern` | Heurístico. |
| `substitution_group` | `movement_pattern + primary_muscle` | Heurístico. |

## Mapeos Implementados

Equipamiento legacy:

- `barbell` -> `barbell`
- `dumbbell` -> `dumbbell`
- `cable` -> `cable`
- `machine` -> `machine`
- `bodyweight` -> `bodyweight`
- `resistance_band` / `band` -> `band`
- `smith_machine` / `smith` -> `smith`
- `bench` -> `bench`

Patrones legacy:

- `squat` -> `squat`
- `hinge` -> `hinge`
- `push_horizontal` -> `horizontal_push`
- `push_vertical` -> `vertical_push`
- `pull_horizontal` -> `horizontal_pull`
- `pull_vertical` -> `vertical_pull`
- `lunge` -> `squat`
- `isolation` -> se infiere por músculo primario cuando es posible.

## Campos Faltantes

Para cobertura completa real se necesita enriquecer catálogo con:

- músculo primario accesible por código sin depender de mapa externo;
- músculos secundarios;
- `movement_pattern` Kalos nativo;
- `role` curado por ejercicio o por variante;
- `fatigue_cost` curado;
- `equipment` como lista, no sólo `equipment_type`;
- `joint_stress` curado;
- `substitution_group` estable;
- taxonomía por variante cuando `allows_quad_focus` o `allows_glute_focus`
  cambian la intención del ejercicio.

## Reporte De Cobertura

El adaptador genera `KalosCatalogCoverageReport` con:

- `total_items`
- `complete_items`
- `coverage_ratio`
- `missing_by_field`
- `unsupported_values`

El mock catalog de tests cubre 6 filas:

- 4 filas completas tras mapeo/inferencia.
- 1 fila incompleta sin músculo, patrón, equipo ni complejidad.
- 1 fila con valores no soportados: `equipment=kettlebell` y
  `movement_pattern=carry`.

Resultado esperado del mock:

```json
{
  "total_items": 6,
  "complete_items": 4,
  "coverage_ratio": 0.6666666666666666,
  "unsupported_values": {
    "equipment": ["kettlebell"],
    "movement_pattern": ["carry"]
  }
}
```

## Riesgos

- `role`, `fatigue_cost`, `joint_stress` y `substitution_group` son inferidos;
  sirven para Fase 2, pero no reemplazan curaduría del catálogo.
- `isolation` requiere músculo primario para elegir patrón Kalos correcto.
- `lunge -> squat` es una equivalencia temporal para compatibilidad; puede
  requerir patrón propio o regla más específica en fases posteriores.
- `kettlebell` y `carry` existen en SQL legacy como posibles valores, pero no
  están en la taxonomía Kalos v1 solicitada; quedan reportados como unsupported.

## Próximo Paso Recomendado

Antes de usar el adaptador en generación productiva:

1. Ejecutar audit read-only del catálogo real.
2. Revisar `unsupported_values`.
3. Curar `substitution_group`, `joint_stress`, `role` y `fatigue_cost`.
4. Proponer migración documental para columnas faltantes o snapshot de
   taxonomía, sin aplicar cambios destructivos.

