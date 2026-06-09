# Kalos Training Backend Contract

Fecha: 2026-05-29

Estado: diseño técnico backend. No implementa el motor completo, no cambia
lógica productiva, no toca frontend y no ejecuta cambios de base de datos.

## Objetivo

Convertir `kalos_training_engine_spec.md` en un contrato backend para soportar
planes `kalos_training_plan.v1` con validación determinista antes de persistir o
mostrar la rutina al usuario.

El backend debe ser la fuente de verdad para:

- validar input del usuario;
- ejecutar o coordinar el motor determinista;
- validar salida final del plan;
- bloquear planes inseguros;
- persistir sólo datos ya validados y asociados al `current_user_id`.

La IA puede explicar o sugerir sustituciones, pero no debe saltarse validadores
de volumen, frecuencia, fatiga, equipo, duplicados ni restricciones.

## Estado Actual Backend

### Schemas actuales

`backend/app/schemas/training.py` cubre persistencia básica:

- `TrainingPlanCreate`
  - `frequency_days`: `3-6`.
  - `duration_weeks`: `4-24`.
  - `sessions`: lista de `TrainingSessionCreate`.
- `TrainingSessionCreate`
  - `day_number`: `1-7`.
  - `muscle_group_id`.
  - `prescribed_sets`: `1-8`.
  - `rir_target`: `0-4`.
  - `session_label`.
- `SessionExerciseCreate`
  - `exercise_id` o `variant_id`.
  - orden, sets, reps, RIR, descanso y contribución semanal.
- `WeeklyVolumeCapCreate` y `WorkoutLogSetCreate`.

El contrato actual representa una rutina como filas normalizadas para
persistencia, no como un plan generado completo con input summary,
taxonomía, sesiones ricas, quality checks y advertencias.

### Modelos actuales

`backend/app/models/training.py` ya contiene:

- `training_plans`
- `training_sessions`
- `session_exercises`
- `weekly_volume_caps`
- `workout_log_sessions`
- `workout_log_sets`
- catálogo base de `exercises`, `exercise_variants`, traducciones y
  `muscle_groups`.

Brecha importante: `training_plans.frequency_days` en SQLAlchemy usa check
`BETWEEN 3 AND 6`, mientras Kalos requiere `days_per_week` de `1` a `7`.

### Rutas actuales

No hay rutas productivas de entrenamiento comparables al contrato Kalos. En
`backend/app/main.py` sólo existen rutas de nutrición:

- `GET /nutrition/search`
- `POST /nutrition/sync-day`
- `POST /nutrition/add-log`
- `GET /nutrition/targets/{user_id}`

En `backend/app/api/v1/routes` sólo existen rutas de health/readiness.

### Servicio actual

`HypertrophyEngineService.calculate_weekly_volume` valida una suma simple de
series por `muscle_group_id` con máximo global de 20. No valida:

- split por días;
- prioridad;
- experiencia;
- presupuesto de tiempo;
- fatiga por sesión;
- equipo disponible;
- taxonomía completa de ejercicios;
- lesiones o restricciones;
- duplicados exactos y justificaciones.

## Brechas Contra `kalos_training_plan.v1`

| Área | Actual | Requerido Kalos v1 | Brecha |
| --- | --- | --- | --- |
| Frecuencia | `frequency_days` 3-6 | `days_per_week` 1-7 | Cambiar schema y DB propuesta. |
| Goal | No existe en training plan | `hypertrophy`, `recomposition`, `fat_loss`, `strength_hypertrophy`, `general_fitness` | Agregar input y persistencia propuesta. |
| Priority | No existe | `torso`, `legs`, `glutes`, `balanced` | Agregar input y usar en split/volumen. |
| Experience | No existe en training plan | `beginner`, `intermediate`, `advanced` | Agregar input y reglas de límite. |
| Time budget | No existe | `time_budget_minutes` 30-150 | Agregar input y validación de duración. |
| Equipment | `equipment_type` simple en catálogo | lista `available_equipment`; ejercicio puede requerir varios equipos | Extender taxonomía. |
| Constraints | No existe | lesiones, dolor, ejercicios excluidos, limitaciones | Agregar schema y validadores. |
| Quality checks | No existe | objeto obligatorio con status, warnings y flags | Agregar response schema. |
| Sessions | Día con un músculo principal | sesión con intent, target muscles, fatigue points y ejercicios ricos | Nuevo schema de salida. |
| Exercises | slot persistente mínimo | taxonomía obligatoria por ejercicio | Extender schema y posiblemente catálogo. |
| Duplicados | No validado | repetición limitada y justificada | Nuevo validador. |
| Fatiga | No validada | puntos por sesión y límites por experiencia | Nuevo validador. |

## Schemas Pydantic Propuestos

Crear un módulo nuevo, por ejemplo
`backend/app/schemas/kalos_training.py`, para no romper los schemas de
persistencia existentes.

### Enums

```python
from enum import StrEnum

class KalosGoal(StrEnum):
    hypertrophy = "hypertrophy"
    recomposition = "recomposition"
    fat_loss = "fat_loss"
    strength_hypertrophy = "strength_hypertrophy"
    general_fitness = "general_fitness"

class KalosPriority(StrEnum):
    torso = "torso"
    legs = "legs"
    glutes = "glutes"
    balanced = "balanced"

class KalosExperience(StrEnum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"

class MovementPattern(StrEnum):
    squat = "squat"
    hinge = "hinge"
    hip_thrust = "hip_thrust"
    horizontal_push = "horizontal_push"
    vertical_push = "vertical_push"
    horizontal_pull = "horizontal_pull"
    vertical_pull = "vertical_pull"
    knee_extension = "knee_extension"
    knee_flexion = "knee_flexion"
    hip_abduction = "hip_abduction"
    hip_adduction = "hip_adduction"
    calf_raise = "calf_raise"
    elbow_flexion = "elbow_flexion"
    elbow_extension = "elbow_extension"
    shoulder_abduction = "shoulder_abduction"
    rear_delt = "rear_delt"
    core_flexion = "core_flexion"
    core_stability = "core_stability"
    cardio_liss = "cardio_liss"
    cardio_hiit = "cardio_hiit"

class ExerciseRole(StrEnum):
    anchor = "anchor"
    primary_accessory = "primary_accessory"
    secondary_accessory = "secondary_accessory"
    isolation = "isolation"
    finisher = "finisher"
    warmup = "warmup"
    cardio = "cardio"

class FatigueCost(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"

class Equipment(StrEnum):
    barbell = "barbell"
    dumbbell = "dumbbell"
    machine = "machine"
    cable = "cable"
    bodyweight = "bodyweight"
    band = "band"
    smith = "smith"
    bench = "bench"
    cardio_machine = "cardio_machine"

class JointStress(StrEnum):
    knee = "knee"
    hip = "hip"
    lumbar = "lumbar"
    shoulder = "shoulder"
    elbow = "elbow"
    wrist = "wrist"
    ankle = "ankle"
    neck = "neck"
```

### Input Request

```python
class KalosConstraints(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    injuries: list[JointStress] = []
    pain_areas: list[JointStress] = []
    excluded_exercise_ids: list[str] = []
    excluded_movement_patterns: list[MovementPattern] = []
    notes: str | None = Field(default=None, max_length=1000)

class AnthropometricBuckets(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    height_bucket_cm: str | None = None
    weight_bucket_kg: str | None = None
    bmi_bucket: str | None = None
    ratio_type: Literal["golden_ratio", "hourglass_ratio", "none"] | None = None
    ratio_gap_bucket: Literal["low", "moderate", "high", "very_high", "unknown"] | None = None

class KalosTrainingPlanRequest(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    days_per_week: int = Field(ge=1, le=7)
    goal: KalosGoal
    priority: KalosPriority
    experience: KalosExperience
    time_budget_minutes: int = Field(ge=30, le=150)
    available_equipment: list[Equipment] = Field(min_length=1)
    constraints: KalosConstraints = Field(default_factory=KalosConstraints)
    sex_reference: Literal["male", "female", "neutral"] = "neutral"
    anthropometric_buckets: AnthropometricBuckets | None = None
    preferred_exercise_ids: list[str] = []
    recent_exercise_ids: list[str] = []
    session_days: list[int] | None = None
    cardio_preference: Literal["none", "low", "moderate"] | None = None
```

Backend auth rule: no `user_id` in body. Route dependencies must derive
`current_user_id` from JWT, matching the nutrition hardening pattern.

### Output Contract

```python
class RangeInt(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")
    min: int
    max: int

class KalosExercise(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    order: int = Field(ge=1, le=50)
    exercise_id: str
    exercise_name: str = Field(min_length=1, max_length=160)
    primary_muscle: str
    secondary_muscles: list[str] = []
    movement_pattern: MovementPattern
    role: ExerciseRole
    sets: int = Field(ge=1, le=8)
    rep_range: RangeInt
    rir_target: RangeInt
    rest_seconds: int = Field(ge=30, le=300)
    fatigue_cost: FatigueCost
    equipment: Equipment
    joint_stress: list[JointStress]
    substitution_group: str = Field(min_length=1, max_length=120)
    weekly_set_contribution: dict[str, int]
    repeat_justification: Literal[
        "specialization",
        "limited_equipment",
        "technical_practice",
        "user_preference",
    ] | None = None
    coaching_note: str | None = Field(default=None, max_length=500)

class KalosSession(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    session_id: str
    day_number: int = Field(ge=1, le=7)
    label: str
    intent: str
    target_muscles: list[str]
    estimated_minutes: int = Field(ge=20, le=180)
    fatigue_points: int = Field(ge=0, le=30)
    exercises: list[KalosExercise] = Field(min_length=1, max_length=12)

class KalosProgression(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    model: Literal["double_progression", "load_progression", "set_progression", "volume_wave"]
    weeks: int = Field(ge=4, le=24)
    rir_start: int = Field(ge=0, le=4)
    rir_end: int = Field(ge=0, le=4)
    deload_week: int | None = Field(default=None, ge=1, le=24)
    load_rule: str = Field(min_length=1, max_length=500)

class KalosQualityChecks(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    status: Literal["pass", "warning", "fail"]
    warnings: list[str] = []
    volume_within_limits: bool
    frequency_within_limits: bool
    fatigue_within_limits: bool
    equipment_available: bool
    constraints_respected: bool
    duplicate_exercises_justified: bool

class KalosProgram(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    name: str = Field(min_length=1, max_length=140)
    duration_weeks: int = Field(ge=4, le=24)
    split: list[str] = Field(min_length=1, max_length=7)
    weekly_volume_targets: dict[str, int]
    progression: KalosProgression
    sessions: list[KalosSession] = Field(min_length=1, max_length=7)

class KalosTrainingPlanResponse(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    contract_version: Literal["kalos_training_plan.v1"]
    plan_id: str
    input_summary: dict
    program: KalosProgram
    quality_checks: KalosQualityChecks
```

### Persisted Draft Schema

Separar contrato generado de persistencia. Propuesta futura:

- `training_plans.contract_version`
- `training_plans.goal`
- `training_plans.priority`
- `training_plans.experience`
- `training_plans.time_budget_minutes`
- `training_plans.quality_status`
- `training_plans.quality_warnings`
- `training_sessions.intent`
- `training_sessions.target_muscles`
- `training_sessions.estimated_minutes`
- `training_sessions.fatigue_points`
- `session_exercises.movement_pattern`
- `session_exercises.role`
- `session_exercises.fatigue_cost`
- `session_exercises.equipment`
- `session_exercises.joint_stress`
- `session_exercises.substitution_group`
- `session_exercises.repeat_justification`

No aplicar estas columnas sin migración revisada y aprobada.

## Validadores Backend Requeridos

Implementar en un servicio nuevo, por ejemplo
`backend/app/services/kalos_training_validator.py`, separado de rutas FastAPI.

### 1. Validador estructural

Bloquea si:

- `contract_version != "kalos_training_plan.v1"`;
- `days_per_week` no coincide con `len(program.sessions)`;
- `split` no coincide en longitud con sesiones;
- `day_number` no es único;
- falta `quality_checks.status`;
- cualquier sesión no recovery/core carece de ancla.

### 2. Volumen

Calcula `weekly_set_contribution` por músculo y compara contra límites por
experiencia:

- beginner: prioritario 8-12, máximo absoluto 12;
- intermediate: prioritario 12-16, máximo absoluto 16;
- advanced: prioritario 14-20, máximo absoluto 20;
- excepción advanced: 22 sólo prioridad única, sin dolor, frecuencia 3 y fallo
  controlado.

Bloquea si excede límites absolutos. Advierte si está bajo el rango recomendado
por objetivo/prioridad.

### 3. Frecuencia

Cuenta días con estímulo por músculo:

- beginner: 1-2 estímulos;
- intermediate: 1-3 estímulos;
- advanced: 2-4 sólo para prioridades o músculos pequeños;
- glutes/legs prioridad: 2-3;
- torso prioridad: pecho/espalda/hombros 2, brazos 1-2.

Bloquea si un músculo excede frecuencia máxima sin justificación de
especialización. Para 7 días, exige al menos una sesión recovery/core/cardio
suave.

### 4. Fatiga

Mapeo:

- low = 1;
- medium = 2;
- high = 3.

Límites:

- beginner: 8 puntos/sesión;
- intermediate: 12 puntos/sesión;
- advanced: 16 puntos/sesión.

Bloquea si:

- `fatigue_points` calculado no coincide con ejercicios;
- excede límite por experiencia;
- beginner tiene más de 2 ejercicios `high`;
- intermediate tiene más de 3 `high`;
- advanced tiene más de 4 `high`;
- una sesión acumula más de 2 ejercicios con estrés lumbar alto.

### 5. Duplicados

Bloquea si:

- beginner repite ejercicio exacto más de una vez por semana salvo full body de
  baja frecuencia;
- intermediate/advanced repiten más de dos veces sin `repeat_justification`;
- se repite el mismo ancla en días consecutivos;
- hay duplicado exacto con distinto nombre pero mismo `exercise_id`.

Permite repetición con:

- `specialization`;
- `limited_equipment`;
- `technical_practice`;
- `user_preference`.

### 6. Equipo disponible

Bloquea si cualquier ejercicio requiere equipo fuera de
`available_equipment`.

Para sustituciones, exige:

- mismo `primary_muscle`;
- mismo `movement_pattern` o equivalente aprobado;
- mismo `role`;
- fatiga igual o menor;
- equipo disponible;
- restricciones articulares respetadas.

### 7. Restricciones y lesiones

Bloquea si:

- ejercicio está en `excluded_exercise_ids`;
- `movement_pattern` está excluido;
- `joint_stress` intersecta con lesión/dolor agudo sin sustitución o warning;
- hay dolor agudo, posoperatorio, rehabilitación clínica o riesgo médico que
  debe derivar a profesional.

Advierte si:

- dolor leve recurrente;
- beginner solicita 6-7 días;
- fat loss combina volumen extremo;
- equipo limitado fuerza sustituciones relevantes.

### 8. Tiempo

Bloquea o marca `fail` si `estimated_minutes` excede
`time_budget_minutes` por más de 10%.

Advierte si el tiempo obliga a bajar volumen o quitar finishers.

### 9. RIR y descanso

Bloquea si:

- `rir_target.min > rir_target.max`;
- RIR está fuera de 0-4;
- beginner usa RIR 0 en básicos/anclas;
- dolor/restricción usa RIR menor a 2;
- `rest_seconds` queda fuera de 30-300, salvo cardio justificado.

## Endpoints Afectados

No existen endpoints actuales de entrenamiento para modificar. Propuesta futura:

### `POST /training/kalos/preview`

Genera y valida un plan sin persistir.

- Auth: `Authorization: Bearer <Supabase JWT>`.
- Body: `KalosTrainingPlanRequest`.
- Response: `KalosTrainingPlanResponse`.
- Usa `current_user_id`; rechaza cualquier `user_id` en body por
  `extra="forbid"`.
- Si `quality_checks.status == "fail"`, responder `422` con detalle de
  validación o `200` con plan no mostrable sólo si el frontend necesita UI de
  reparación. Recomendación backend: `422` para bloqueos.

### `POST /training/kalos/plans`

Genera, valida y persiste un plan.

- Debe fallar si quality status es `fail`.
- Debe persistir bajo `current_user_id`.
- Debe usar transacción para `training_plans`, `training_sessions`,
  `session_exercises` y `weekly_volume_caps`.

### `GET /training/kalos/plans/{plan_id}`

Lee plan persistido del usuario autenticado.

- Debe validar ownership por `current_user_id`.
- `plan_id` ajeno debe devolver `404` o `403` según convención del backend;
  recomendación: `404` para no revelar existencia.

### `POST /training/kalos/plans/{plan_id}/validate`

Recalcula validadores sobre un plan existente o draft. Útil para migraciones,
ediciones y sustituciones controladas.

## Riesgos de Migración

### Frecuencia 1-7

Riesgo: `training_plans.frequency_days` actualmente está limitado a `3-6`.
Kalos requiere `1-7`.

Propuesta documental:

```sql
ALTER TABLE training_plans
  DROP CONSTRAINT ck_training_plans_frequency;

ALTER TABLE training_plans
  ADD CONSTRAINT ck_training_plans_frequency
  CHECK (frequency_days BETWEEN 1 AND 7);
```

No ejecutar sin aprobación humana.

### Taxonomía del catálogo

El catálogo actual tiene campos parciales (`equipment_type`,
`movement_pattern`, `primary_muscle_group`, flags biomecánicos). Kalos requiere
taxonomía obligatoria más rica:

- `primary_muscle`;
- `secondary_muscles`;
- `movement_pattern`;
- `role`;
- `fatigue_cost`;
- `equipment` como lista;
- `joint_stress`;
- `substitution_group`.

Riesgo: si se fuerza `NOT NULL` antes de backfill, se rompe el catálogo actual.
Plan seguro: agregar columnas nullable, auditar cobertura, backfill, validar
fixtures, y luego endurecer constraints.

### Persistencia de JSON vs normalización

Kalos produce un objeto rico. Persistir sólo filas normalizadas puede perder:

- `quality_checks`;
- advertencias;
- `input_summary`;
- justificaciones;
- sustituciones;
- razones de bloqueo.

Propuesta: mantener normalización para ejecución y agregar snapshot JSONB
versionado en `training_plans` o tabla `training_plan_snapshots` si se necesita
reproducibilidad exacta.

### Contratos de experiencia

La spec usa `beginner`; el schema histórico de dataset usa `novice` en
`routine_contract.schema.json`. Backend Kalos debe elegir `beginner` como valor
oficial y mapear datasets legacy en adaptadores, no en el contrato público.

### Seguridad médica

Las restricciones no pueden ser sólo texto libre si bloquean ejercicios. Deben
normalizarse al menos por articulación/zona y severidad. Texto libre queda como
nota auxiliar, no como única fuente de bloqueo.

## Plan de Implementación Por Fases

### Fase 0 - Contrato y fixtures

- Crear `backend/app/schemas/kalos_training.py`.
- Crear fixtures JSON para:
  - beginner 1 día;
  - beginner 6 días con warning;
  - intermediate glutes 4 días;
  - advanced torso 6 días;
  - caso con equipo limitado;
  - caso con lesión/restricción.
- Añadir tests de validación Pydantic sin tocar persistencia.

### Fase 1 - Validadores puros

- Crear `KalosTrainingValidator`.
- Implementar validadores estructural, volumen, frecuencia, fatiga, duplicados,
  equipo, restricciones, tiempo, RIR y descanso.
- Tests unitarios por validador.
- Ninguna llamada a FastAPI, DB o IA en esta fase.

### Fase 2 - Adaptador de catálogo

- Crear un adaptador que lea ejercicios existentes y produzca
  `KalosExerciseCatalogItem`.
- Auditar cobertura de taxonomía.
- Proponer migración de catálogo sólo después del audit.

### Fase 3 - Motor determinista mínimo

- Generar split por `days_per_week`, `priority` y `experience`.
- Asignar volumen semanal por objetivo/prioridad.
- Poblar sesiones con catálogo mock o fixture.
- Ejecutar validadores antes de responder.

### Fase 4 - API preview

- Agregar `POST /training/kalos/preview`.
- Autenticación JWT obligatoria.
- Sin persistencia.
- Respuesta validada por `KalosTrainingPlanResponse`.

### Fase 5 - Persistencia

- Proponer y aprobar migraciones.
- Cambiar `frequency_days` a 1-7.
- Agregar columnas o snapshot JSONB versionado.
- Implementar transacción para persistir plan, sesiones, ejercicios y caps.

### Fase 6 - Sustituciones e IA controlada

- Permitir que IA sugiera sustituciones sólo dentro de grupos permitidos.
- Revalidar todo plan modificado por IA.
- Bloquear salida si cualquier quality check crítico falla.

## Criterios de Aceptación del Diseño

- El contrato propuesto soporta `days_per_week` 1-7.
- `goal`, `priority`, `experience`, `time_budget_minutes`,
  `available_equipment`, `constraints` y `quality_checks` están modelados.
- Sesiones y ejercicios incluyen taxonomía obligatoria.
- Los validadores mínimos están definidos y separados de FastAPI.
- Endpoints futuros están propuestos sin implementación productiva.
- Cambios de DB quedan como propuesta documental, no ejecutada.
- No se toca frontend.

