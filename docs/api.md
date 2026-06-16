# API

## Authentication

Profile, nutrition, and training endpoints are authenticated with
`Authorization: Bearer <Supabase JWT>`.
The backend uses the service-role Supabase client for database access, so routes
must never trust `user_id` from request bodies. Each nutrition route resolves the
caller through Supabase Auth and uses that authenticated `user_id` for all
queries and mutations.

Unauthenticated requests return `401`. Requests for another user's path-scoped
resource return `403`.

Contract validation status codes:

- Missing or invalid bearer token: `401`.
- Valid bearer token for `/nutrition/search`, `/nutrition/add-log`,
  `/nutrition/sync-day`, `/nutrition/logs`, `/nutrition/targets/me`, and
  `/nutrition/targets/{user_id}` owned by the caller: `200`.
- Authenticated request for another user's `/nutrition/targets/{user_id}`:
  `403`.
- Client-supplied `user_id` on `/nutrition/targets/me`: `422`.
- Request body with extra fields such as `user_id`: `422`.

## CORS

Local frontend origins are allowlisted explicitly for development and preview
checks: `http://localhost:3000`, `http://127.0.0.1:3000`,
`http://localhost:4173`, `http://127.0.0.1:4173`,
`http://localhost:5173`, and `http://127.0.0.1:5173`.

Production must keep explicit origins and must not use universal CORS (`*`).

## Profile endpoints

### `GET /profile/me`

Returns the authenticated user's current mobile biometric profile from
`dim_atleta`.

Response model: `MobileProfileMeResponse`

Empty response:

```json
{
  "status": "empty",
  "has_profile": false,
  "profile": null
}
```

Ready response:

```json
{
  "status": "ready",
  "has_profile": true,
  "profile": {
    "biometria_id": "bio-uuid",
    "display_name": "Ada",
    "genero": "mujer",
    "edad": 29,
    "peso": 62.0,
    "altura": 168.0,
    "hombros": 102.0,
    "pecho": 92.0,
    "brazo": 29.0,
    "antebrazo": 24.0,
    "cintura": 72.0,
    "cadera": 102.0,
    "gluteo": 104.0,
    "pierna": 58.0,
    "pantorrilla": 36.0,
    "objetivo_metabolico": "mantenimiento",
    "dias_entrenamiento_semana": 4,
    "is_current": true
  }
}
```

Authorization behavior:

- Requires a valid bearer token.
- Does not accept `user_id` in query or body.
- Never returns `user_id`.

### `POST /profile/setup`

Creates the initial mobile biometric profile in `dim_atleta`. The backend calls
the `public.replace_current_dim_atleta(p_user_id uuid, p_profile jsonb)` RPC and
does not perform insert/close/delete compensation from FastAPI. The RPC must run
inside Postgres as one transaction: take a per-user advisory transaction lock,
close current rows, insert the new `is_current=true` row, and validate that
exactly one current row remains. If any step fails, Postgres rolls the whole RPC
back and the API returns a generic internal error.

The RPC is an internal backend primitive, not a public client contract. The SQL
script revokes execution from `PUBLIC`, `anon`, and `authenticated`, and grants
execution only to `service_role`. Mobile and web clients must call
`POST /profile/setup` or `POST /profile/measurements`; they must never call the
RPC directly or send `user_id`.

Request model: `MobileProfileSetupRequest`

```json
{
  "display_name": "Ada",
  "genero": "mujer",
  "edad": 29,
  "peso": 62.0,
  "altura": 168.0,
  "hombros": 102.0,
  "pecho": 92.0,
  "brazo": 29.0,
  "antebrazo": 24.0,
  "cintura": 72.0,
  "cadera": 102.0,
  "gluteo": 104.0,
  "pierna": 58.0,
  "pantorrilla": 36.0,
  "objetivo_metabolico": "mantenimiento",
  "dias_entrenamiento_semana": 4
}
```

`fecha_nacimiento` can be sent instead of `edad`; the backend calculates age.

Response model: `MobileProfileMutationResponse`

Authorization behavior:

- Requires a valid bearer token.
- Inserts `user_id` from the validated Supabase JWT.
- Rejects `user_id` in query/body with `422`.
- Rejects invalid biometric ranges with `422`.
- Does not write to `user_profiles` in this phase; `display_name` is accepted
  for mobile response compatibility and `user_profiles` synchronization remains
  a follow-up contract.

### `POST /profile/measurements`

Creates a new SCD2 biometric measurement in `dim_atleta` for the authenticated
user. The backend reads the current row, copies stable fields such as `genero`,
`edad`, and `altura`, then delegates replacement to
`public.replace_current_dim_atleta(p_user_id uuid, p_profile jsonb)`. The
endpoint depends on the RPC atomicity guarantee described for
`POST /profile/setup`; it does not rely on best-effort compensating deletes.

Request model: `MobileMeasurementCreateRequest`

```json
{
  "peso": 63.5,
  "cintura": 70.0,
  "gluteo": 106.0
}
```

Response model: `MobileProfileMutationResponse`

Authorization behavior:

- Requires a valid bearer token.
- Does not accept `user_id` in query/body.
- Rejects invalid biometric ranges with `422`.
- Returns `404` when no current biometric profile exists.

## Nutrition endpoints

### `GET /nutrition/search`

Searches the food catalog.

Query parameters:

- `query`: text fragment matched against `name_es`.

Response model: `list[FoodSearchItem]`.

Authorization behavior:

- Requires a valid bearer token.
- Does not accept or use client-provided `user_id`.

### `POST /nutrition/sync-day`

Copies the authenticated user's food log entries from one date to another.

Request model: `SyncNutritionDayRequest`

```json
{
  "source_date": "2026-05-24",
  "target_date": "2026-05-25"
}
```

Response model: `SyncNutritionDayResponse`

```json
{
  "status": "success",
  "copied_items": 3
}
```

Authorization behavior:

- Uses only the authenticated Supabase user id for source lookup and insert.
- Rejects request bodies with extra fields such as `user_id`.

### `POST /nutrition/add-log`

Adds one meal log entry for the authenticated user.

Request model: `MealLogRequest`

```json
{
  "food_id": "food-uuid",
  "meal_slot": "breakfast",
  "quantity_g": 100.0,
  "target_date": "2026-05-25"
}
```

Response model: `MealLogResponse`.

Authorization behavior:

- Inserts `user_id` from the validated Supabase JWT.
- Rejects request bodies with extra fields such as `user_id`.

### `GET /nutrition/logs`

Returns the authenticated user's food logs for one day with catalog macros
resolved per gram, daily totals, and meal grouping.

Query parameters:

- `date`: ISO date in `YYYY-MM-DD` format.

Response model: `NutritionDayLogsResponse`

```json
{
  "date": "2026-06-10",
  "items": [
    {
      "id": "log-uuid",
      "food_id": "food-uuid",
      "food_name": "Avena",
      "meal_slot": "desayuno",
      "quantity_g": 100.0,
      "consumed_at": "2026-06-10",
      "kcal": 389.0,
      "protein": 16.9,
      "carbs": 66.3,
      "fat": 6.9
    }
  ],
  "totals": {
    "kcal": 389.0,
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

Authorization behavior:

- Requires a valid bearer token.
- Filters by `user_id` from the validated Supabase JWT.
- Filters by `consumed_at = date`.
- Does not accept `user_id` in query or body.
- Client-supplied `user_id` returns `422`.
- A day without logs returns `200` with `items: []` and zero totals.

### `PATCH /nutrition/logs/{log_id}`

Updates one authenticated user's logged food entry. This endpoint is intended
for mobile corrections such as changing meal slot, grams, or date.

Request model: `NutritionLogUpdateRequest`

Allowed fields:

- `meal_slot`: non-empty string.
- `quantity_g`: number greater than `0`.
- `target_date`: ISO date in `YYYY-MM-DD` format.
- `consumed_at`: ISO date in `YYYY-MM-DD` format.

Use either `target_date` or `consumed_at`, not both.

```json
{
  "meal_slot": "cena",
  "quantity_g": 125.0,
  "target_date": "2026-06-12"
}
```

Response model: `NutritionLogMutationResponse`

```json
{
  "id": "log-uuid",
  "food_id": "food-uuid",
  "meal_slot": "cena",
  "quantity_g": 125.0,
  "consumed_at": "2026-06-12"
}
```

Authorization behavior:

- Requires a valid bearer token.
- Updates only when `id = log_id` and `user_id` equals the authenticated user.
- Does not accept `user_id` in query or body.
- Client-supplied `user_id` returns `422`.
- Missing or cross-user logs return `404`.
- Extra fields return `422`.

### `DELETE /nutrition/logs/{log_id}`

Deletes one authenticated user's logged food entry.

Response model: `NutritionLogDeleteResponse`

```json
{
  "status": "success",
  "deleted_id": "log-uuid"
}
```

Authorization behavior:

- Requires a valid bearer token.
- Deletes only when `id = log_id` and `user_id` equals the authenticated user.
- Does not accept `user_id` in query or body.
- Client-supplied `user_id` returns `422`.
- Missing or cross-user logs return `404`.

### `GET /nutrition/targets/me`

Returns macronutrient targets for the authenticated user. This is the preferred
mobile contract because identity comes only from the bearer token.

Response model: `NutritionTargetsResponse`

```json
{
  "kcal": 2100,
  "protein": 160,
  "carbs": 220,
  "fat": 70
}
```

Authorization behavior:

- Requires a valid bearer token.
- Does not accept `user_id` in the path, query, or body.
- Client-supplied `user_id` returns `422`.

### `GET /nutrition/targets/{user_id}` legacy

Returns macronutrient targets for the authenticated user.

Response model: `NutritionTargetsResponse`

```json
{
  "kcal": 2100,
  "protein": 160,
  "carbs": 220,
  "fat": 70
}
```

Authorization behavior:

- The path `user_id` must match the authenticated Supabase user id.
- Cross-user access returns `403`.
- Kept for web compatibility; new mobile clients should use
  `/nutrition/targets/me`.

## AI NLP extraction service

The backend includes `GeminiNLPService` in `backend/app/services/ai_integration.py` for asynchronous extraction of workouts and meals from unstructured text.

Environment variables:

- `GEMINI_API_KEY`: Gemini test or production API key.
- `GEMINI_MODEL`: optional model override. Defaults to `gemini-2.0-flash`.
- `GEMINI_API_BASE_URL`: optional Gemini REST base URL. Defaults to `https://generativelanguage.googleapis.com/v1beta`.
- `GEMINI_TIMEOUT_SECONDS`: optional timeout. The service caps this at 8 seconds.
- `GEMINI_MAX_RETRIES`: retry count for timeouts and transient transport or 5xx failures.

Input contract:

- `AIExtractionRequest.text`: free-text note, 1 to 8000 characters.
- `AIExtractionRequest.locale`: locale hint, default `es-MX`.

Output contract:

- `HealthNLPExtraction.workouts`: parsed training sessions with exercises, sets, reps, RIR, load and notes.
- `HealthNLPExtraction.meals`: parsed meal slots with food items, quantities and macro estimates only when evidence exists.
- `HealthNLPExtraction.warnings`: short warnings for missing quantities or uncertain interpretation.

Controlled exceptions:

- `AIConfigurationError`: missing Gemini API key.
- `AITimeoutError`: Gemini exceeded the asynchronous timeout budget.
- `AIProviderContractError`: Gemini response shape changed, returned no candidate text or returned non-JSON text.
- `AIStructuredOutputError`: Gemini returned JSON that does not satisfy the Pydantic contract.

The service uses Gemini `generateContent` with `responseMimeType: application/json` and `responseSchema`, then validates the returned text again with `HealthNLPExtraction.model_validate_json`.
