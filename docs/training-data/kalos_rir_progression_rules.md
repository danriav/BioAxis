# Reglas de RIR y progresión Kalos

Fecha: 2026-06-03

Estado: documento funcional. No modifica código.

## Objetivo

Definir cómo Kalos debe prescribir RIR según nivel del atleta, tipo de ejercicio y fase de progresión. El nivel debe impactar principalmente la cercanía al fallo, no solo la cantidad de ejercicios.

## Definiciones

`RIR` significa repeticiones en reserva.

- `RIR 3`: quedan aproximadamente 3 repeticiones posibles.
- `RIR 2`: esfuerzo moderado-alto, seguro para la mayoría.
- `RIR 1`: cerca del fallo.
- `RIR 0`: fallo técnico o casi fallo; debe usarse con cuidado.

## 1. RIR recomendado por nivel

| Nivel | RIR base | Uso de RIR 0 | Política |
| --- | ---: | --- | --- |
| `beginner` | 2-4 | No por defecto | Técnica, control y adherencia |
| `intermediate` | 1-3 | Solo aislamientos/accesorios seguros | Hipertrofia con fatiga controlada |
| `advanced` | 0-3 | Permitido estratégicamente | Intensidad avanzada, no sistemática |

Reglas:

- Beginner no debe recibir RIR 0 en anchors.
- Intermediate puede llegar a RIR 0 en aislamientos, no como norma en compuestos.
- Advanced puede usar RIR 0, pero no en todos los ejercicios ni todas las semanas.

## 2. RIR por tipo de ejercicio

### Anchors / compuestos pesados

Ejemplos: sentadilla, press banca, press militar, peso muerto rumano, hip thrust pesado, prensa pesada.

| Nivel | RIR recomendado |
| --- | --- |
| `beginner` | 2-4 |
| `intermediate` | 1-3 |
| `advanced` | 1-2, ocasional 0 solo si estable |

Reglas:

- Anchors deben priorizar técnica y progresión.
- RIR 0 en anchors solo advanced, ejercicios estables y semanas puntuales.
- Si hay dolor, lesión o fatiga alta: mínimo RIR 2.

### Primary accessory

Ejemplos: segundo press, remo, jalón, búlgaras, leg press, curl femoral pesado.

| Nivel | RIR recomendado |
| --- | --- |
| `beginner` | 2-3 |
| `intermediate` | 1-2 |
| `advanced` | 0-2 |

Reglas:

- Intermediate puede acercarse más al fallo que en anchors.
- Advanced puede usar RIR 0 en accesorios estables, no en todos.

### Secondary accessory

Ejemplos: variantes unilaterales, rear delt, trabajo complementario de hombro/espalda/pierna.

| Nivel | RIR recomendado |
| --- | --- |
| `beginner` | 2-3 |
| `intermediate` | 1-2 |
| `advanced` | 0-2 |

Reglas:

- Si el ejercicio tiene alta demanda técnica o articular, subir 1 punto de RIR.
- En días de mucha densidad, preferir RIR 1-2.

### Isolation

Ejemplos: curl bíceps, extensión tríceps, elevaciones laterales, extensiones de pierna, curl femoral, abductores, pantorrilla.

| Nivel | RIR recomendado |
| --- | --- |
| `beginner` | 1-3 |
| `intermediate` | 0-2 |
| `advanced` | 0-1 |

Reglas:

- Aislamientos son el lugar más seguro para RIR 0.
- Beginner puede usar RIR 1 solo si el ejercicio es estable y sin dolor.
- No llevar sistemáticamente a RIR 0 ejercicios con molestia articular.

### Finisher

Ejemplos: drop set de aislamiento, pantorrilla alta repetición, core ligero, cardio breve.

| Nivel | RIR recomendado |
| --- | --- |
| `beginner` | No usar por defecto; RIR 2-3 si aparece |
| `intermediate` | RIR 0-2 |
| `advanced` | RIR 0-1 |

Reglas:

- Finisher nunca debe reemplazar volumen principal.
- No usar finisher a RIR 0 en compuestos pesados.
- En fat loss/recomposition, el finisher no debe disparar fatiga sistémica.

## 3. Progresión de RIR en 8 semanas

Modelo recomendado: progresión gradual de esfuerzo + descarga.

| Semana | Beginner | Intermediate | Advanced |
| ---: | --- | --- | --- |
| 1 | RIR 3-4 | RIR 2-3 | RIR 2-3 |
| 2 | RIR 3 | RIR 2 | RIR 2 |
| 3 | RIR 2-3 | RIR 1-2 | RIR 1-2 |
| 4 | RIR 2 | RIR 1 | RIR 0-1 en accesorios |
| 5 | Deload RIR 4 | Deload RIR 3-4 | Deload RIR 3 |
| 6 | RIR 2-3 | RIR 1-2 | RIR 1-2 |
| 7 | RIR 2 | RIR 1 | RIR 0-1 |
| 8 | RIR 1-2 | RIR 0-1 en aislamientos | RIR 0 estratégico |

Reglas:

- El RIR semanal ajusta el rango base, no lo ignora.
- En deload, reducir volumen y aumentar RIR.
- RIR 0 en semana 8 debe limitarse a aislamientos/accesorios seguros, salvo advanced con ejercicio estable.

## 4. Límites de seguridad

Ejercicios que nunca deberían ir sistemáticamente a RIR 0:

- Sentadillas libres pesadas.
- Peso muerto rumano pesado.
- Press militar pesado.
- Press banca pesado sin control/spotter.
- Búlgaras pesadas o ejercicios unilaterales inestables.
- Ejercicios con alto estrés lumbar.
- Ejercicios con dolor reportado.
- Cualquier ejercicio nuevo para beginner.

Reglas duras:

- Si `pain_flag` o restricción articular existe: RIR mínimo 2.
- Si `fatigue_points` de sesión está cerca del límite: subir RIR 1 punto.
- Si el ejercicio tiene `fatigue_cost = high`: no asignar RIR 0 a beginner; evitar RIR 0 sistemático en intermediate.
- Si `joint_stress` incluye lumbar/shoulder/knee y hay restricción relacionada: RIR mínimo 2-3.

## 5. Tabla final lista para Backend

```json
{
  "rir_rules": {
    "beginner": {
      "anchor": { "min": 2, "max": 4, "allow_zero": false },
      "primary_accessory": { "min": 2, "max": 3, "allow_zero": false },
      "secondary_accessory": { "min": 2, "max": 3, "allow_zero": false },
      "isolation": { "min": 1, "max": 3, "allow_zero": false },
      "finisher": { "min": 2, "max": 3, "allow_zero": false }
    },
    "intermediate": {
      "anchor": { "min": 1, "max": 3, "allow_zero": false },
      "primary_accessory": { "min": 1, "max": 2, "allow_zero": "stable_only" },
      "secondary_accessory": { "min": 1, "max": 2, "allow_zero": "stable_only" },
      "isolation": { "min": 0, "max": 2, "allow_zero": true },
      "finisher": { "min": 0, "max": 2, "allow_zero": true }
    },
    "advanced": {
      "anchor": { "min": 1, "max": 2, "allow_zero": "stable_only_week_4_or_8" },
      "primary_accessory": { "min": 0, "max": 2, "allow_zero": true },
      "secondary_accessory": { "min": 0, "max": 2, "allow_zero": true },
      "isolation": { "min": 0, "max": 1, "allow_zero": true },
      "finisher": { "min": 0, "max": 1, "allow_zero": true }
    }
  }
}
```

Backend debe aplicar después estos overrides:

```text
IF pain_or_restriction THEN rir_min >= 2
IF deload_week THEN rir_min >= 3 AND rir_max >= 3
IF fatigue_cost = high AND experience = beginner THEN rir_min >= 2
IF role = anchor AND experience != advanced THEN rir_min >= 1
IF exercise_is_unstable THEN rir_min += 1
```

## 6. Criterios de aceptación

La implementación es correcta si:

- Beginner nunca recibe RIR 0 en anchors.
- Beginner tiene RIR promedio semanal >= 2.
- Intermediate puede recibir RIR 0 solo en aislamientos/finishers o accesorios estables.
- Advanced puede recibir RIR 0, pero no en más del 30% de ejercicios semanales.
- Semana 5 de un plan de 8 semanas usa deload con RIR más alto.
- RIR baja gradualmente de semanas 1 a 4 y de 6 a 8.
- Dolor/restricción fuerza RIR mínimo 2.
- Ningún ejercicio `high` + estrés lumbar se prescribe a RIR 0 de forma sistemática.
- Finishers a RIR 0 solo aparecen en intermediate/advanced.
- La salida incluye `rir_target` por ejercicio y, si aplica, `rir_progression_by_week`.

Ejemplo de auditoría:

```json
{
  "exercise": "Sentadilla con Barra",
  "experience": "beginner",
  "role": "anchor",
  "fatigue_cost": "high",
  "rir_target": { "min": 2, "max": 4 },
  "passes": true
}
```
