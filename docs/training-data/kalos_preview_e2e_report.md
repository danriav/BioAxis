# Kalos Preview E2E Report

Date: 2026-06-02

## Scope

Local E2E evidence package for the Kalos training preview flow:

- Login with sandbox user
- Open `/es/workout`
- Generate Kalos preview
- Validate `POST /training/kalos/preview`
- Validate bearer authorization without exposing token
- Validate request payload does not include `user_id`
- Validate successful `kalos_training_plan.v1` response
- Validate rendered sessions and exercises
- Validate a `422` case
- Confirm no routine persistence

## Local URLs

- Backend URL used: `http://127.0.0.1:8000`
- Frontend URL used: `http://127.0.0.1:3000`

## Sandbox User

- Sandbox user used: not available in local configuration or repository documentation.
- Password/token: not inspected and not printed.

## Execution Result

The local services were started and smoke-validated:

- Backend `/openapi.json`: passed.
- Frontend `/es/login`: passed.
- Route intended for the flow: `/es/workout`.

Full browser E2E login and preview generation could not be completed because no sandbox user credential pair was available in the local ignored env files or committed documentation.

## Login

- Result: blocked.
- Reason: sandbox email/password were not available.
- Security note: no password, bearer token, service-role key, Gemini key, or Supabase secret was printed.

## Frontend Route

- Route opened for readiness validation: `/es/login`.
- Target route for the Kalos flow: `/es/workout`.
- Static/code confirmation: `/es/workout` mounts `MagicRoutineGenerator` in the default `Preview Kalos` tab.

## Preview Request

Code-level confirmation:

- Request endpoint: `POST /training/kalos/preview`.
- Authorization header: `Authorization: Bearer <access_token>` is set by the frontend service.
- Token value: not shown.
- Payload source: `MagicRoutineGenerator.buildPayload()`.
- Payload does not include `user_id`.

Runtime browser confirmation:

- Status: blocked.
- Reason: login could not be completed without sandbox credentials, so the browser could not emit the authenticated preview request.

## Successful Preview Contract

Automated backend tests confirmed the success contract:

- Endpoint: `POST /training/kalos/preview`.
- Expected result: `200`.
- Contract version: `kalos_training_plan.v1`.
- Sessions generated: confirmed by tests.
- Exercises generated: confirmed by tests.

Validation command:

```powershell
python -m pytest
```

Result:

- `97 passed`
- Kalos preview auth/contract tests passed.

## Rendered Sessions And Exercises

Code-level confirmation:

- `MagicRoutineGenerator` stores the preview response in state.
- `preview.program.sessions.map(...)` renders each session.
- `SessionPreview` renders each session's exercises with sets, reps, RIR, rest, equipment, and coaching notes.

Runtime browser confirmation:

- Status: blocked.
- Reason: authenticated preview request could not be generated without sandbox credentials.

## 422 Case

Automated backend tests confirmed the `422` path:

- Invalid/restricted preview request returns `422`.
- Error code confirmed by tests: `catalog_no_safe_anchor`.
- Frontend behavior: `TrainingApiError` with status `422` sets the visible error message.

## Persistence

Confirmed by automated backend tests:

- The Kalos preview endpoint does not persist a routine.
- The preview test uses a fake Supabase client that records table access.
- Successful preview and `422` preview cases both assert no Supabase table calls.

Additional code-level confirmation:

- The endpoint resolves the authenticated user, then delegates to the Kalos training engine.
- No insert/update persistence operation is executed by `POST /training/kalos/preview`.

## Build And Test Gates

- Backend tests: passed.
- Frontend build: passed.

Commands executed:

```powershell
python -m pytest
npm.cmd run build
```

## Screenshots

No new screenshots were captured for the authenticated Kalos preview flow.

Reason:

- Browser automation was not available in the session.
- Authenticated UI flow was blocked by missing sandbox credentials.

Existing `e2e-artifacts/` screenshots are unrelated smoke artifacts and are not used as evidence for a completed Kalos preview E2E.

## Final Status

Status: partially validated, blocked for full authenticated browser E2E.

Validated:

- Backend and frontend local startup.
- Backend preview endpoint contract.
- Bearer requirement.
- Rejection of `user_id` in request body.
- Successful preview response contract.
- `422` validation path.
- No persistence behavior.
- Frontend build.

Blocked:

- Real sandbox login.
- Live browser network capture of `POST /training/kalos/preview`.
- Runtime screenshot of rendered preview sessions/exercises.

Required next input:

- A valid sandbox email for reporting and matching sandbox password supplied locally through ignored credentials, without committing or printing the password/token.
