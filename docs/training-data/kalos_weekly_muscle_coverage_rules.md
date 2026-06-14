# Reglas mínimas de cobertura muscular semanal Kalos

Fecha: 2026-06-03

Estado: documento funcional. No modifica código.

## Objetivo

Definir mínimos semanales de cobertura muscular para que Kalos Training no genere rutinas balanceadas con músculos directos omitidos. Caso observado: plan balanced 4D, hipertrofia, intermedio, 75 minutos por sesión, con Upper A y Upper B sin bíceps directo.

## Principio

Una rutina `balanced` debe cubrir todos los grupos principales de forma directa o suficientemente trazable. Los músculos pequeños de torso, especialmente bíceps y tríceps, no deben depender únicamente de estímulo indirecto cuando hay 4 días y sesiones de 60+ minutos.

## 1. Cobertura semanal mínima para balanced 4D

Configuración base:

- Objetivo: `hypertrophy`
- Prioridad: `balanced`
- Experiencia: `intermediate`
- Frecuencia: 4 días/semana
- Split recomendado: `Lower A`, `Upper A`, `Lower B`, `Upper B`

### Mínimos directos por semana

| Grupo muscular | Mínimo ejercicios directos/semana | Mínimo series directas/semana | Frecuencia objetivo | Notas |
| --- | ---: | ---: | ---: | --- |
| Pecho | 2 | 6-8 | 1-2 días | Press/fly cuentan directo |
| Espalda | 2 | 8-10 | 1-2 días | Jalón y remo preferibles |
| Hombros | 2 | 6-8 | 1-2 días | Debe incluir lateral/rear delt si cabe |
| Bíceps | 1 | 3-4 | 1 día | Obligatorio en Upper B o Pull |
| Tríceps | 1 | 3-4 | 1 día | Obligatorio en Upper A/B o Push |
| Cuádriceps | 2 | 8-10 | 2 días | Squat/press/extensión |
| Femoral | 2 | 6-8 | 2 días | Hinge/curl femoral |
| Glúteo | 2 | 8-10 | 2 días | Hip thrust/squat/hinge/unilateral |
| Abductores | 0-1 | 0-4 | opcional | Añadir si densidad/objetivo lo permite |
| Aductores | 0-1 | 0-4 | opcional | Añadir si densidad/objetivo lo permite |
| Pantorrilla | 0-2 | 0-6 | opcional | Añadir si densidad/tiempo lo permite |

Regla dura:

- En balanced 4D con sesiones de 60+ minutos, bíceps y tríceps directos deben aparecer al menos 1 vez/semana cada uno.
- En 75+ minutos, la ausencia de bíceps directo es fallo de cobertura salvo catálogo/equipo limitado o restricción articular documentada.

## 2. Mínimos por músculo según tiempo

Estos mínimos aplican a una semana balanced 4D. A menor tiempo, se reduce volumen opcional, no cobertura esencial.

### 45 minutos por sesión

| Grupo | Mínimo semanal |
| --- | ---: |
| Pecho | 4-6 series |
| Espalda | 6-8 series |
| Hombros | 4-6 series |
| Bíceps | 2-3 series |
| Tríceps | 2-3 series |
| Cuádriceps | 6-8 series |
| Femoral | 4-6 series |
| Glúteo | 6-8 series |
| Abductores/aductores/calves | opcional, 0-3 series |

Regla:

- En 45 min, bíceps/tríceps pueden tener 2 series directas si la sesión está muy comprimida, pero no deben desaparecer ambos.

### 60 minutos por sesión

| Grupo | Mínimo semanal |
| --- | ---: |
| Pecho | 6 series |
| Espalda | 8 series |
| Hombros | 6 series |
| Bíceps | 3 series |
| Tríceps | 3 series |
| Cuádriceps | 8 series |
| Femoral | 6 series |
| Glúteo | 8 series |
| Abductores/aductores/calves | opcional, 2-4 series si cabe |

Regla:

- En 60 min, Upper A/Upper B deben incluir al menos un brazo directo total por día o ambos brazos en Upper B.

### 75 minutos por sesión

| Grupo | Mínimo semanal |
| --- | ---: |
| Pecho | 6-8 series |
| Espalda | 8-10 series |
| Hombros | 6-8 series |
| Bíceps | 3-4 series |
| Tríceps | 3-4 series |
| Cuádriceps | 8-10 series |
| Femoral | 6-8 series |
| Glúteo | 8-10 series |
| Abductores/aductores/calves | 2-6 series opcionales |

Regla:

- En 75 min, bíceps y tríceps directos son obligatorios en balanced 4D intermediate.
- Accesorios menores se sacrifican antes que bíceps/tríceps.

### 90 minutos por sesión

| Grupo | Mínimo semanal |
| --- | ---: |
| Pecho | 8 series |
| Espalda | 10 series |
| Hombros | 8 series |
| Bíceps | 4-6 series |
| Tríceps | 4-6 series |
| Cuádriceps | 10 series |
| Femoral | 8 series |
| Glúteo | 10 series |
| Abductores/aductores/calves | 4-8 series opcionales |

Regla:

- En 90 min, arms directos deben estar presentes y puede añadirse un segundo estímulo de bíceps/tríceps si fatiga y volumen lo permiten.

## 3. En qué día debe caer bíceps

Orden preferido:

1. `Upper B`
2. Día `Pull`
3. `Upper A` si Upper B está saturado
4. `Full Body` si no existe upper/pull

Reglas para balanced 4D:

- Bíceps directo idealmente cae en `Upper B`, después del bloque de espalda.
- Si Upper B contiene jalón/remo, añadir bíceps como `isolation` o `secondary_accessory`.
- Si Upper A es más push/pecho/hombro, tríceps puede caer en Upper A y bíceps en Upper B.
- Si ambos Upper son mixtos, distribuir:
  - Upper A: pecho/espalda/hombro/tríceps.
  - Upper B: espalda/pecho/hombro/bíceps.

Ejemplo Upper B 75 min:

```text
1. Anchor: row o vertical_pull
2. Primary accessory: press o pull complementario
3. Secondary accessory: hombro/rear delt
4. Isolation: bíceps
5. Isolation: lateral raise o pecho accesorio
6. Optional: tríceps/core si falta cobertura
```

## 4. Cuándo sacrificar accesorios menores antes que bíceps/tríceps

Para balanced 4D, si una sesión upper está llena y falta bíceps o tríceps, sacrificar en este orden:

1. `finisher`
2. Core opcional
3. Pantorrilla en día upper
4. Segundo aislamiento de hombro
5. Segundo fly/pecho accesorio
6. Segundo rear delt si espalda ya tiene volumen suficiente
7. Abductores/aductores en día no lower

No sacrificar antes que bíceps/tríceps:

- Anchor principal del día.
- Primer patrón de espalda.
- Primer patrón de pecho.
- Primer estímulo directo de hombro.
- Trabajo mínimo de cuádriceps/femoral/glúteo en días lower.

Regla dura:

- En balanced 4D 75 min, no se debe mantener un accesorio opcional mientras bíceps directo está en 0 series semanales.
- Si falta bíceps, remover el accesorio opcional menos prioritario y añadir 1 ejercicio de `elbow_flexion`.
- Si falta tríceps, remover el accesorio opcional menos prioritario y añadir 1 ejercicio de `elbow_extension`.

## 5. Criterios de aceptación medibles para tests

### Test base observado

Input:

```json
{
  "goal": "hypertrophy",
  "priority": "balanced",
  "experience": "intermediate",
  "days_per_week": 4,
  "time_budget_minutes": 75
}
```

Expected:

- `sessions.length = 4`
- Split contiene 2 lower y 2 upper, o equivalente balanceado.
- Pecho directo >= 6 series/semana.
- Espalda directa >= 8 series/semana.
- Hombros directos >= 6 series/semana.
- Bíceps directo >= 3 series/semana.
- Tríceps directo >= 3 series/semana.
- Cuádriceps directo >= 8 series/semana.
- Femoral directo >= 6 series/semana.
- Glúteo directo >= 8 series/semana.
- Al menos 1 ejercicio con `movement_pattern = elbow_flexion`.
- Al menos 1 ejercicio con `movement_pattern = elbow_extension`.
- Bíceps aparece en `Upper B` o día `Pull`, salvo justificación.

### Validaciones por sesión

Para cada sesión upper de 75 min:

- Ejercicios objetivo: 5-6.
- Debe contener al menos 1 patrón de empuje o pecho/hombro.
- Debe contener al menos 1 patrón de tracción.
- Entre Upper A y Upper B deben aparecer bíceps y tríceps directos.

Para cada sesión lower de 75 min:

- Debe contener cuádriceps o squat/press.
- Debe contener femoral o hinge/curl.
- Debe contener glúteo directo o compuesto con contribución clara.

### Failure conditions

El plan falla si:

- `direct_sets.biceps = 0` en balanced 4D con tiempo >= 60.
- `direct_sets.triceps = 0` en balanced 4D con tiempo >= 60.
- Upper A y Upper B no tienen ningún `elbow_flexion`.
- Se incluye finisher/core/pantorrilla opcional en upper mientras bíceps está ausente.
- El plan justifica bíceps indirecto por jalones/remadas como cobertura completa.

### Justificaciones permitidas

Se permite ausencia de bíceps directo solo si:

- Catálogo no tiene ejercicios `elbow_flexion`.
- Equipo disponible no permite ninguna variante segura.
- Usuario excluyó bíceps/curls.
- Hay restricción de codo/muñeca/hombro.
- Deload o sesión express menor a 45 min.

En esos casos, `quality_checks.warnings` debe incluir:

```json
{
  "type": "coverage_gap",
  "muscle": "biceps",
  "reason": "limited_catalog_or_constraint"
}
```

## 6. Resumen implementable

Regla mínima para el motor:

```text
IF priority = balanced
AND days_per_week = 4
AND time_budget_minutes >= 60
THEN direct biceps sets >= 3
AND direct triceps sets >= 3
AND biceps exercise SHOULD be placed in Upper B or Pull.
```

Regla de reemplazo:

```text
IF direct biceps coverage is missing
AND optional accessory exists
THEN remove lowest-priority optional accessory
AND add elbow_flexion isolation.
```

Regla de aceptación:

```text
Balanced does not mean only compound coverage.
Balanced 4D requires direct arm coverage when time and catalog allow it.
```
