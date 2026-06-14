# Mobile Phase 3 Targets Client Report

Date: 2026-06-10

## Objective

Connect the authenticated Android app to FastAPI nutrition targets using the
Supabase JWT, without exposing `user_id` from mobile and without connecting food
search, daily logs, food registration, Gemini, or any AI flow.

## Files Modified

- `mobile/src/lib/api/client.ts`
- `mobile/src/lib/api/nutrition-targets.ts`
- `mobile/src/features/nutrition/NutritionScreen.tsx`
- `mobile/src/features/nutrition/useNutritionTargets.ts`
- `mobile/__tests__/nutrition-targets-client.test.ts`
- `mobile/__tests__/nutrition-targets-view.test.ts`
- `docs/mobile/mobile_phase_3_targets_client_report.md`

## Endpoint Consumed

```text
GET /nutrition/targets/me
```

The mobile app does not call `GET /nutrition/targets/{user_id}` and does not
send `user_id` in path, query, or body for nutrition targets.

## Auth Header Strategy

The mobile API client receives the in-memory Supabase session from the auth
provider and derives:

```text
Authorization: Bearer <access_token>
```

The access token is not logged, persisted by the targets client, or included in
documentation. If no session is available, the client returns a controlled
`missing_session` error and does not call the backend.

## UI States Implemented

Nutrition screen states:

- `loading`
- `success`
- `session_expired` for `401`
- `network_error`
- `forbidden` for `403`
- `validation_error` for `422`
- `missing_session`
- generic `error`

On success the screen renders:

- calorias objetivo
- proteina
- carbohidratos
- grasas

## Commands Executed

```powershell
cd mobile
npm run lint
npm test
npx.cmd tsc --noEmit

cd ../frontend
npm.cmd run build

cd ../backend
python -m pytest
```

Additional audits:

```powershell
rg -n "/nutrition/targets/\{|/nutrition/targets/\$|user_id" mobile/app mobile/src mobile/__tests__
rg -n "SUPABASE_SERVICE_ROLE_KEY|GEMINI_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY|AIza|Bearer [A-Za-z0-9_\-.]{20,}|eyJ[A-Za-z0-9_\-.]{20,}|password\s*=|token\s*=" mobile --glob '!node_modules/**' --glob '!.expo/**' --glob '!package-lock.json'
git check-ignore -v mobile/.env mobile/.env.local mobile/.expo/state.json mobile/node_modules/expo/package.json mobile/android/app/build.gradle mobile/ios/Podfile mobile/dist/app.js mobile/web-build/index.html app.apk app.aab
git diff --cached --name-only
```

## Test Coverage

Added tests for:

- client calls `/nutrition/targets/me`;
- Authorization header is attached when a session exists;
- no backend call occurs without session;
- no mobile target request uses `/nutrition/targets/{user_id}`;
- `401` maps to session expired;
- `403` and `422` map to controlled states;
- successful response formats the macros rendered by `NutritionScreen`.

## Validation Results

- `mobile npm run lint`: passed.
- `mobile npm test`: passed, 4 suites / 12 tests.
- `mobile npx.cmd tsc --noEmit`: passed.
- `frontend npm.cmd run build`: passed.
- `backend python -m pytest`: passed, 151 tests.
- Mobile secrets audit: passed. No real service-role key, Gemini key, JWT,
  long bearer token, password assignment, or token assignment was found in
  mobile source, excluding dependencies/caches and lockfile integrity hashes.
- Legacy endpoint audit: passed for production mobile code. No request to
  `/nutrition/targets/{user_id}` exists under `mobile/app` or `mobile/src`.
  Test files mention `user_id` only to assert that it is not sent.
- Ignore audit: passed for `mobile/.env`, `mobile/.env.local`,
  `mobile/.expo/`, `mobile/node_modules/`, `mobile/android/`, `mobile/ios/`,
  `mobile/dist/`, `mobile/web-build/`, `*.apk`, and `*.aab`.
- Staging audit: passed. No files are currently staged.

## Risks Pending

- Requires a valid Supabase session from Fase 2 to call the backend at runtime.
- Requires `EXPO_PUBLIC_API_URL` to point to the reachable FastAPI host
  (`10.0.2.2:8000` for Android emulator).
- Runtime E2E with a real Android emulator and sandbox Supabase user is still
  pending.
- This phase intentionally does not connect nutrition search, food logs, or food
  registration.
