# Reglas de adaptación por ratios y métricas actuales Kalos

Fecha: 2026-06-02

Estado: documento funcional. No modifica código.

## Objetivo

Definir cómo el motor Kalos adapta split, prioridad muscular, volumen, selección de ejercicios y fatiga usando `dim_atleta` como fuente de métricas actuales.

Fuente esperada:

```text
dim_atleta:
  genero
  peso
  altura
  hombros
  cintura
  cadera
  gluteo
  pierna
  brazo
  objetivo_metabolico
  dias_entrenamiento_semana
```

## Reglas generales

- Usar ratios solo para adaptar entrenamiento, no para diagnosticar salud, estética ni composición corporal.
- Si falta una métrica requerida, no inferirla; marcar `ratio_status = insufficient_data`.
- Si hay valores fuera de rango plausible, no aplicar adaptación por ratio hasta validar datos.
- Los ratios ajustan prioridades y volumen dentro de límites de experiencia/fatiga; nunca saltan restricciones médicas, dolor, equipo o volumen máximo.
- Las medidas exactas deben usarse transitoriamente; para persistencia, preferir buckets.

## Fórmulas

Todas las medidas deben estar en la misma unidad, idealmente centímetros.

### Hombre

Ratio principal:

```text
hombro_cintura = hombros / cintura
```

Uso:

- Principal proxy de proporción torso-cintura.
- Si es bajo, priorizar hombros laterales/posteriores y espalda.

Ratios secundarios:

```text
hombro_cadera = hombros / cadera
cintura_cadera = cintura / cadera
```

Uso:

- `hombro_cadera` ayuda a diferenciar torso estrecho vs cadera amplia.
- `cintura_cadera` puede usarse para ajustar carga metabólica/cardio, sin lenguaje diagnóstico.

### Mujer

Ratio principal:

```text
cintura_cadera = cintura / cadera
```

Uso:

- Principal proxy de proporción cintura-cadera.
- Si es alto, priorizar glúteo, abductores, femoral y manejo conservador de volumen de torso.

Ratios secundarios:

```text
hombro_cadera = hombros / cadera
gluteo_cintura = gluteo / cintura
```

Uso:

- `hombro_cadera` ayuda a evitar torso demasiado bajo en mujeres con hombros rezagados.
- `gluteo_cintura` ayuda a distinguir prioridad glúteo vs prioridad cintura/cadera ya balanceada.

## Buckets accionables

Los buckets representan brecha de adaptación, no juicio corporal.

### Hombre: hombro/cintura

Referencia funcional: `1.60`.

```text
gap_hc = max(0, 1.60 - hombro_cintura) / 1.60
```

| Bucket | Condición | Lectura programática |
| --- | --- | --- |
| bajo | `gap_hc < 0.06` | Proporción balanceada; no especializar torso |
| moderado | `0.06 <= gap_hc < 0.12` | Subir ligeramente espalda/hombro |
| alto | `0.12 <= gap_hc < 0.20` | Prioridad torso clara |
| muy alto | `gap_hc >= 0.20` | Especialización controlada en espalda/hombro |

### Hombre: hombro/cadera

Referencia funcional: `1.25`.

```text
gap_hcadera = max(0, 1.25 - hombro_cadera) / 1.25
```

| Bucket | Condición | Lectura programática |
| --- | --- | --- |
| bajo | `< 0.05` | Sin ajuste |
| moderado | `0.05-0.10` | Añadir espalda/hombro si coincide con hombro/cintura |
| alto | `0.10-0.18` | Torso ancho como prioridad secundaria |
| muy alto | `>= 0.18` | Evitar sobrepriorizar pierna si objetivo no lo pide |

### Hombre: cintura/cadera

Referencia funcional neutral: `0.85-0.95`.

| Bucket | Condición | Lectura programática |
| --- | --- | --- |
| bajo | `< 0.85` | Sin ajuste por cintura/cadera |
| moderado | `0.85-0.95` | Balance |
| alto | `0.95-1.05` | Mantener fuerza, considerar recomposición/cardio si objetivo aplica |
| muy alto | `> 1.05` | No aumentar fatiga sistémica innecesaria; priorizar adherencia |

### Mujer: cintura/cadera

Referencia funcional: `0.72`.

```text
gap_cc = max(0, cintura_cadera - 0.72) / 0.72
```

| Bucket | Condición | Lectura programática |
| --- | --- | --- |
| bajo | `gap_cc < 0.06` | Balance; no especializar glúteo por ratio |
| moderado | `0.06 <= gap_cc < 0.14` | Subir glúteo/abductores moderadamente |
| alto | `0.14 <= gap_cc < 0.24` | Prioridad glúteo/femoral clara |
| muy alto | `gap_cc >= 0.24` | Especialización glúteo controlada y fatiga conservadora |

### Mujer: hombro/cadera

Referencia funcional: `1.00`.

```text
gap_hcadera = max(0, 1.00 - hombro_cadera) / 1.00
```

| Bucket | Condición | Lectura programática |
| --- | --- | --- |
| bajo | `< 0.05` | Sin ajuste |
| moderado | `0.05-0.10` | Mantener hombro/espalda en volumen secundario |
| alto | `0.10-0.18` | No abandonar torso; añadir hombro lateral/espalda |
| muy alto | `>= 0.18` | Torso secundario obligatorio aunque prioridad sea glúteo |

### Mujer: glúteo/cintura

Referencia funcional: `1.30`.

```text
gap_gc = max(0, 1.30 - gluteo_cintura) / 1.30
```

| Bucket | Condición | Lectura programática |
| --- | --- | --- |
| bajo | `< 0.06` | Glúteo balanceado |
| moderado | `0.06-0.12` | Subir glúteo levemente |
| alto | `0.12-0.20` | Prioridad glúteo clara |
| muy alto | `>= 0.20` | Especialización glúteo con control de recuperación |

## Qué cambia en rutina por bucket

### Bucket bajo

Prioridad:

- Mantener `balanced`, salvo objetivo explícito.

Volumen semanal:

- Prioritarios: rango base según objetivo.
- Secundarios: mantenimiento o volumen medio.

Selección:

- Variada por patrón.
- No forzar especialización.

Upper/lower:

- Distribución estándar por días disponibles.

Fatiga:

- Límite normal por experiencia.

### Bucket moderado

Prioridad:

- Añadir prioridad secundaria al grupo relacionado con el ratio.

Volumen semanal:

- +2 a +4 series/semana al grupo relacionado.
- Restar 0 a 2 series de grupos no prioritarios si el total de fatiga sube demasiado.

Selección:

- Añadir 1 ejercicio específico por semana.
- Mantener anchors balanceados.

Upper/lower:

- Sesgo leve: una sesión con primer bloque del grupo rezagado.

Fatiga:

- Mantener límite normal.

### Bucket alto

Prioridad:

- Convertir el grupo relacionado en prioridad principal.

Volumen semanal:

- +4 a +6 series/semana al grupo prioritario, dentro del máximo por experiencia.
- Mantener grupos antagonistas en mínimo efectivo.

Selección:

- Incluir anchor o primary accessory específico en 2 sesiones/semana.
- Añadir aislamiento dirigido.

Upper/lower:

- Aumentar frecuencia del bloque prioritario.
- Si prioridad torso: más upper/push/pull.
- Si prioridad glúteo/pierna: más lower/glutes.

Fatiga:

- No aumentar límite de fatiga; redistribuir volumen.

### Bucket muy alto

Prioridad:

- Especialización controlada.

Volumen semanal:

- Prioritario en límite alto permitido por experiencia.
- Secundarios en mantenimiento.
- Evitar más de 2 grupos prioritarios simultáneos.

Selección:

- 2-3 estímulos/semana del grupo prioritario.
- Al menos 1 anchor y 1 aislamiento específico.
- Variar patrones para evitar sobreuso.

Upper/lower:

- Sesgo semanal explícito.
- Hombre torso: 2-3 estímulos espalda/hombro.
- Mujer glúteo: 2-3 estímulos glúteo/femoral/abductores.

Fatiga:

- Aplicar límite conservador si objetivo metabólico es `fat_loss` o `recomposition`.
- No usar fallo sistemático.

## Adaptación específica por género

### Hombre con bajo hombro/cintura

Prioridad muscular:

- Primaria: espalda y hombro lateral/posterior.
- Secundaria: pecho superior si el objetivo es torso.
- Mantenimiento: pierna y brazos, salvo objetivo explícito.

Volumen semanal sugerido:

| Bucket | Espalda | Hombros | Pecho | Pierna |
| --- | ---: | ---: | ---: | ---: |
| bajo | 10-14 | 10-14 | 8-12 | 8-12 |
| moderado | 12-16 | 12-16 | 8-12 | 6-10 |
| alto | 14-18 | 14-18 | 8-12 | 6-10 |
| muy alto | 16-20 | 16-20 | 6-10 | 6-8 |

Selección:

- Espalda: vertical pull + row.
- Hombro: shoulder abduction + rear delt.
- Pecho: mantener press inclinado/plano sin monopolizar.

Distribución:

- 3 días: Push, Legs, Pull o Upper, Lower, Upper.
- 4 días: Push, Legs, Pull, Upper.
- 5+ días: Push/Pull/Legs con upper adicional.

### Mujer con cintura/cadera alta

Prioridad muscular:

- Primaria: glúteo, abductores, femoral.
- Secundaria: cuádriceps y espalda/hombro si hombro/cadera también está bajo.
- Mantenimiento: pecho y brazos.

Volumen semanal sugerido:

| Bucket | Glúteo | Femoral | Abductores | Cuádriceps | Torso |
| --- | ---: | ---: | ---: | ---: | ---: |
| bajo | 10-14 | 8-12 | 4-8 | 8-12 | 8-12 |
| moderado | 12-16 | 10-14 | 6-10 | 8-12 | 6-10 |
| alto | 14-18 | 10-16 | 8-12 | 8-12 | 6-10 |
| muy alto | 16-20 | 12-16 | 8-14 | 6-10 | 4-8 |

Selección:

- Glúteo: hip thrust, squat glute-biased, hinge, unilateral.
- Abductores: machine/cable hip abduction.
- Femoral: knee flexion y hinge.

Distribución:

- 3 días: Lower glute, Upper, Lower posterior.
- 4 días: Lower A, Upper A, Lower B, Upper B.
- 5 días: Lower A, Upper, Lower B, Pull/Upper, Lower C.

Manejo de torso:

- No eliminar torso.
- Mantener espalda/hombro en volumen secundario si hombro/cadera bajo.
- Reducir pecho si compite con volumen prioritario y no es objetivo.

### Perfil balanceado

Prioridad:

- `balanced`.

Volumen:

- No aplicar boosts.
- Mantener rangos medios.

Selección:

- Cubrir patrones principales semanalmente: squat, hinge/hip thrust, horizontal push, vertical/horizontal pull, shoulder abduction, core opcional.

Distribución:

- Usar split estándar por días disponibles.

## Objetivo metabólico

`objetivo_metabolico` modula fatiga:

- `hypertrophy`: aplicar boost completo dentro de límites.
- `recomposition`: aplicar boost moderado; conservar recuperación.
- `fat_loss`: no subir volumen total agresivamente; redistribuir volumen y agregar cardio programado si aplica.
- `maintenance`: mantener volumen medio; ratio solo ajusta énfasis.
- `general_fitness`: ratio no debe dominar sobre técnica, adherencia y seguridad.

## Días de entrenamiento

`dias_entrenamiento_semana` limita frecuencia:

| Días | Adaptación máxima |
| ---: | --- |
| 1 | Prioridad aparece primero; no especializar agresivamente |
| 2 | Prioridad recibe 1-2 bloques; volumen moderado |
| 3 | Prioridad puede aparecer 2 veces |
| 4 | Prioridad puede aparecer 2 veces y una asistencia |
| 5 | Prioridad puede aparecer 3 veces |
| 6 | Especialización viable con recovery controlado |
| 7 | Un día debe ser recovery/core/cardio suave |

## Casos de prueba esperados

### Caso 1: hombre con baja proporción hombro/cintura

Input:

```json
{
  "genero": "hombre",
  "hombros": 115,
  "cintura": 90,
  "cadera": 100,
  "objetivo_metabolico": "hypertrophy",
  "dias_entrenamiento_semana": 4
}
```

Cálculo:

```text
hombro_cintura = 115 / 90 = 1.28
gap = (1.60 - 1.28) / 1.60 = 0.20
bucket = muy alto
```

Esperado:

- Prioridad primaria: espalda + hombros.
- Split sugerido: Push, Legs, Pull, Upper.
- Espalda/hombros en rango alto.
- Al menos 2 estímulos semanales de espalda y hombro.
- No subir pierna por encima de mantenimiento si no es objetivo.

### Caso 2: mujer con cintura/cadera alta

Input:

```json
{
  "genero": "mujer",
  "cintura": 82,
  "cadera": 98,
  "gluteo": 102,
  "hombros": 96,
  "objetivo_metabolico": "recomposition",
  "dias_entrenamiento_semana": 4
}
```

Cálculo:

```text
cintura_cadera = 82 / 98 = 0.84
gap = (0.84 - 0.72) / 0.72 = 0.17
bucket = alto
```

Esperado:

- Prioridad primaria: glúteo + femoral + abductores.
- Split sugerido: Lower A, Upper A, Lower B, Upper B.
- Glúteo 14-18 series/semana si experiencia lo permite.
- Abductores 8-12 series/semana.
- Torso en mantenimiento o secundario; no eliminado.
- Fatiga conservadora por recomposition.

### Caso 3: perfil balanceado

Input:

```json
{
  "genero": "hombre",
  "hombros": 128,
  "cintura": 80,
  "cadera": 100,
  "objetivo_metabolico": "maintenance",
  "dias_entrenamiento_semana": 3
}
```

Cálculo:

```text
hombro_cintura = 128 / 80 = 1.60
gap = 0
bucket = bajo
```

Esperado:

- Prioridad: balanced.
- Split sugerido: Push, Legs, Pull o Full Body A/B/C según preferencia.
- Volumen equilibrado.
- Sin boost de hombros/espalda.
- Fatiga normal.

## Criterios de aceptación medibles

El motor pasa si:

- Calcula ratios con 2 decimales o más para trazabilidad.
- Asigna bucket correcto para ratio principal según género.
- Si `ratio_status = insufficient_data`, no aplica boost por ratio.
- Hombre con bucket alto/muy alto en hombro/cintura recibe más volumen de espalda/hombros que pecho y pierna, salvo objetivo contrario.
- Mujer con bucket alto/muy alto en cintura/cadera recibe más volumen de glúteo/femoral/abductores que pecho/brazos, salvo objetivo contrario.
- Perfil bucket bajo mantiene `priority = balanced` si no hay prioridad explícita.
- El boost de volumen no supera máximos por experiencia.
- El boost no aumenta fatiga por sesión por encima del límite.
- La distribución semanal refleja la prioridad en frecuencia, no solo en un ejercicio aislado.
- Las rutinas mantienen al menos volumen de mantenimiento para grupos no prioritarios.
- Toda adaptación aparece en `quality_checks` o `adaptation_summary`.

Ejemplo de salida esperada:

```json
{
  "adaptation_summary": {
    "ratio_status": "ok",
    "primary_ratio": "hombro_cintura",
    "primary_ratio_value": 1.28,
    "bucket": "muy_alto",
    "priority_adjustments": ["back", "shoulders"],
    "volume_adjustment": {
      "back": "+4_to_6_sets",
      "shoulders": "+4_to_6_sets",
      "legs": "maintenance"
    },
    "fatigue_policy": "redistribute_volume_without_raising_session_limit"
  }
}
```
