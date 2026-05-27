# Testing

## Backend command

Run service tests from the backend directory:

```powershell
cd backend
pytest
```

`backend/pytest.ini` enforces at least 80% coverage for `app.services`.

## Coverage Focus

- `HypertrophyEngineService.calculate_macro_targets`: calorie, protein, fat, and carbohydrate targets.
- `HypertrophyEngineService.validate_biometrics`: rejects negative weights and incoherent heights before calculations.
- `HypertrophyEngineService.calculate_weekly_volume`: aggregates sets per muscle group and blocks weekly volume above 20 sets.
- Pydantic schemas: strict typing rejects stringified numbers and out-of-range anthropometrics.

## Architectural Guardrail

Tests should target services directly. Route tests can verify orchestration, but mathematical macronutrient or training-volume assertions belong in service-layer tests.

## Frontend command

The current MVP frontend pre-merge gate is the production build:

```powershell
cd frontend
npm run build
```

`npm run lint` is intentionally out of scope for the current MVP merge gate.
The latest lint run failed with 60 errors and 31 warnings, mostly legacy
TypeScript `any` usage and unused symbols. If lint becomes mandatory, assign a
Frontend Agent to correct those findings before enabling it as a blocking gate.

Add a dedicated Jest or equivalent test command before requiring frontend unit
tests in CI.

## Gemini mocks

Tests must not consume real Gemini quota. Use mocks or fixtures for Gemini
responses, including timeout, malformed JSON, empty candidate, and successful
structured-output cases. Test fixtures must not contain real prompts from users,
biometric records, API keys, or provider response logs.
