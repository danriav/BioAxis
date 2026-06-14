# Backend Mobile Readiness - Kalos

Fecha: 2026-06-10

## Resumen ejecutivo

El backend actual puede servir una app movil real solo de forma parcial. Los
flujos de nutricion basicos y el preview/sustitucion Kalos ya tienen endpoints
FastAPI autenticados con JWT Supabase, contratos Pydantic y proteccion contra
`user_id` enviado por el cliente. Sin embargo, perfil/biometria, dashboard,
historial de medidas, listado de ejercicios, logging de entrenamiento y borrado
o lectura diaria de nutricion siguen dependiendo de Supabase directo desde
`frontend/src` o de estado local del navegador.

Dictamen: listo para un MVP movil de preview Kalos + busqueda/agregado basico de
nutricion. No listo para una app movil completa sin exponer endpoints backend
adicionales.

## Endpoints backend actuales

| Area | Endpoint | Estado movil | Observaciones |
| --- | --- | --- | --- |
| Salud | `GET /api/v1/health`, `GET /api/v1/ready` | Listo parcial | Estan definidos en router versionado, pero `main.py` no incluye el router versionado actualmente. |
| Nutricion | `GET /nutrition/search?query=` | Listo | Requiere `Authorization: Bearer <Supabase JWT>`. No usa `user_id` del cliente. |
| Nutricion | `GET /nutrition/logs?date=YYYY-MM-DD` | Listo | Lee registros del dia del usuario autenticado con macros y totales resueltos. |
| Nutricion | `POST /nutrition/add-log` | Listo | Inserta en `nutrition_logs` con `current_user_id`. |
| Nutricion | `PATCH /nutrition/logs/{log_id}` | Listo | Edita solo `meal_slot`, `quantity_g` y fecha del log propio; cross-user devuelve `404`. |
| Nutricion | `DELETE /nutrition/logs/{log_id}` | Listo | Borra solo logs del usuario autenticado; cross-user devuelve `404`. |
| Nutricion | `POST /nutrition/sync-day` | Listo | Copia logs del usuario autenticado. Devuelve `404` controlado si no hay comidas origen. |
| Nutricion | `GET /nutrition/targets/me` | Listo | Contrato movil preferido; deriva identidad solo del JWT y rechaza `user_id` enviado por cliente. |
| Nutricion | `GET /nutrition/targets/{user_id}` | Legacy web | Rechaza usuario ajeno con `403`; conservar mientras el web lo use. |
| Entrenamiento | `POST /training/kalos/preview` | Listo | Autenticado, sin persistencia, usa biometria real de `dim_atleta` si existe. |
| Entrenamiento | `POST /training/kalos/substitute` | Listo | Autenticado, no persiste, no llama IA. |
| Auth | Ninguno propio | Depende de Supabase | La app movil debe usar Supabase Auth directamente para login/refresh/logout. |
| Perfil/biometria | Ninguno | Falta | El web escribe/lee `dim_atleta` directo desde Supabase. |
| Dashboard | Ninguno | Falta | El web arma el dashboard con queries directas a Supabase y logica local. |
| Catalogo ejercicios | Ninguno | Falta | El web lee `exercises` directo desde Supabase. |
| Workout logging | Ninguno | Falta | El web escribe `fact_entrenamientos` directo desde Supabase. |

## Autenticacion esperada para movil

La ruta actual valida el JWT con `supabase.auth.get_user(token)` en
`get_current_user_id`. Para React Native:

- Usar `@supabase/supabase-js` con `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
- Guardar sesion/access token en storage seguro, por ejemplo Expo SecureStore o
  equivalente nativo.
- Enviar `Authorization: Bearer <access_token>` a FastAPI.
- Refrescar el token con Supabase Auth antes de llamar al backend si esta cerca
  de expirar.
- Nunca incluir `SUPABASE_SERVICE_ROLE_KEY` en la app movil.
- Nunca enviar `user_id` en bodies de nutricion o Kalos; los schemas actuales
  usan `extra="forbid"` y deben responder `422`.

No hay endpoints backend `/auth/login`, `/auth/logout` o `/auth/refresh`. Esto
es aceptable si la decision de producto es usar Supabase Auth directo en movil.
Si se requiere una fachada backend de auth, falta exponerla.

## CORS y clientes moviles

React Native nativo no depende de CORS para llamadas HTTP normales. CORS si
afecta Expo Web, navegadores, WebViews y pruebas locales desde web.

Configuracion actual:

- Permitidos: `localhost`/`127.0.0.1` en puertos `3000`, `4173`, `5173`.
- No hay CORS universal, lo cual es correcto para produccion.
- Falta parametrizar origenes por entorno si se usaran dominios web de staging,
  production o Expo Web.

Recomendacion:

- Mantener allowlist explicita.
- Agregar `BACKEND_CORS_ORIGINS` o configuracion equivalente para staging/prod.
- No abrir `allow_origins=["*"]` con credenciales.

## Respuestas de error actuales

| Caso | Respuesta actual | Estado para movil |
| --- | --- | --- |
| Sin token | `401`, detail `Missing bearer token` | Listo. |
| Token invalido/expirado | `401`, detail `Invalid bearer token` | Listo tecnico; conviene estandarizar codigo JSON `session_expired` para UX movil. |
| Usuario ajeno en `/nutrition/targets/{user_id}` | `403` | Listo. |
| `user_id` en query/body de `/nutrition/targets/me` | `422` | Listo. |
| `user_id` en query/body de `/nutrition/logs` | `422` | Listo. |
| PATCH/DELETE de log ajeno o inexistente | `404` | Listo; no filtra existencia cross-user. |
| `user_id` extra en body nutricion/Kalos | `422` | Listo. |
| Perfil/biometria inexistente en targets | `200` con macros fallback | Riesgo de producto: movil no sabe si debe pedir perfil. |
| Perfil/biometria inexistente en Kalos preview | `200` con `biometric_focus="unknown"` | Aceptable para preview, pero falta senal explicita `profile_missing`. |
| Plan Kalos no seguro/catalogo insuficiente | `422` con `detail.code` | Listo. |
| Sync nutrition sin comidas origen | `404` controlado | Listo. |

Para movil conviene normalizar errores como:

```json
{
  "code": "session_expired",
  "message": "Tu sesion expiro. Inicia sesion otra vez."
}
```

## Contratos JSON listos para React Native

### Nutricion

`GET /nutrition/search?query=avena`

Respuesta: `FoodSearchItem[]` con `id`, `name_es`, macros por gramo,
`variant`, `default_portion_grams`, `potassium_mg_per_g`,
`vitamin_c_mg_per_g`.

`POST /nutrition/add-log`

```json
{
  "food_id": "uuid",
  "meal_slot": "breakfast",
  "quantity_g": 100,
  "target_date": "2026-06-10"
}
```

`POST /nutrition/sync-day`

```json
{
  "source_date": "2026-06-09",
  "target_date": "2026-06-10"
}
```

`GET /nutrition/logs?date=2026-06-10`

```json
{
  "date": "2026-06-10",
  "items": [
    {
      "id": "log-uuid",
      "food_id": "food-uuid",
      "food_name": "Avena",
      "meal_slot": "desayuno",
      "quantity_g": 100,
      "consumed_at": "2026-06-10",
      "kcal": 389,
      "protein": 16.9,
      "carbs": 66.3,
      "fat": 6.9
    }
  ],
  "totals": {
    "kcal": 389,
    "protein": 16.9,
    "carbs": 66.3,
    "fat": 6.9
  },
  "meals": {
    "desayuno": [],
    "comida": [],
    "cena": [],
    "snacks": []
  }
}
```

Si no hay registros, devuelve `200` con `items: []` y totales en `0`.

`PATCH /nutrition/logs/{log_id}`

```json
{
  "meal_slot": "cena",
  "quantity_g": 125,
  "target_date": "2026-06-12"
}
```

Respuesta:

```json
{
  "id": "log-uuid",
  "food_id": "food-uuid",
  "meal_slot": "cena",
  "quantity_g": 125,
  "consumed_at": "2026-06-12"
}
```

`DELETE /nutrition/logs/{log_id}`

```json
{
  "status": "success",
  "deleted_id": "log-uuid"
}
```

`GET /nutrition/targets/me`

```json
{
  "kcal": 2100,
  "protein": 160,
  "carbs": 220,
  "fat": 70
}
```

`GET /nutrition/targets/{user_id}` queda disponible solo como endpoint legacy
para web y debe recibir un `user_id` igual al usuario autenticado.

### Kalos training

`POST /training/kalos/preview`

Request sin `user_id`:

```json
{
  "days_per_week": 4,
  "goal": "hypertrophy",
  "priority": "balanced",
  "experience": "intermediate",
  "time_budget_minutes": 75,
  "available_equipment": ["barbell", "dumbbell", "machine", "cable", "bench"],
  "constraints": {
    "injuries": [],
    "pain_areas": [],
    "excluded_exercise_ids": [],
    "excluded_movement_patterns": [],
    "notes": null
  }
}
```

Respuesta incluye:

- `contract_version`
- `input_summary.biometric_focus`
- `program.split`
- `program.weekly_volume_targets`
- `program.sessions[].exercises[]`
- `quality_checks`

`POST /training/kalos/substitute`

Request sin `user_id`, con `current_exercise_id`, `current_session`,
`excluded_exercise_ids`, `available_equipment`, `constraints` y metadata del
ejercicio actual.

Respuesta incluye `substitute_exercise`, `equivalence`, `equivalence_score` y
`warnings`.

## Dependencias actuales del frontend web

### Ya usa FastAPI

- `frontend/src/lib/nutrition-service.ts`
  - `/nutrition/search`
  - `/nutrition/add-log`
  - `/nutrition/sync-day`
  - Debe agregar `/nutrition/logs?date=YYYY-MM-DD` para reemplazar lectura directa.
  - Debe agregar `PATCH /nutrition/logs/{log_id}` y
    `DELETE /nutrition/logs/{log_id}` para reemplazar mutaciones directas.
  - `/nutrition/targets/{user_id}`
  - Debe migrar a `/nutrition/targets/me` cuando el web actualice contrato.
- `frontend/src/lib/training-service.ts`
  - `/training/kalos/preview`
  - `/training/kalos/substitute`

### Sigue usando Supabase directo desde frontend

- `frontend/src/components/auth/bio-form.tsx`
  - Actualiza perfiles anteriores en `dim_atleta`.
  - Inserta nueva biometria en `dim_atleta`.
  - Actualiza metadata de usuario con `display_name`.
- `frontend/src/app/[locale]/dashboard/page.tsx`
  - Lee `user_profiles`.
  - Lee ultimo registro de `dim_atleta`.
  - Combina con `/nutrition/targets/{user_id}`.
- `frontend/src/app/[locale]/dashboard/update/page.tsx`
  - Lee `dim_atleta`.
  - Inserta nuevo registro biometrico en `dim_atleta`.
- `frontend/src/components/dashboard/evolution-chart.tsx`
  - Lee historial completo de `dim_atleta`.
  - Calcula ratios de evolucion localmente.
- `frontend/src/components/dashboard/perimeter-analytics.tsx`
  - Lee historial completo de `dim_atleta`.
  - Calcula deltas/perimetros localmente.
- `frontend/src/components/NutritionDashboard.tsx`
  - Lee `nutrition_logs` + `catalog_foods` directo; debe migrar a
    `/nutrition/logs?date=YYYY-MM-DD`.
  - Borra `nutrition_logs` directo; debe migrar a
    `DELETE /nutrition/logs/{log_id}`.
  - Usa FastAPI solo para targets y add-log.
- `frontend/src/components/workout/workout-logger.tsx`
  - Lee `exercises` directo.
  - Guarda plan temporal en `localStorage`.
  - Registra entrenamiento via `registerWorkout`.
- `frontend/src/lib/actions/workout.ts`
  - Lee `dim_atleta`.
  - Inserta en `fact_entrenamientos`.
- `frontend/src/lib/body-measurements/sync.ts`
  - Sincroniza a `body_measurements`, tabla marcada como alias legacy fuera del
    contrato canonico actual.
- `frontend/src/lib/utils/biometric-validator.ts`
  - Validaciones antropometricas viven en frontend.
- `frontend/src/lib/bio-analyzer.ts`
  - Analisis de simetria vive en frontend.
- `frontend/src/app/api/chat/route.ts`
  - Ruta interna Next para chat/IA, no expuesta por FastAPI.

## Logica atrapada en frontend/src

Debe moverse al backend o duplicarse temporalmente para movil:

1. Validacion antropometrica de captura de perfil.
2. Escritura SCD2 de `dim_atleta` con apagado de perfiles anteriores.
3. Lectura de perfil actual e historial biometrico.
4. Calculo de ratios de dashboard y evolucion.
5. Lectura diaria de nutricion con join a `catalog_foods`.
6. Borrado/edicion de entradas de nutricion.
7. Catalogo de ejercicios para logging manual.
8. Registro de entrenamiento ejecutado.
9. Persistencia offline/sync queue de medidas corporales.
10. Estado local de rutina manual guardado en `localStorage`.

## Endpoints faltantes priorizados

### P0 - Necesarios para app movil real

1. `GET /profile/me`
   - Devuelve identidad de perfil, display name, perfil actual y flags:
     `has_profile`, `has_current_biometrics`.
2. `POST /profile/biometrics`
   - Crea nueva version SCD2 en `dim_atleta` usando `current_user_id`.
   - No acepta `user_id`.
   - Reusa validaciones estrictas de rango backend.
3. `GET /profile/biometrics/current`
   - Devuelve biometria actual o `404/409 profile_required`.
4. `GET /profile/biometrics/history`
   - Sustituye queries directas de dashboard charts.
5. `GET /dashboard/summary`
   - Devuelve snapshot actual, targets nutricionales, ratios y mensajes de
     perfil incompleto en un solo contrato movil.
6. `GET /training/exercises`
   - Devuelve catalogo filtrable para logging manual.
7. `POST /training/logs`
   - Registra entrenamiento ejecutado con `current_user_id` y biometria actual.

### P1 - Calidad de producto movil

1. `POST /training/kalos/plans`
   - Guarda un preview aprobado.
2. `GET /training/kalos/plans/current`
   - Recupera rutina activa.
3. `POST /training/kalos/plans/{plan_id}/sessions/{session_id}/complete`
   - Persistencia de ejecucion real.
4. `POST /profile/biometrics/sync`
   - Soporte offline con `client_id`, `local_version`, `synced_at`.

### P2 - Conveniencia/consistencia

1. `GET /mobile/bootstrap`
   - Devuelve config minima: feature flags, version de contrato, equipment,
     enums y estado de perfil.
2. `GET /nutrition/meal-slots`
   - Slots canonicos y traducciones.
3. `GET /training/equipment`
   - Enum versionado para UI movil.

## Riesgos de seguridad

| Riesgo | Estado | Mitigacion requerida |
| --- | --- | --- |
| Service role en backend | Aceptable si solo vive en servidor | Mantener fuera de mobile/web bundles. Rotar si hubo exposicion. |
| Backend con service role debe validar ownership | Nutricion y Kalos actuales validan JWT; faltan futuros endpoints | Todo nuevo endpoint debe derivar `current_user_id` y no aceptar `user_id`. |
| Logs con JWT o biometria | No se observaron logs explicitos en FastAPI actual | Mantener politica: no imprimir tokens, service role, peso, cintura, cadera, gluteo, hombros. |
| Frontend directo a Supabase | Parcialmente aceptable con RLS, pero dispersa reglas | Para movil real, centralizar mutaciones sensibles en FastAPI. |
| `body_measurements` legacy | Riesgo de contrato roto | Alinear o retirar flujo antes de portarlo a movil. |
| Usuario sin perfil recibe fallback silencioso | Riesgo UX y prescripcion no personalizada | Devolver estado explicito `profile_required` en endpoints moviles. |
| CORS de produccion | Local allowlist correcta, falta config por entorno | Parametrizar origenes. |

## Priorizacion de readiness

### Listo para consumo movil ahora

- `POST /training/kalos/preview`
- `POST /training/kalos/substitute`
- `GET /nutrition/search`
- `GET /nutrition/logs?date=YYYY-MM-DD`
- `POST /nutrition/add-log`
- `POST /nutrition/sync-day`
- `PATCH /nutrition/logs/{log_id}`
- `DELETE /nutrition/logs/{log_id}`
- `GET /nutrition/targets/me`

### Usable con ajuste menor

- `GET /nutrition/targets/{user_id}`
  - Funciona, pero queda como legacy web. Mobile debe usar `/nutrition/targets/me`.
- Kalos preview con usuario sin perfil
  - Funciona, pero deberia informar `profile_missing` para UI.

### No listo hasta exponer backend API

- Onboarding/perfil biometrico.
- Actualizacion de medidas.
- Dashboard summary/evolution/perimeters.
- Lectura/borrado/edicion de logs de nutricion.
- Catalogo de ejercicios para logging manual.
- Registro de entrenamientos ejecutados.
- Persistencia de planes Kalos.
- Sync offline de medidas corporales.

## Cambios necesarios antes de mobile beta

1. Crear dependencia comun `current_user_id` reutilizable fuera de `main.py`.
2. Crear endpoints `/profile/*` con Pydantic `extra="forbid"` y rangos
   antropometricos estrictos.
3. Definir errores estandarizados para `session_expired`, `invalid_token`,
   `profile_required`, `forbidden`, `validation_error`.
4. Exponer dashboard summary e historial biometrico desde backend.
5. Completar API de nutricion diaria: leer, borrar y editar logs.
6. Exponer catalogo de ejercicios y logging de entrenamiento.
7. Parametrizar CORS por entorno sin wildcard en produccion.
8. Documentar version de contratos JSON para React Native.
9. Agregar tests de autorizacion para cada endpoint nuevo.
10. Mantener tests que rechacen `user_id` en bodies de cliente.

## Decision recomendada

Para un primer cliente movil real, usar Supabase Auth directo en React Native y
FastAPI como backend de dominio. No portar las queries directas actuales del
frontend web a mobile salvo como puente temporal muy acotado. Las mutaciones de
perfil, biometria, nutricion y entrenamiento deben pasar por FastAPI porque
usan datos sensibles y reglas de negocio que ya no conviene duplicar en cada
cliente.
