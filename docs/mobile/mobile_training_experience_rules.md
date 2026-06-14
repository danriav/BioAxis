# Mobile Training Experience Rules - Kalos

Fecha: 2026-06-10

## Objetivo

Definir como debe presentarse y validarse en movil una rutina generada por
Kalos, manteniendo la logica coach de programacion, ratios antropometricos,
quality checks y sustituciones de ejercicios.

Este documento no modifica codigo, prompts productivos, endpoints ni datasets.

## Principios de experiencia movil

La experiencia movil debe priorizar claridad, seguridad y accion rapida. El
usuario no debe leer un reporte tecnico para entender su rutina, pero la app si
debe conservar los guardrails coach antes de mostrarla.

Reglas base:

- Mostrar primero el resumen del plan, despues los dias y por ultimo el detalle
  expandible de ejercicios.
- Usar lenguaje de entrenamiento, no diagnostico medico.
- Distinguir entre rutina valida, rutina ajustada y rutina no mostrable.
- No exponer nombres tecnicos de ratios como `golden_ratio` u `hourglass_ratio`.
- No mostrar datos corporales exactos en la tarjeta de rutina.
- No ocultar advertencias que cambian la forma segura de entrenar.
- No saturar pantalla con campos de backend; mostrar lo necesario y dejar lo
  tecnico como estado interno.

## Informacion minima por rutina

La pantalla de preview o detalle de rutina debe mostrar, arriba de todo:

| Campo | Fuente esperada | Presentacion movil |
|---|---|---|
| Nombre del plan | `program.name` | Titulo principal corto. |
| Dias por semana | `input_summary.days_per_week` | `4 dias/semana`. |
| Tiempo por sesion | `input_summary.time_budget_minutes` | `75 min por sesion`. |
| Nivel | `input_summary.experience` | Principiante, intermedio o avanzado. |
| Objetivo | `input_summary.goal` | Hipertrofia, recomposicion, fuerza/hipertrofia, etc. |
| Enfoque por ratio | `input_summary.biometric_focus` o prioridad | Balanceado, mas torso o mas gluteo/pierna. |
| Estado de calidad | `quality_checks.status` | Aprobada, revisar o no mostrar. |

El resumen no debe mostrar:

- `plan_id` salvo en logs internos o soporte.
- `contract_version`.
- Buckets antropometricos internos.
- Ratios numericos o medidas corporales exactas.
- Warnings crudos con nombres de campos internos.

## Enfoque por ratio

El enfoque por ratio debe explicarse sin tecnicismos:

| Valor interno | Texto recomendado |
|---|---|
| `balanced` | Enfoque equilibrado. |
| `torso` | Ajustada para dar mas trabajo a espalda y hombros sin descuidar pierna. |
| `glutes_legs` | Ajustada para dar mas trabajo a gluteos y pierna sin descuidar torso. |
| `unknown` | Enfoque seleccionado por el usuario. |

Texto recomendado cuando hubo ajuste por ratio:

> Ajustamos la distribucion para priorizar las zonas que mas conviene trabajar,
> manteniendo una rutina equilibrada y segura.

No usar:

- "Tus medidas estan mal".
- "Tienes desproporcion".
- "Corregir cintura/cadera".
- "Diagnostico corporal".

## Quality checks en movil

`quality_checks.status` debe mapearse asi:

| Estado | UX movil | Accion |
|---|---|---|
| `pass` | Mostrar como rutina lista. | Permitir iniciar o guardar. |
| `warning` | Mostrar rutina con aviso breve. | Permitir continuar si no hay bloqueo coach. |
| `fail` | No mostrar rutina completa. | Pedir ajustar configuracion o regenerar. |

Campos internos de `quality_checks`:

| Campo | Visible para usuario | Uso |
|---|---|---|
| `volume_within_limits` | Solo si falla. | Aviso coach visible. |
| `frequency_within_limits` | Solo si falla. | Aviso coach visible. |
| `fatigue_within_limits` | Si warning/fail. | Aviso coach visible. |
| `equipment_available` | Si falla. | Aviso visible y CTA para cambiar equipo. |
| `constraints_respected` | Siempre si falla. | Bloqueante o CTA para ajustar molestias/equipo. |
| `duplicate_exercises_justified` | Interno salvo abuso visible. | Usar para debug o QA. |
| `warnings[]` | Traducidas, no crudas. | Mostrar solo las accionables. |

## Como mostrar cada dia de entrenamiento

Cada dia debe mostrarse como una tarjeta o bloque colapsable:

- Dia y numero: `Dia 1`, `Dia 2`.
- Nombre del dia: `Lower A`, `Push`, `Full Body A`, etc.
- Musculos objetivo: lista corta de 2-4 musculos.
- Duracion estimada: `70 min estimados`.
- Fatiga: baja, media o alta, derivada de `fatigue_points`.
- Numero de ejercicios.
- Estado coach del dia si aplica.

Orden movil recomendado:

1. Resumen del dia.
2. Lista compacta de ejercicios.
3. Detalle expandible por ejercicio.
4. Advertencia coach del dia si existe.

En pantallas pequenas, evitar tablas anchas. Usar filas verticales y chips:

```text
Dia 2 - Upper A
Pecho / Espalda / Hombros
5 ejercicios - 70 min - Fatiga media
```

## Como mostrar ejercicios

Cada ejercicio debe mostrar lo minimo para ejecutar bien:

| Campo | Fuente | UX movil |
|---|---|---|
| Nombre | `exercise_name` | Titulo principal. |
| Musculo principal | `primary_muscle` | Chip o subtitulo. |
| Musculos secundarios | `secondary_muscles` | Solo en detalle expandido. |
| Equipo | `equipment` | Chip visible. |
| Series | `sets` | `3 series`. |
| Reps | `rep_range` | `8-12 reps`. |
| RIR | `rir_target` | `RIR 1-2`. |
| Descanso | `rest_seconds` | `Descanso 120 s`. |
| Nota coach | `coaching_note` | Texto breve si existe. |

Campos que deben quedar secundarios o internos:

- `movement_pattern`.
- `role`.
- `fatigue_cost`.
- `joint_stress`.
- `substitution_group`.
- `weekly_set_contribution`.
- `repeat_justification`, salvo que explique una repeticion visible.

## RIR en mobile

El RIR debe explicarse de forma breve la primera vez:

> RIR significa repeticiones en reserva. RIR 2 = termina la serie sintiendo que
> aun podrias hacer 2 repeticiones con buena tecnica.

Reglas de visualizacion:

- RIR 3-4: esfuerzo controlado.
- RIR 1-2: esfuerzo alto controlado.
- RIR 0: esfuerzo maximo; mostrar solo si el nivel y ejercicio lo permiten.

Advertencias:

- Beginner no debe ver RIR 0.
- Anchors pesados no deben prescribirse sistematicamente a RIR 0.
- Si aparece RIR 0, debe tener contexto: ejercicio seguro, aislamiento o fase
  avanzada.

## Boton "Cambiar ejercicio"

El boton debe ser visible en cada ejercicio, pero no debe competir con la
lectura de series/reps.

Presentacion recomendada:

- Texto: `Cambiar`.
- Icono: recarga o intercambio.
- Tooltip/aclaracion: `Buscar alternativa equivalente`.
- Estado loading: `Buscando...`.
- Estado error: `No encontramos una alternativa segura con tu equipo`.

Reglas coach para sustitucion:

- Mantener musculo principal.
- Mantener patron de movimiento cuando sea posible.
- Mantener rol del ejercicio: anchor, accesorio, aislamiento o finisher.
- Mantener costo de fatiga igual o menor si hay molestias/restricciones.
- Respetar equipo disponible.
- Respetar lesiones, dolor y patrones excluidos.
- Evitar devolver el mismo ejercicio.
- Mostrar si la equivalencia es parcial.

Texto para equivalencia parcial:

> Cambiamos por una alternativa similar. Puede sentirse diferente, pero mantiene
> el objetivo principal del ejercicio.

No mostrar al usuario:

- `equivalence_score` numerico.
- `substitution_group`.
- Razones internas largas.

## Advertencias coach visibles vs internas

### Visibles para usuario

Mostrar advertencias que cambian una accion del usuario:

- Equipo insuficiente para algun ejercicio.
- Restriccion o dolor no respetado.
- Fatiga alta en una sesion.
- Volumen fuera de rango seguro.
- RIR demasiado agresivo para el nivel.
- Rutina ajustada por tiempo, equipo o ratio.
- Sesion muy corta para el tiempo solicitado.
- Sustitucion parcial.

### Internas

Mantener internas o de QA:

- Nombre crudo del warning de backend.
- `duplicate_exercises_justified` si esta justificado.
- `coverage_ratio`.
- Buckets de medidas.
- `plan_id`.
- `contract_version`.
- Conteos tecnicos por `substitution_group`.
- Detalles de scoring de sustitucion.

### Copy recomendado

Para warning visible:

> Ajustamos esta rutina para mantener un volumen razonable y respetar tu equipo.

Para densidad baja:

> Esta sesion queda mas ligera de lo esperado para el tiempo elegido. Puedes
> entrenarla asi o regenerar con mas volumen.

Para fatiga alta:

> Esta sesion puede sentirse demandante. Mantén el RIR indicado y prioriza
> tecnica.

## Lenguaje de seguridad medica

La app no debe presentar la rutina como prescripcion medica ni tratamiento.

Texto recomendado en pantalla de preview o confirmacion:

> Esta rutina es una guia de entrenamiento general. Si tienes dolor, lesion,
> enfermedad o indicacion medica, consulta a un profesional antes de entrenar.

Reglas de lenguaje:

- Usar "guia", "plan", "sugerencia" o "rutina".
- Evitar "tratamiento", "diagnostico", "cura", "rehabilitacion" o
  "prescripcion medica".
- No afirmar que un ejercicio corrige una condicion corporal o clinica.
- No inferir salud hormonal, metabolica o articular desde ratios.
- No mostrar juicios esteticos sobre medidas o forma corporal.

## Casos que deben bloquearse o pedir ajuste

### Bloqueo tecnico

No mostrar la rutina si ocurre:

- Error del motor.
- `invalid_generated_plan`.
- `quality_checks.status = fail`.
- Contrato incompleto o JSON no parseable.
- Sesiones faltantes frente a `days_per_week`.
- Ejercicios sin series, reps, RIR o descanso.

### Bloqueo coach

No mostrar sin autoajuste si ocurre:

- `balanced` con pecho, espalda, hombros, cuadriceps, femorales o gluteos en 0.
- `glutes_legs` con cuadriceps en 0 o bajo piso minimo.
- `torso` con pecho en 0 o pierna de mantenimiento bajo piso.
- Beginner con RIR 0.
- Anchor pesado con RIR 0.
- Dolor/restriccion articular ignorada.
- Equipo no disponible para un ejercicio sin alternativa.
- Sesion normal de 75/120 min con 1-3 ejercicios sin razon de recovery,
  restriccion o fatiga.

### Pedir ajuste al usuario

Pedir ajuste antes de regenerar si:

- El equipo disponible es demasiado limitado.
- El usuario marca dolor en articulaciones clave.
- El tiempo elegido no permite la frecuencia solicitada.
- Beginner pide 6 dias y 120 min con prioridad extrema.
- No hay sustitucion segura para un ejercicio bloqueado.

## Densidad esperada en mobile

La densidad debe ser visible como parte del estado coach, no como numero tecnico
aislado.

| Tiempo | Esperado | UX si esta bajo |
|---|---|---|
| 45 min | 3-4 ejercicios por sesion. | Aceptable si hay buena cobertura. |
| 75 min | 5-6 ejercicios por sesion. | Avisar si varias sesiones quedan en 4 o menos. |
| 120 min | 6-8 ejercicios o bloque complementario. | Pedir ajustar/regenerar si queda en 4 o menos. |

Para beginner:

- Es aceptable que la densidad sea menor si protege fatiga y tecnica.
- En 75/120 min debe sugerirse "rutina mas ligera" o permitir regenerar con mas
  volumen.
- No forzar ejercicios extras si el limite de fatiga ya esta cerca.

## Criterios de aceptacion coach para mobile

Una implementacion mobile cumple la logica coach si:

1. Muestra nombre del plan, dias, tiempo por sesion, nivel, objetivo, enfoque
   por ratio y estado de calidad.
2. Cada dia muestra label, musculos objetivo, duracion estimada, fatiga y numero
   de ejercicios.
3. Cada ejercicio muestra nombre, musculo, equipo, series, reps, RIR y descanso.
4. El boton `Cambiar` llama sustitucion equivalente y respeta equipo,
   restricciones, musculo principal, patron y rol.
5. Los warnings visibles estan traducidos a lenguaje de usuario.
6. Los warnings internos no exponen campos tecnicos ni datos corporales.
7. El enfoque por ratio se comunica como ajuste de distribucion, no como juicio
   corporal.
8. La pantalla incluye disclaimer de guia general, no prescripcion medica.
9. No se muestra una rutina con bloqueo tecnico.
10. No se muestra una rutina con bloqueo coach sin autoajuste o confirmacion de
    cambio de configuracion.
11. Beginner nunca ve RIR 0.
12. Las sesiones largas con densidad baja se marcan como observacion coach.
13. Las sustituciones parciales indican que son similares, no identicas.
14. La app nunca envia `user_id` en el body de preview o sustitucion.
15. La app nunca guarda ni muestra service keys, JWTs completos o detalles de
    autenticacion.

## Checklist QA mobile

Antes de liberar:

- Probar preview `balanced`, `torso` y `glutes_legs`.
- Probar beginner/intermediate/advanced.
- Probar 45, 75 y 120 min.
- Probar sustitucion con equipo completo y limitado.
- Probar lesion/dolor de rodilla, hombro y lumbar.
- Probar token expirado.
- Probar respuesta `warning`.
- Probar respuesta `fail` o error controlado.
- Verificar que no haya scroll horizontal en tarjetas de ejercicios.
- Verificar que RIR, reps y descanso sean legibles en pantallas pequenas.
