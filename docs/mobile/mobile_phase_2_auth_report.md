# Mobile Phase 2 Auth Report

Date: 2026-06-10

## Objective

Implement real Supabase Auth login/session handling in `mobile/` without
connecting sensitive business data or backend domain endpoints.

## Files Modified

- `mobile/package.json`
- `mobile/package-lock.json`
- `mobile/tsconfig.json`
- `mobile/app/_layout.tsx`
- `mobile/app/(tabs)/_layout.tsx`
- `mobile/src/features/auth/LoginScreen.tsx`
- `mobile/src/features/profile/ProfileScreen.tsx`
- `mobile/src/features/auth/AuthProvider.tsx`
- `mobile/src/features/auth/auth-session.ts`
- `mobile/src/lib/api/client.ts`
- `mobile/src/lib/supabase/client.ts`
- `mobile/src/styles/theme.ts`
- `mobile/__tests__/env.test.ts`
- `mobile/__tests__/auth-storage.test.ts`
- `docs/mobile/mobile_phase_2_auth_report.md`

## Storage Strategy

Supabase Auth is configured from public mobile variables only:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Session persistence uses `expo-secure-store` through the Supabase storage
adapter. If SecureStore is unavailable, the adapter falls back to
`@react-native-async-storage/async-storage` as a runtime compatibility fallback.
The fallback is not preferred for production secrets and should be reviewed
before release builds.

No JWT, password, service-role key, Gemini key, or private API key is stored in
`.env`, logs, documentation, or committed files.

## Auth Flow

Implemented:

- Email/password login with `supabase.auth.signInWithPassword`.
- Logout with `supabase.auth.signOut`.
- Session restoration on app startup with `supabase.auth.getSession`.
- Auth state listener with `onAuthStateChange`.
- Local expired-session detection through `expires_at`.
- Minimal auth state:
  - `loading`
  - `authenticated`
  - `unauthenticated`
  - `error`
- Navigation protection:
  - unauthenticated users are redirected to `/login`;
  - authenticated users can access bottom tabs;
  - login redirects authenticated users to dashboard.

## API Client

`mobile/src/lib/api/client.ts` can create:

```text
Authorization: Bearer <access_token>
```

The header is generated only from an in-memory Supabase session object. The
token value is never printed.

## Commands Executed

```powershell
cd mobile
npm.cmd install expo-secure-store --legacy-peer-deps
npm run lint
npm test
npx.cmd tsc --noEmit
```

Additional repository gates:

```powershell
cd frontend
npm.cmd run build

cd backend
python -m pytest
```

## Validations

Executed:

- `mobile npm run lint`
- `mobile npm test`
- `mobile npx.cmd tsc --noEmit`
- `frontend npm.cmd run build`
- `backend python -m pytest`
- mobile secrets audit
- ignore/staging audit for `.env`, `.expo`, `node_modules`, APK/AAB

Results:

- `mobile npm run lint`: passed.
- `mobile npm test`: passed, 2 suites / 5 tests.
- `mobile npx.cmd tsc --noEmit`: passed.
- `frontend npm.cmd run build`: passed.
- `backend python -m pytest`: passed, 146 tests.
- Mobile secrets audit: passed. No real service-role keys, Gemini keys, JWTs,
  bearer tokens, passwords, or token assignments were found in `mobile/`
  excluding dependencies/caches.
- Ignore audit: passed for `mobile/.env`, `mobile/.env.local`,
  `mobile/.expo/`, `mobile/node_modules/`, `mobile/android/`, `mobile/ios/`,
  `mobile/dist/`, `mobile/web-build/`, `*.apk`, and `*.aab`.
- Staging audit: passed. No files are currently staged.
- Local process audit: no app ports were left running on `8099`, `3000`, or
  `8000`.

## Risks And Pending Items

- Supabase Auth is ready for sandbox credentials, but no sandbox credentials are
  committed or documented here.
- AsyncStorage fallback exists for environments where SecureStore is not
  available. Production Android builds should validate SecureStore availability.
- No business endpoints are called in Fase 2.
- No `user_id` payloads are sent by mobile auth flow.
