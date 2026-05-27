# API

## Authentication

Nutrition endpoints are authenticated with `Authorization: Bearer <Supabase JWT>`.
The backend uses the service-role Supabase client for database access, so routes
must never trust `user_id` from request bodies. Each nutrition route resolves the
caller through Supabase Auth and uses that authenticated `user_id` for all
queries and mutations.

Unauthenticated requests return `401`. Requests for another user's path-scoped
resource return `403`.

Contract validation status codes:

- Missing or invalid bearer token: `401`.
- Valid bearer token for `/nutrition/search`, `/nutrition/add-log`,
  `/nutrition/sync-day`, and `/nutrition/targets/{user_id}` owned by the caller:
  `200`.
- Authenticated request for another user's `/nutrition/targets/{user_id}`:
  `403`.
- Request body with extra fields such as `user_id`: `422`.

## CORS

Local frontend origins are allowlisted explicitly for development and preview
checks: `http://localhost:3000`, `http://127.0.0.1:3000`,
`http://localhost:4173`, `http://127.0.0.1:4173`,
`http://localhost:5173`, and `http://127.0.0.1:5173`.

Production must keep explicit origins and must not use universal CORS (`*`).

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

### `GET /nutrition/targets/{user_id}`

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
