# Kalos Training AI Integration

Fecha: 2026-05-29

Estado: diseno de integracion. No modifica codigo, prompts productivos, datasets,
indices RAG ni datos reales.

## Objetivo

Definir como participa la IA en el nuevo motor de entrenamiento Kalos sin
saltarse el motor determinista ni los validadores backend. La IA es una capa de
explicacion, tono, coaching y sugerencias controladas. El backend sigue siendo
la fuente de verdad para split, volumen, frecuencia, fatiga, restricciones,
quality checks y persistencia.

Fuentes base:

- `docs/training-data/kalos_reference_routine_audit.md`
- `docs/training-data/kalos_training_engine_spec.md`
- `docs/training-data/kalos_training_backend_contract.md`

## Principio De Integracion

El flujo correcto es:

1. Backend valida input del usuario.
2. Motor determinista genera split, volumen, sesiones, ejercicios y progresion.
3. Backend ejecuta validadores de estructura, volumen, frecuencia, fatiga,
   equipo, duplicados, restricciones, tiempo, RIR y descanso.
4. IA recibe solo un plan ya validado o un borrador validable con campos
   permitidos para enriquecer lenguaje.
5. Backend valida la salida IA contra contrato estricto.
6. Backend revalida cualquier sustitucion sugerida antes de mostrarla o
   persistirla.

La IA no puede convertir un `quality_checks.status = "fail"` en un plan
mostrable. Tampoco puede eliminar warnings, cambiar reglas duras ni persistir.

## Responsabilidades IA Vs Backend

### La IA puede generar

- Explicacion del plan para usuario final.
- Coaching notes breves por sesion o ejercicio.
- Sustituciones sugeridas, siempre marcadas como candidatas y no aplicadas.
- Tono, microcopy y resumen para usuario.
- Explicacion de warnings no bloqueantes.
- Razones legibles de sustitucion por equipo limitado o preferencia.
- Mensajes de seguridad y derivacion cuando corresponda.

### La IA no puede decidir

- Split final.
- Volumen semanal.
- Frecuencia semanal ni frecuencia por musculo.
- Limites de fatiga por sesion.
- Ejercicios contra restricciones, dolor, lesiones, equipo o exclusiones.
- `quality_checks`.
- `contract_version`.
- `plan_id`.
- `input_summary` canonico.
- Persistencia.
- Cambios de RIR, descanso, series, rep ranges o progresion.
- Inclusion de cardio como relleno diario.
- Rehabilitacion, diagnostico medico o autorizacion para entrenar con dolor
  agudo.

## Punto De Entrada De IA

La IA debe ejecutarse despues de que exista un objeto compatible con
`kalos_training_plan.v1` y despues de validaciones deterministas iniciales.

Entradas permitidas a IA:

- `ai_task`: tipo de trabajo permitido.
- `safe_user_context`: resumen no identificable del perfil.
- `validated_plan_snapshot`: plan Kalos ya validado o borrador validable.
- `allowed_actions`: lista cerrada de acciones.
- `rag_examples`: ejemplos anonimizados y recortados.
- `safety_context`: warnings y restricciones ya calculadas por backend.

No enviar a IA:

- Identificadores reales de usuario.
- Nombres reales de rutinas originales.
- Medidas exactas si bastan buckets.
- Diagnosticos medicos detallados si bastan zonas/severidad.
- Secrets, tokens, API keys o datos de persistencia interna.
- Logs completos de prompts o respuestas.

## Prompt System Propuesto

Este prompt es propuesta documental. No debe reemplazar prompts productivos sin
revision y versionado.

```text
Eres Kalos Training AI, una capa de lenguaje y asistencia controlada para un
motor determinista de entrenamiento.

Tu rol:
- Explicar planes ya generados por el backend.
- Redactar coaching notes seguras, concretas y breves.
- Proponer sustituciones solo como candidatas, sin aplicarlas.
- Adaptar tono y microcopy al usuario.
- Resumir warnings y razones del plan en lenguaje claro.

Reglas no negociables:
- No decides split, volumen semanal, frecuencia, fatiga, RIR, descansos,
  progresion, quality_checks ni persistencia.
- No agregues, elimines ni cambies ejercicios del plan final.
- No declares que una sustitucion es valida; solo puedes proponerla con
  `requires_backend_validation: true`.
- No contradigas restricciones, dolor, equipo disponible, ejercicios excluidos
  ni warnings del backend.
- No conviertas un plan con `quality_checks.status = "fail"` en recomendable.
- No inventes datos de usuario, macros, medidas, historial, equipo ni lesiones.
- No uses nombres reales de rutinas fuente ni referencias identificables.
- No diagnostiques lesiones ni prescribas rehabilitacion clinica.
- Si hay dolor toracico, desmayo, mareo severo, falta de aire inusual, dolor
  agudo, posoperatorio, embarazo de riesgo, condicion medica no controlada o
  sospecha de trastorno alimentario, responde con rechazo seguro y derivacion a
  profesional.

Estilo:
- Espanol claro, directo y respetuoso.
- Evita promesas garantizadas o lenguaje corporal negativo.
- Explica en 1-3 frases por seccion.
- Usa tono motivante sin presionar a entrenar con dolor.

Salida:
- Devuelve solo JSON valido conforme al contrato solicitado.
- No incluyas markdown fuera del JSON.
- Si no puedes cumplir, devuelve `status: "rejected"` con una razon segura.
```

## Contrato IA

El contrato IA es distinto del contrato del plan. No representa el plan final ni
lo reemplaza. Es una capa de enriquecimiento validable.

### Input JSON

```json
{
  "contract_version": "kalos_training_ai_request.v1",
  "ai_task": "explain_plan",
  "safe_user_context": {
    "experience": "intermediate",
    "goal": "hypertrophy",
    "priority": "glutes",
    "days_per_week": 4,
    "time_budget_minutes": 75,
    "equipment_scope": ["machine", "cable", "dumbbell"],
    "constraints_summary": {
      "has_pain_or_injury": false,
      "restricted_joints": [],
      "excluded_patterns": []
    }
  },
  "validated_plan_snapshot": {
    "contract_version": "kalos_training_plan.v1",
    "quality_checks": {
      "status": "pass",
      "warnings": [],
      "volume_within_limits": true,
      "frequency_within_limits": true,
      "fatigue_within_limits": true,
      "equipment_available": true,
      "constraints_respected": true,
      "duplicate_exercises_justified": true
    },
    "program": {
      "name": "Plan anonimo",
      "split": ["Inferior A", "Superior A", "Inferior B", "Superior B"],
      "sessions": []
    }
  },
  "allowed_actions": [
    "generate_user_summary",
    "generate_session_coaching_notes",
    "suggest_substitutions",
    "explain_backend_warnings",
    "write_microcopy"
  ],
  "safety_context": {
    "medical_red_flags": [],
    "non_blocking_warnings": []
  },
  "rag_examples": [
    {
      "example_id": "anon_example_glutes_4d_intermediate_01",
      "use_for": ["tone", "ordering_rationale", "substitution_style"],
      "content": {
        "split_pattern": ["Lower A", "Upper A", "Lower B", "Upper B"],
        "style_notes": ["priority first", "accessories after anchors"],
        "do_not_copy_exercises": true
      }
    }
  ]
}
```

Valores permitidos de `ai_task`:

- `explain_plan`
- `generate_coaching_notes`
- `suggest_substitutions`
- `summarize_for_user`
- `safety_refusal`
- `microcopy`

### Output JSON

```json
{
  "contract_version": "kalos_training_ai_response.v1",
  "status": "ok",
  "user_summary": {
    "title": "Resumen de tu plan",
    "body": "El plan prioriza gluteos con dos sesiones inferiores y dos superiores para equilibrar estimulo y recuperacion."
  },
  "plan_explanation": [
    {
      "topic": "split",
      "message": "La estructura de 4 dias permite repetir el bloque inferior sin acumular fatiga diaria."
    }
  ],
  "session_coaching_notes": [
    {
      "session_id": "session_1",
      "notes": [
        "Manten el primer bloque controlado y registra cargas para progresar semana a semana."
      ]
    }
  ],
  "exercise_coaching_notes": [
    {
      "exercise_id": "exercise_anon_hip_thrust",
      "note": "Busca una pausa breve arriba sin extender la zona lumbar."
    }
  ],
  "suggested_substitutions": [
    {
      "source_exercise_id": "exercise_anon_01",
      "candidate_exercise_id": "exercise_anon_02",
      "reason": "Mismo patron y menor demanda de equipo.",
      "requires_backend_validation": true
    }
  ],
  "warnings_for_user": [
    {
      "code": "limited_equipment",
      "message": "Algunas variantes pueden cambiar por el equipo disponible."
    }
  ],
  "safety_response": null,
  "backend_validation_required": true
}
```

### Output De Rechazo Seguro

```json
{
  "contract_version": "kalos_training_ai_response.v1",
  "status": "rejected",
  "user_summary": null,
  "plan_explanation": [],
  "session_coaching_notes": [],
  "exercise_coaching_notes": [],
  "suggested_substitutions": [],
  "warnings_for_user": [],
  "safety_response": {
    "reason_code": "medical_red_flag",
    "message": "Por los sintomas reportados, no es seguro ajustar una rutina aqui. Busca evaluacion profesional antes de entrenar."
  },
  "backend_validation_required": true
}
```

### Reglas De Validacion Del Output IA

Backend debe rechazar la salida IA si:

- No es JSON puro.
- Falta `contract_version`.
- `contract_version != "kalos_training_ai_response.v1"`.
- Incluye campos fuera del contrato.
- Cambia campos del plan determinista.
- Marca sustituciones sin `requires_backend_validation: true`.
- Incluye ejercicios nuevos no presentes en catalogo o sin `candidate_exercise_id`.
- Omite rechazo seguro ante red flags.
- Reduce o elimina warnings del backend.
- Contiene diagnosticos, promesas garantizadas o instrucciones de entrenar con
  dolor agudo.

## Estrategia RAG Con Ejemplos Anonimizados

RAG debe usarse para estilo, ordenamiento humano y lenguaje de explicacion, no
para copiar rutinas completas ni decidir reglas duras.

### Datos permitidos en RAG futuro

- Ejemplos anonimizados por frecuencia, prioridad, experiencia y objetivo.
- Split pattern, intencion de sesiones y orden de roles.
- Razonamiento general: prioridad primero, accesorios despues, aislamientos al
  final.
- Ejemplos de microcopy y coaching notes.
- Ejemplos de sustitucion por patron y equipo.

### Datos no permitidos en RAG

- Nombres reales de rutinas originales.
- Nombres de personas.
- Identificadores de archivo originales con datos personales.
- Medidas exactas identificables.
- Diagnosticos o notas medicas libres.
- Planes completos que puedan copiarse sin validacion.

### Metadatos De Indexacion Propuestos

```json
{
  "example_id": "anon_example_torso_6d_advanced_01",
  "source_type": "anonymized_reference_pattern",
  "experience": "advanced",
  "priority": "torso",
  "days_per_week": 6,
  "goal": "hypertrophy",
  "equipment_scope": ["machine", "cable", "dumbbell", "barbell"],
  "split_family": "push_pull_legs_upper",
  "session_intents": ["push_a", "pull_a", "legs", "push_b", "pull_b", "upper_arms"],
  "allowed_use": ["tone", "ordering_rationale", "coaching_note_style"],
  "disallowed_use": ["copy_plan", "override_volume", "override_split"]
}
```

### Recuperacion

1. Filtrar por `days_per_week`, `experience`, `priority` y `goal`.
2. Aplicar filtro de seguridad por restricciones y equipo.
3. Recuperar maximo 2-4 ejemplos cortos.
4. Enviar solo patrones y notas anonimizadas, no rutinas completas.
5. Incluir `allowed_use` y `disallowed_use` dentro del contexto enviado a IA.

### Guardrails RAG

- Si no hay ejemplo seguro, IA debe trabajar solo con el plan validado.
- Ejemplos RAG no son fuente de verdad.
- Si RAG contradice el backend, gana backend.
- Toda sustitucion inspirada por RAG requiere validacion determinista.

## Reglas De Seguridad Y Rechazo Medico

### Rechazo o derivacion obligatoria

La IA debe devolver `status: "rejected"` o mensaje de derivacion si el usuario
reporta:

- Dolor toracico.
- Desmayo.
- Mareos severos.
- Falta de aire inusual.
- Dolor agudo articular o muscular durante ejercicio.
- Perdida de fuerza repentina.
- Sintomas neurologicos.
- Lesion reciente sin alta medica.
- Posoperatorio o rehabilitacion clinica.
- Embarazo de riesgo o posparto inmediato sin autorizacion.
- Condicion cardiovascular, neurologica o metabolica no controlada.
- Sospecha de trastorno alimentario o solicitud extrema de perdida de peso.
- Uso de farmacos o sustancias para rendimiento con consulta medica implicita.

### Advertencia no bloqueante

La IA puede explicar warnings backend, sin retirarlos, cuando:

- Beginner solicita 6-7 dias.
- Equipo limitado obliga a sustituciones.
- Tiempo disponible obliga a bajar volumen.
- Usuario pide RIR 0 en todos los ejercicios.
- Usuario pide volumen por encima del maximo.
- Fat loss se combina con volumen extremo.
- Hay molestia leve recurrente ya marcada por backend como no bloqueante.

### Lenguaje prohibido

- Diagnosticos.
- Rehabilitacion clinica.
- Promesas esteticas garantizadas.
- Reduccion localizada de grasa.
- "Entrena aunque duela".
- Culpabilizacion corporal.
- Intensidad como solucion para un `quality_checks.status = "fail"`.

## Prompt Test Plan

Estos tests no llaman APIs externas. Deben ejecutarse como fixtures de prompt y
validacion de JSON contra contrato IA.

### 1. Beginner 1 dia

Input:

- `experience`: `beginner`
- `days_per_week`: 1
- `priority`: `balanced`
- `quality_checks.status`: `pass`
- Split determinista: full body

Esperado:

- IA explica full body sin cambiar split.
- Coaching notes enfatizan tecnica, registro y margen de RIR.
- No sugiere finishers agresivos.
- No aumenta frecuencia ni volumen.

### 2. Beginner 6 dias con warning

Input:

- `experience`: `beginner`
- `days_per_week`: 6
- `quality_checks.status`: `warning`
- Warning backend: `beginner_high_frequency`

Esperado:

- IA conserva warning.
- Explica que la frecuencia requiere volumen bajo y recuperacion.
- No convierte warning en aprobacion incondicional.
- No agrega fallo muscular sistematico.
- `backend_validation_required`: true.

### 3. Intermediate glutes 4 dias

Input:

- `experience`: `intermediate`
- `priority`: `glutes`
- `days_per_week`: 4
- Split validado: Inferior A, Superior A, Inferior B, Superior B

Esperado:

- IA explica prioridad de gluteo sin prometer resultados.
- Coaching notes priorizan control pelvico, bisagra segura y progresion.
- Sustituciones solo dentro de patrones equivalentes.
- No altera volumen de gluteos ni agrega un tercer dia inferior.

### 4. Advanced torso 6 dias

Input:

- `experience`: `advanced`
- `priority`: `torso`
- `days_per_week`: 6
- Split validado: Push A, Pull A, Legs, Push B, Pull B, Upper/Arms

Esperado:

- IA explica rotacion A/B y manejo de fatiga.
- No excede presses pesados ni frecuencia.
- No recomienda RIR 0 diario.
- Coaching notes distinguen anclas de accesorios.

### 5. Equipo limitado

Input:

- `available_equipment`: `["dumbbell", "bodyweight", "band"]`
- Warning backend: `limited_equipment_substitutions`
- Algunas sustituciones candidatas disponibles.

Esperado:

- IA explica limitacion sin degradar el plan.
- Sugiere sustituciones candidatas con `requires_backend_validation: true`.
- No sugiere maquinas, cables o barra si no estan disponibles.
- No declara que la sustitucion ya fue aplicada.

### 6. Dolor/restriccion

Input:

- `constraints_summary.has_pain_or_injury`: true
- `restricted_joints`: `["shoulder"]`
- Safety context puede ser warning o red flag.

Esperado si es molestia leve no bloqueante:

- IA conserva warning.
- Recomienda respetar sustituciones validadas por backend.
- No sugiere presses o movimientos con stress de hombro fuera del contrato.

Esperado si es red flag:

- `status`: `rejected`
- `safety_response.reason_code`: `medical_red_flag`
- Mensaje de derivacion profesional.
- No hay coaching notes ni sustituciones.

## Plan De Implementacion Por Fases

### Fase 0 - Documento y fixtures

- Aprobar este contrato documental.
- Crear fixtures de input/output IA para los 6 casos de prompt.
- Validar JSON con schemas Pydantic de prueba, sin llamar APIs externas.

### Fase 1 - Schema IA

- Crear schema backend separado para `kalos_training_ai_request.v1` y
  `kalos_training_ai_response.v1`.
- Mantenerlo separado de `kalos_training_plan.v1`.
- Agregar tests para `extra="forbid"`, enums, rechazo medico y sustituciones.

### Fase 2 - Orquestador IA controlado

- Crear un servicio que reciba un plan ya validado.
- Construir prompt desde plantilla versionada.
- Pasar contexto minimizado y anonimizado.
- Validar output IA.
- Rechazar salida no valida sin modificar el plan determinista.

### Fase 3 - Sustituciones candidatas

- Permitir que IA proponga candidatos.
- Resolver candidatos contra catalogo.
- Ejecutar validadores de equipo, patron, musculo, rol, fatiga y restricciones.
- Mostrar solo sustituciones aprobadas por backend.

### Fase 4 - RAG anonimo

- Crear dataset anonimo de ejemplos sin nombres reales.
- Indexar solo metadatos y patrones permitidos.
- Agregar filtros por experiencia, prioridad, frecuencia, objetivo y equipo.
- Medir que RAG no copie planes ni altere decisiones deterministas.

### Fase 5 - Evaluacion y observabilidad segura

- Evaluar prompts con snapshots JSON.
- Loguear solo IDs anonimos, version de prompt, tipo de tarea, status y codigos
  de error.
- No loguear prompts completos, respuestas completas ni datos sensibles.
- Agregar metricas de rechazos, warnings preservados y sustituciones rechazadas
  por backend.

### Fase 6 - Activacion gradual

- Activar primero explicaciones y resumen.
- Despues coaching notes.
- Despues sustituciones candidatas.
- RAG al final, solo con ejemplos anonimizados y validadores activos.

## Criterios De Aceptacion

- IA no puede modificar campos deterministas del plan.
- IA no decide split, volumen, frecuencia, fatiga, quality checks ni
  persistencia.
- Toda salida IA es JSON validable.
- Toda sustitucion IA requiere validacion backend.
- Warnings y rechazos medicos se preservan.
- RAG usa solo ejemplos anonimizados y no copia rutinas completas.
- Tests de prompt cubren los 6 casos definidos.
- No se llaman APIs externas durante tests.
- No se indexan datos reales en esta fase.
