# Mobile AI Integration Plan

Fecha: 2026-06-10

## Objetivo

Definir si la app movil Android debe usar IA directamente o solo consumir
backend. Este documento audita la integracion IA actual y propone una estrategia
segura para mobile sin modificar codigo.

Decision principal: la app movil no debe llamar proveedores IA directamente.
Android debe consumir endpoints backend propios. Ninguna API key privada debe
vivir en la app movil.

## Dictamen Ejecutivo

La app movil debe usar IA solo a traves del backend.

Motivos:

- Las API keys de Gemini y cualquier proveedor IA son secretos privados.
- Un APK/AAB puede ser inspeccionado, decompilado o instrumentado.
- El cliente movil no puede proteger prompts, system prompts, rate limits,
  validadores ni ownership de datos.
- Los datos de salud, biometria, nutricion y entrenamiento requieren
  minimizacion antes de llegar a un LLM.
- El backend ya tiene un servicio Gemini con timeout, retries y validacion
  Pydantic para NLP.
- Kalos define que la IA no puede saltarse motor determinista, quality checks ni
  validadores backend.

Permitido en mobile:

- Consumir respuestas IA ya filtradas por backend.
- Mostrar explicaciones, coaching notes, resumenes y warnings aprobados.
- Enviar texto libre al backend si el usuario activa una funcion asistida.
- Usar Supabase anon key para Auth si se aprueba la arquitectura mobile.

Prohibido en mobile:

- Guardar `GEMINI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, OpenAI keys o cualquier secret privado.
- Llamar `generativelanguage.googleapis.com` desde Android.
- Construir prompts de sistema productivos en la app.
- Parsear respuestas LLM como fuente de verdad sin backend.
- Persistir decisiones IA sin validacion backend.

## Auditoria De Integracion Actual

### Chat actual

Archivo revisado:

- `frontend/src/app/api/chat/route.ts`
- `frontend/src/components/chat/chat-widget.tsx`

Estado:

- El chat web llama `fetch('/api/chat')` desde el componente cliente.
- La ruta `frontend/src/app/api/chat/route.ts` vive server-side en Next.js.
- Esa ruta usa `process.env.GOOGLE_GENERATIVE_AI_API_KEY`.
- La ruta llama Gemini `gemini-2.5-flash:generateContent`.
- El system prompt actual es general: copiloto de Kalos, mapa de la app,
  formato y tono.
- El fallback frontend muestra mensajes simples si falla la conexion.

Riesgos observados:

- La key no esta en el componente cliente, pero la ruta Next no es backend
  FastAPI ni comparte validadores Pydantic.
- El chat actual no aplica contrato estructurado ni validadores de dominio.
- El prompt permite orientar usuario en entrenamiento/nutricion, pero no se ve
  una capa de rechazo medico robusta.
- La respuesta markdown se muestra directamente con `ReactMarkdown`.
- Para mobile, llamar la ruta Next seria un acoplamiento web innecesario.

Decision mobile:

- No portar `/api/chat` de Next a Android.
- Crear en backend un endpoint futuro tipo `POST /ai/chat` o
  `POST /mobile/ai/chat`.
- Ese endpoint debe autenticar bearer, aplicar politicas de seguridad, llamar
  Gemini server-side y devolver una respuesta sanitizada.

### Generacion o explicacion de rutinas

Archivos revisados:

- `frontend/src/lib/actions/generate-routine.ts`
- `frontend/src/lib/engine/routine-generator.ts`
- `docs/training-data/kalos_training_ai_integration.md`
- `docs/training-data/kalos_training_engine_spec.md`
- `docs/training-data/kalos_training_backend_contract.md`

Estado:

- `generateAIWorkout` es una server action simulada. No llama IA real.
- `AITrainingEngine` en frontend genera rutinas de forma determinista/local,
  aunque el nombre contiene `AI`.
- Kalos backend ya define el principio correcto: motor determinista primero,
  IA solo para explicacion, coaching notes, microcopy y sustituciones
  candidatas.
- `POST /training/kalos/preview` y `POST /training/kalos/substitute` estan
  documentados como endpoints listos para mobile en
  `backend_mobile_readiness.md`.

Riesgos observados:

- El generador frontend actual contiene logica de split y rutina que no debe
  duplicarse en mobile.
- El nombre `AITrainingEngine` puede confundir: no es una integracion IA segura,
  es logica local.
- Rutinas generadas o explicadas por IA deben pasar por contrato
  `kalos_training_plan.v1` y validadores.

Decision mobile:

- Android debe consumir `POST /training/kalos/preview` para preview.
- Android debe consumir `POST /training/kalos/substitute` para cambios de
  ejercicio.
- Si se agregan explicaciones IA, deben venir de backend como capa aparte:
  `POST /training/kalos/explain` o campo enriquecido validado.
- Mobile nunca decide split, volumen, frecuencia, fatiga, RIR, quality checks ni
  persistencia.

### Nutricion asistida por IA

Archivos revisados:

- `backend/app/services/ai_integration.py`
- `backend/app/schemas/ai.py`
- `docs/api.md`

Estado:

- Backend incluye `GeminiNLPService`.
- Usa `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_API_BASE_URL`,
  `GEMINI_TIMEOUT_SECONDS` y `GEMINI_MAX_RETRIES`.
- El servicio extrae comidas y entrenamientos desde texto libre.
- Pide JSON con `responseMimeType: application/json` y `responseSchema`.
- Revalida con Pydantic `HealthNLPExtraction`.
- Maneja errores controlados: configuracion, timeout, contrato proveedor y
  salida estructurada invalida.
- El timeout esta limitado a 8 segundos.
- No se observa endpoint publico para este servicio en la auditoria actual.

Riesgos observados:

- Si mobile llamara Gemini directo, expondria la key y perderia validacion
  Pydantic server-side.
- Texto libre de comidas puede contener informacion sensible de salud, peso,
  dieta, restricciones o sintomas.
- Macros interpretados por LLM pueden alucinar si no se exige evidencia.

Decision mobile:

- Cualquier captura de comida por lenguaje natural debe pasar por backend.
- Backend debe devolver sugerencias estructuradas, no insertar automaticamente
  sin confirmacion del usuario.
- Mobile debe mostrar "revisar antes de guardar" para comidas parseadas por IA.
- Mobile no debe enviar biometria completa para parsear una comida; solo texto
  del usuario, locale y contexto minimo si es estrictamente necesario.

### Uso actual de Gemini

Uso server-side actual:

- Frontend Next route:
  - Env: `GOOGLE_GENERATIVE_AI_API_KEY`.
  - Modelo: `gemini-2.5-flash`.
  - Proposito: chat/copiloto web.
- Backend FastAPI service:
  - Env: `GEMINI_API_KEY`.
  - Modelo default: `gemini-2.0-flash`.
  - Proposito: NLP estructurado de entrenamientos/comidas.

No se debe crear un tercer canal Gemini desde mobile.

Recomendacion:

- Consolidar IA en backend FastAPI a mediano plazo.
- Dejar Next `/api/chat` como compatibilidad web o migrarlo a FastAPI.
- Mantener prompts productivos versionados fuera del cliente.

## Riesgo De Exponer API Keys En Cliente Movil

Riesgo alto:

- Cualquier valor embebido en Android puede extraerse del APK/AAB.
- `EXPO_PUBLIC_*` es publico por definicion.
- Ofuscar codigo no protege una API key.
- Un atacante podria usar la key para consumo externo, prompts no autorizados,
  scraping, abuso de cuota o acceso a contexto sensible.

Regla obligatoria:

- Ninguna API key privada debe vivir en la app movil.

Variables prohibidas en mobile:

- `GEMINI_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- cualquier token de servicio, secret backend o signing secret

Variables aceptables en mobile:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_APP_ENV`

La anon key de Supabase es publica por diseno, pero no reemplaza validadores
backend ni ownership server-side.

## Llamadas Que Deben Pasar Siempre Por Backend

Siempre backend:

- Chat IA o copiloto.
- Explicacion de rutinas.
- Coaching notes generadas por IA.
- Sustituciones sugeridas por IA.
- Nutricion asistida por IA o parseo de texto libre.
- Extraccion NLP de entrenamientos o comidas.
- Generacion de planes Kalos.
- Validacion de `quality_checks`.
- Persistencia de planes, comidas, medidas y entrenamientos.
- Cualquier llamada que use service role, Gemini key o datos sensibles.
- Cualquier operacion que acepte o derive `user_id`.

Puede vivir en mobile:

- Renderizar texto aprobado.
- Estados loading/error/empty.
- Formularios y seleccion de preferencias.
- Validaciones UX no autoritativas.
- Cache local no sensible.
- Auth con Supabase anon key y secure storage.

No debe vivir solo en mobile:

- Reglas finales de seguridad.
- Validacion de ownership.
- Validacion antropometrica autoritativa.
- Calculo final de targets o planes.
- Prompt system productivo.
- Transformacion LLM a datos persistibles.

## Prompts Y Respuestas Que Pueden Mostrarse En Movil

### Permitido mostrar

- Resumen de plan aprobado.
- Explicacion breve de por que se eligio una estructura.
- Coaching notes por sesion/ejercicio aprobadas por backend.
- Warnings traducidos a lenguaje de usuario.
- Sustituciones aprobadas por backend.
- Mensajes de rechazo seguro.
- Microcopy motivacional no medico.

### No mostrar

- System prompts.
- Prompt completo enviado al modelo.
- Respuesta raw del LLM.
- IDs internos de tracing.
- API errors del proveedor.
- Scores internos o chains de razonamiento.
- Medidas corporales exactas dentro de explicaciones si bastan etiquetas.
- Diagnosticos, inferencias medicas o lenguaje corporal negativo.

### Formato recomendado para mobile

Backend deberia devolver:

```json
{
  "status": "ok",
  "source": "backend_ai",
  "contract_version": "mobile_ai_response.v1",
  "message": "Texto listo para mostrar.",
  "warnings": [],
  "actions": []
}
```

Para rutinas:

```json
{
  "contract_version": "kalos_training_ai_response.v1",
  "status": "ok",
  "user_summary": {
    "title": "Resumen de tu plan",
    "body": "Texto aprobado para UI."
  },
  "session_coaching_notes": [],
  "warnings_for_user": [],
  "backend_validation_required": false
}
```

Mobile debe tratar cualquier respuesta sin contrato como error controlado.

## Manejo De Errores Cuando IA No Este Disponible

La app movil no debe quedar bloqueada si IA falla.

Estados esperados:

- `ai_unavailable`: proveedor caido, timeout o feature flag apagado.
- `ai_timeout`: excedio el presupuesto server-side.
- `ai_invalid_response`: backend no pudo validar JSON.
- `ai_safety_rejected`: el contenido requiere rechazo medico/seguridad.
- `profile_required`: falta perfil minimo para personalizar.
- `rate_limited`: cuota o abuso.

UX recomendada:

- Chat: mostrar "No pude responder ahora. Intenta de nuevo en unos minutos."
- Rutinas: mostrar el plan determinista sin explicacion IA, si
  `quality_checks.status` permite mostrarlo.
- Nutricion: permitir registro manual si NLP no esta disponible.
- Sustituciones: mostrar "No encontramos una alternativa segura ahora" y no
  cambiar el ejercicio.
- Red flags medicas: mostrar derivacion segura, no fallback motivacional.

Regla:

- La falla de IA no debe degradar validaciones backend.
- La falla de IA nunca debe permitir persistir una rutina o comida no validada.

## Limites De Datos Biometricos Sensibles

Principio: enviar a IA el minimo contexto necesario.

No enviar a IA salvo aprobacion explicita y necesidad funcional:

- nombre real;
- email;
- telefono;
- user id;
- fecha de nacimiento exacta;
- medidas corporales exactas;
- historial completo de medidas;
- fotos;
- notas medicas libres;
- diagnosticos;
- token JWT;
- ubicacion;
- datos de pago.

Preferir:

- `experience`: beginner/intermediate/advanced.
- `goal`: hypertrophy/recomposition/fat_loss/etc.
- `priority`: balanced/torso/glutes/legs.
- `days_per_week`.
- `time_budget_minutes`.
- `equipment_scope`.
- `constraints_summary` por zona y severidad, no historia clinica completa.
- buckets antropometricos si el backend ya los calculo.
- flags como `profile_missing`, `has_pain_or_injury`, `limited_equipment`.

Para nutricion asistida:

- Enviar texto de comida y locale.
- No enviar peso, cintura, cadera, objetivos esteticos o targets completos para
  parsear alimentos.
- Si se necesita contexto de unidades, enviar preferencia de locale/unidad.

Para entrenamiento:

- Enviar solo plan validado o resumen seguro del plan.
- No enviar historial biometrico completo para generar microcopy.
- No permitir que IA vea datos que no necesita para explicar el plan.

## Estrategia Android Recomendada

### Fase 1 - Sin IA directa

- Mobile consume endpoints existentes de nutricion y Kalos.
- Chat IA no se porta todavia o se muestra como feature desactivada.
- No hay Gemini SDK ni Google Generative AI package en `mobile/`.
- No hay env de Gemini en `mobile/.env.example`.

### Fase 2 - AI gateway backend

Crear endpoints backend, no mobile directo:

- `POST /ai/chat`
- `POST /ai/nutrition/parse`
- `POST /training/kalos/explain`

Requisitos:

- Bearer JWT obligatorio.
- Feature flags por entorno.
- Rate limiting por usuario.
- Sanitizacion y minimizacion de contexto.
- Timeouts server-side.
- Pydantic o contrato JSON para toda respuesta.
- Logs sin prompts completos ni respuestas completas.

### Fase 3 - Mobile UI IA

- Chat consume `POST /ai/chat`.
- Nutricion natural language consume `POST /ai/nutrition/parse`.
- Rutinas muestran explicacion de `POST /training/kalos/explain`.
- UI soporta `ai_unavailable`, `ai_safety_rejected` y `rate_limited`.

### Fase 4 - Consolidacion

- Migrar o envolver la ruta Next `/api/chat` hacia el mismo backend IA.
- Unificar prompts versionados.
- Agregar tests de contrato backend para mobile.
- Agregar auditoria de no secretos en builds Android.

## Checklist De Seguridad Para Android

Antes de habilitar IA en mobile:

- `mobile/.env.example` no contiene Gemini ni provider keys.
- APK/AAB no contiene `GEMINI`, `GOOGLE_GENERATIVE_AI_API_KEY`,
  `OPENAI_API_KEY` ni service role.
- Mobile no importa SDKs de proveedores IA.
- Todo request IA va a `EXPO_PUBLIC_API_URL`.
- Backend autentica con bearer.
- Backend deriva `current_user_id`; mobile no envia `user_id`.
- Backend valida output IA.
- Backend minimiza biometria antes del prompt.
- Logs no incluyen prompts, respuestas, JWTs, keys ni medidas exactas.
- Feature flag puede apagar IA sin romper app.

## Matriz De Decision Por Funcionalidad

| Funcionalidad | Mobile llama IA directo | Mobile llama backend | Motivo |
| --- | --- | --- | --- |
| Chat/copiloto | No | Si | Protege key, prompts y seguridad medica. |
| Explicacion de rutina | No | Si | Debe respetar Kalos y quality checks. |
| Generacion de rutina | No | Si | Motor determinista y validadores viven backend. |
| Sustitucion de ejercicio | No | Si | Requiere catalogo, restricciones y validacion. |
| Parseo de comida por texto | No | Si | Requiere Pydantic y control de alucinaciones. |
| Registro manual de comida | No aplica | Si | Mutacion protegida y ownership. |
| Auth | No IA | Supabase Auth + backend | Anon key permitida, service role prohibida. |
| Microcopy estatico | No IA | Puede ser local | Si no usa datos sensibles ni proveedor. |

## Criterios De Aceptacion

- El documento deja explicito que ninguna API key privada debe vivir en la app
  movil.
- La estrategia decide backend-only para IA.
- Chat, rutinas, nutricion asistida y Gemini actual quedan auditados.
- Se define que llamadas IA y persistencia deben pasar siempre por backend.
- Se define que prompts/respuestas raw no se muestran en mobile.
- Se define manejo de errores cuando IA no esta disponible.
- Se definen limites para datos biometricos sensibles.
- No se modifica codigo.
