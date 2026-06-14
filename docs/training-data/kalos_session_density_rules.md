# Reglas de densidad de sesión Kalos

Fecha: 2026-06-02

Estado: documento funcional. No modifica código, backend ni frontend.

## Objetivo

Definir reglas para que el motor Kalos genere sesiones completas y útiles, no solo una estructura mínima de `anchor` + `accessory`. La densidad debe aumentar según tiempo disponible, experiencia, objetivo y prioridad, sin romper volumen semanal, fatiga ni seguridad.

## Principio base

Una sesión normal de fuerza/hipertrofia debe contener:

1. `anchor`
2. `primary_accessory`
3. `secondary_accessory`
4. `isolation`
5. `finisher` opcional

Una sesión de 45+ minutos no debe quedar con 1-2 ejercicios salvo que exista una justificación explícita: catálogo/equipo limitado, deload, dolor/restricción, sesión express o recovery/core.

## 1. Ejercicios por sesión según tiempo

| Tiempo disponible | Ejercicios objetivo | Mínimo aceptable | Máximo permitido | Series efectivas objetivo | Notas |
| --- | ---: | ---: | ---: | ---: | --- |
| 30-45 min | 3-4 | 3 | 5 | 6-10 | Compacta; sin finisher por defecto |
| 46-60 min | 4-5 | 4 | 6 | 10-14 | Sesión estándar corta |
| 61-75 min | 5-6 | 5 | 7 | 14-18 | Sesión completa normal |
| 76-90 min | 6-7 | 6 | 8 | 18-22 | Completa con accesorios/aislamientos |
| 91-120 min | 7-9 | 7 | 10 | 20-24 | Avanzada o especialización |

Reglas:

- El objetivo normal para 60 minutos es 5 ejercicios.
- El objetivo normal para 75 minutos es 6 ejercicios.
- El objetivo normal para 90 minutos es 7 ejercicios.
- En 91-120 minutos, agregar ejercicios solo si quedan volumen semanal, fatiga y tiempo reales.
- Cardio, movilidad o calentamiento no reemplazan la densidad mínima de fuerza.
- Cardio cuenta como ejercicio solo si aparece con `role = cardio`; no cuenta como `anchor`, `primary_accessory`, `secondary_accessory` ni `isolation`.

## 2. Ejercicios por sesión según experiencia

| Experiencia | Mínimo normal | Objetivo normal | Máximo normal | Máximo excepcional |
| --- | ---: | ---: | ---: | ---: |
| `beginner` | 3 | 4-5 | 6 | 7 |
| `intermediate` | 4 | 5-7 | 8 | 9 |
| `advanced` | 5 | 6-8 | 10 | 11 |

Reglas:

- `beginner` debe ser simple: menos ejercicios, más estables, menor fatiga y menos finishers.
- `intermediate` puede tener densidad completa con 5-7 ejercicios.
- `advanced` puede usar más densidad, pero no más fallo ni fatiga indiscriminada.
- El máximo excepcional requiere `density.warning` o `quality_checks.warnings`.
- Si tiempo y experiencia chocan, usar el menor de ambos máximos.

Ejemplo:

- Advanced con 45 min no debe recibir 9 ejercicios.
- Beginner con 120 min no debe recibir 10 ejercicios de hipertrofia dura; usar descansos, técnica, core suave o cardio si procede.

## 3. Composición por tipo de día

### Lower / Legs

Objetivo: cubrir rodilla, cadera y accesorios de pierna sin duplicar fatiga.

Composición normal:

- 1 `anchor`: `squat`, `hinge`, `hip_thrust` o prensa/sentadilla equivalente.
- 1-2 `primary_accessory`: patrón complementario al anchor.
- 1 `secondary_accessory`: variante unilateral, extensión/curl o patrón menos fatigante.
- 1-3 `isolation`: cuádriceps, femoral, pantorrilla, abductores/aductores.
- 0-1 `finisher`: pantorrilla, abductores/aductores o cardio LISS breve.

Reglas:

- Si el anchor es dominante de rodilla, agregar un patrón de cadera/femoral.
- Si el anchor es dominante de cadera, agregar un patrón de rodilla.
- No usar más de 2 ejercicios `high` de pierna en beginner.
- Evitar más de 2 ejercicios con estrés lumbar.

### Upper

Objetivo: balancear pecho, espalda, hombros y brazos.

Composición normal:

- 1 `anchor`: press o pull principal.
- 1 `primary_accessory`: patrón opuesto o complementario.
- 1-2 `secondary_accessory`: hombro, pecho, espalda o brazos.
- 1-3 `isolation`: lateral raise, rear delt, bíceps, tríceps.
- 0-1 `finisher`: brazos, deltoides o core ligero.

Reglas:

- Upper no debe convertirse en solo pecho + tríceps ni solo espalda + bíceps, salvo prioridad declarada.
- Si hay press pesado, limitar estrés de hombro acumulado.
- En 60+ min, incluir al menos un patrón de empuje y uno de tracción.

### Push

Composición normal:

- 1 `anchor`: press inclinado, press plano o press militar.
- 1 `primary_accessory`: segundo press o fly.
- 1 `secondary_accessory`: hombro o tríceps.
- 1-2 `isolation`: lateral raise, tríceps o pecho.
- 0-1 `finisher`: tríceps/lateral raise solo si cabe.

Reglas:

- En 45 min: pecho/hombro/tríceps deben estar representados con 3-4 ejercicios.
- En 60+ min: incluir tríceps directo si el volumen semanal está bajo.
- No usar 3 presses pesados en la misma sesión.

### Pull

Composición normal:

- 1 `anchor`: jalón/dominada o remo.
- 1 `primary_accessory`: patrón opuesto, si anchor es jalón usar remo; si anchor es remo usar jalón.
- 1 `secondary_accessory`: espalda secundaria o rear delt.
- 1-2 `isolation`: bíceps, rear delt o antebrazo.
- 0-1 `finisher`: bíceps/rear delt.

Reglas:

- En 60+ min, tracción vertical y horizontal deben aparecer si catálogo/equipo lo permiten.
- Bíceps directo aparece cuando queda volumen y tiempo, no antes del patrón principal.
- Evitar demasiadas variantes con estrés lumbar.

### Glutes

Composición normal:

- 1 `anchor`: `hip_thrust`, variante glute-biased de `squat` o `hinge`.
- 1 `primary_accessory`: patrón complementario al anchor.
- 1 `secondary_accessory`: unilateral, leg press glute-biased o kickback/extension.
- 1-3 `isolation`: `hip_abduction`, femoral, aductores si aplica.
- 0-1 `finisher`: abductores, glúteo medio o LISS.

Reglas:

- Si anchor es `hip_thrust`, añadir rodilla o bisagra.
- Si anchor es `squat`, añadir hip thrust o bisagra.
- Abductores aparecen con alta prioridad glúteo cuando el tiempo es 60+ min.
- No añadir glúteo extra en días upper salvo weak point planificado.

### Full Body

Composición normal:

- 1 `anchor`: patrón principal según prioridad.
- 1 `primary_accessory`: patrón grande no cubierto por anchor.
- 1 `secondary_accessory`: tercer patrón grande.
- 1-2 `isolation`: músculo prioritario o pequeño rezagado.
- 0-1 `finisher`: core, pantorrilla o cardio breve.

Reglas:

- En 60+ min debe incluir al menos: 1 inferior, 1 empuje, 1 tracción.
- En 30-45 min: elegir 3 patrones grandes + 0-1 aislamiento.
- No intentar cubrir todos los músculos con series altas en una sola sesión.

### Recovery / Core

Composición normal:

- 0 `anchor` de fuerza pesada.
- 0-1 `primary_accessory` ligero si es correctivo.
- 1-3 `isolation` o core.
- 0-2 cardio/movilidad ligera.
- 0 `finisher` de alta intensidad.

Reglas:

- Debe ser intencionalmente ligero.
- No debe perseguir volumen alto.
- Fatiga baja obligatoria.
- Si incluye cardio, preferir LISS salvo objetivo específico y usuario apto.

## 4. Distribución por rol

| Tiempo | Anchor | Primary accessory | Secondary accessory | Isolation | Finisher |
| --- | ---: | ---: | ---: | ---: | ---: |
| 30-45 min | 1 | 1 | 0-1 | 1-2 | 0 |
| 46-60 min | 1 | 1 | 1 | 1-2 | 0-1 |
| 61-75 min | 1 | 1-2 | 1 | 2 | 0-1 |
| 76-90 min | 1-2 | 2 | 1-2 | 2 | 0-1 |
| 91-120 min | 1-2 | 2-3 | 1-2 | 2-3 | 0-1 |

Reglas:

- `anchor` se elige primero y no se elimina salvo sustitución validada.
- `primary_accessory` debe completar el patrón del día.
- `secondary_accessory` aparece cuando el tiempo es 46+ min o cuando el día necesita balance.
- `isolation` completa volumen sin disparar fatiga sistémica.
- `finisher` nunca se añade antes de completar roles mínimos.

## 5. Límites

### Fatiga máxima por sesión

Puntos:

- `low` = 1
- `medium` = 2
- `high` = 3

| Experiencia | Límite normal | Límite excepcional |
| --- | ---: | ---: |
| `beginner` | 8 | 10 |
| `intermediate` | 12 | 14 |
| `advanced` | 16 | 18 |

Reglas:

- Si se supera el límite normal, reducir en este orden: `finisher`, `isolation` menos prioritario, `secondary_accessory`, cambio de `high` a `medium`.
- Si se supera el límite excepcional, la sesión es inválida.
- Beginner: máximo 2 ejercicios `high`.
- Intermediate: máximo 3 ejercicios `high`.
- Advanced: máximo 4 ejercicios `high`.

### Series máximas por sesión

| Tiempo | Máximo series duras |
| --- | ---: |
| 30-45 min | 10 |
| 46-60 min | 14 |
| 61-75 min | 18 |
| 76-90 min | 22 |
| 91-120 min | 24 |

Reglas:

- Las series de warmup no cuentan como series duras.
- Cardio no cuenta como series duras.
- Si una sesión alcanza el máximo de series, no agregar más ejercicios aunque haya tiempo.

### Volumen semanal máximo por músculo

| Experiencia | Máximo normal por músculo | Máximo excepcional |
| --- | ---: | ---: |
| `beginner` | 12 | 14 |
| `intermediate` | 16 | 18 |
| `advanced` | 20 | 22 |

Reglas:

- Excepción solo para músculo prioritario único, sin dolor, con frecuencia distribuida y sin fallo excesivo.
- No concentrar más de 10-12 series de un músculo en una sola sesión salvo advanced y justificación.
- Si el volumen semanal ya está cubierto, no añadir ejercicios de ese músculo aunque la sesión tenga espacio.

### Cuándo NO agregar más ejercicios aunque haya tiempo

No agregar más ejercicios si:

- Se alcanzó el volumen semanal del músculo objetivo.
- Se alcanzó el máximo de series duras de la sesión.
- Se alcanzó el límite de fatiga.
- Agregar el ejercicio desplaza un patrón principal faltante.
- El ejercicio disponible repite patrón/equipo/articulación sin justificación.
- Hay dolor, lesión o restricción que exige menor densidad.
- El catálogo/equipo disponible solo ofrece variantes pobres o redundantes.
- La sesión es recovery/core.
- El plan está en deload.
- El usuario pidió sesión express.

## 6. Reglas de prioridad

### Prioridad glutes

- Aumentar densidad en sesiones glutes/lower, no en todas las sesiones.
- Agregar volumen en este orden: `anchor` glúteo, patrón complementario, `hip_abduction`, femoral/aductor si aporta balance.
- Frecuencia normal: 2-3 estímulos por semana.
- No agregar glúteo extra si ya hay 6-10 series de glúteo en esa sesión.

### Prioridad legs

- Aumentar densidad en lower/legs.
- Alternar cuádriceps y cadena posterior.
- Agregar pantorrilla si queda espacio y volumen semanal bajo.
- Agregar aductores/abductores en 75+ min o cuando sean parte de la prioridad.

### Prioridad torso

- Aumentar densidad en upper/push/pull.
- Push: pecho/hombro/tríceps.
- Pull: espalda/rear delt/bíceps.
- Upper: empuje + tracción + hombro + brazo si tiempo >= 60.
- No sacrificar tracción por añadir más presses.

### Prioridad balanced

- Mantener distribución pareja.
- Full body debe cubrir inferior, empuje y tracción en 60+ min.
- Ningún músculo debe ocupar más de 40% de ejercicios de una sesión normal.
- Aislamientos se usan para completar volumen, no para convertir todo en prioridad.

## Cuándo incluir brazos

Incluir bíceps/tríceps si:

- Día es `upper`, `push`, `pull` o torso-priority.
- Tiempo >= 46-60 min.
- El volumen semanal de brazos está por debajo del objetivo.

No incluir si:

- Reemplaza empuje/tracción principal.
- Beginner con sesión corta ya completó patrón principal.
- Fatiga de codo o restricción articular.

## Cuándo incluir pantorrilla

Incluir pantorrilla si:

- Día es `lower`, `legs`, `full body` o prioridad legs.
- Tiempo >= 46-60 min, o 30-45 min con prioridad explícita.
- Volumen semanal de pantorrilla está bajo.

No incluir si:

- Desplaza cuádriceps/femoral/glúteo principal.
- Ya hay 2-3 exposiciones semanales suficientes.

## Cuándo incluir core

Incluir core si:

- Día es `recovery/core`, `full body` o general fitness.
- Objetivo es recomposition/fat_loss/general_fitness.
- Hay tiempo y fatiga baja.

No incluir si:

- Dolor lumbar o restricción incompatible.
- Se usa como relleno automático.
- Desplaza el objetivo principal de la sesión.

## Cuándo incluir abductores/aductores

Incluir abductores si:

- Prioridad glutes.
- Día lower/glutes.
- Se necesita glúteo medio o estabilidad de cadera.

Incluir aductores si:

- Prioridad legs.
- Día lower/legs.
- La semana necesita balance de cadera o estímulo aductor.

Reglas:

- En 30-45 min: elegir abductores o aductores, no ambos.
- En 61-75+ min: ambos pueden aparecer si prioridad legs/glutes y fatiga lo permite.
- Beginner: preferir máquina estable.

## 7. Criterios de aceptación

Una sesión normal pasa si:

- Respeta mínimo de ejercicios por tiempo y experiencia.
- Tiene al menos 1 `anchor`, salvo recovery/core.
- Tiene al menos 1 `primary_accessory`.
- En 46+ min tiene al menos 1 `secondary_accessory` o 2 `isolation`.
- No queda con solo 1-2 ejercicios salvo justificación explícita.
- Respeta límite de fatiga.
- Respeta máximo de series duras.
- Respeta volumen semanal por músculo.
- No repite ejercicio exacto sin justificación.
- No agrega finisher antes de completar la estructura base.

Beginner:

- Debe ser más simple.
- Debe priorizar técnica, estabilidad y menor fatiga.
- RIR 0 no debe ser default en anchors.
- Finishers desactivados por defecto.

Intermediate:

- Debe usar rutinas completas de 5-7 ejercicios cuando el tiempo lo permite.
- Puede usar aislamientos y accesorios para completar volumen.
- Puede usar finisher ocasional.

Advanced:

- Puede tener más densidad y especialización.
- No debe implicar fallo/fatiga excesiva por defecto.
- Puede usar 2 anchors solo con tiempo suficiente y patrones no redundantes.

Recovery/Core:

- Debe ser intencionalmente ligero.
- Puede tener 2-5 ejercicios, pero baja fatiga.
- No requiere anchor pesado.
- No debe perseguir volumen semanal alto.

## Algoritmo de llenado recomendado

1. Calcular objetivo de ejercicios por tiempo.
2. Ajustar por experiencia.
3. Ajustar por objetivo.
4. Determinar tipo de día y prioridad.
5. Seleccionar `anchor`.
6. Seleccionar `primary_accessory`.
7. Agregar `secondary_accessory` para balance de patrón.
8. Agregar `isolation` para completar volumen muscular.
9. Considerar brazos, pantorrilla, core, abductores/aductores según tipo de día.
10. Agregar `finisher` solo si sobran tiempo, volumen y fatiga.
11. Validar densidad, fatiga, series, volumen semanal y duplicados.
12. Si falla, reducir desde lo menos crítico: finisher, isolation, secondary accessory. Nunca quitar anchor sin sustitución.

## Salida esperada por sesión

```json
{
  "density": {
    "time_bucket": "61-75",
    "experience": "intermediate",
    "day_type": "glutes",
    "target_exercise_count": 6,
    "min_exercise_count": 5,
    "max_exercise_count": 7,
    "target_effective_sets": 16,
    "max_effective_sets": 18,
    "fatigue_points": 11,
    "fatigue_limit": 12,
    "composition": {
      "anchor": 1,
      "primary_accessory": 2,
      "secondary_accessory": 1,
      "isolation": 2,
      "finisher": 0
    },
    "warnings": []
  }
}
```

## Decisión final

El motor Kalos debe considerar incompleta cualquier sesión de fuerza normal de 45+ minutos con solo `anchor` + `primary_accessory`, salvo justificación explícita. La densidad es parte del plan, no decoración: debe cubrir roles, volumen, prioridad y seguridad.
