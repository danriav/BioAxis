# Mobile Phase 1 Boot Report

Date: 2026-06-10

## Objective

Create the initial Android mobile app foundation for Kalos using Expo and React
Native without changing existing web or backend business logic.

## Commands Executed

```powershell
npm.cmd create expo@latest mobile -- --template blank-typescript
cd mobile
npm.cmd install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants react-native-gesture-handler react-native-reanimated @react-native-async-storage/async-storage @supabase/supabase-js react-native-url-polyfill
npm.cmd install --save-dev eslint eslint-config-expo jest jest-expo @testing-library/react-native @types/jest --legacy-peer-deps
npm.cmd install --save-dev @react-native/jest-preset --legacy-peer-deps
npm.cmd install --save-dev eslint@^9 --legacy-peer-deps
npm.cmd install react-native-worklets --legacy-peer-deps
npm.cmd install --save-dev babel-preset-expo --legacy-peer-deps
npm.cmd install --save-dev jest@^29 @types/jest@^29 @react-native/jest-preset@0.85.3 --legacy-peer-deps
```

Validation commands are listed in the validation section.

## Structure Created

```text
mobile/
  app/
    _layout.tsx
    index.tsx
    login.tsx
    (tabs)/
      _layout.tsx
      dashboard.tsx
      nutrition.tsx
      workout.tsx
      profile.tsx
  src/
    components/
    features/
      auth/
      dashboard/
      nutrition/
      workout/
      profile/
    lib/
      api/
      env/
      supabase/
    styles/
    types/
  __tests__/
  assets/
  .env.example
  app.json
  babel.config.js
  eslint.config.mjs
  package.json
  tsconfig.json
```

## Dependencies Installed

Runtime:

- Expo / React Native base template
- `expo-router`
- `expo-constants`
- `expo-linking`
- `react-native-safe-area-context`
- `react-native-screens`
- `react-native-gesture-handler`
- `react-native-reanimated`
- `@react-native-async-storage/async-storage`
- `@supabase/supabase-js`
- `react-native-url-polyfill`
- `react-native-worklets`

Development:

- `eslint`
- `eslint-config-expo`
- `jest`
- `jest-expo`
- `@react-native/jest-preset`
- `babel-preset-expo`
- `@testing-library/react-native`
- `@types/jest`

## Environment Strategy

Created `mobile/.env.example` with public-only variables:

```text
EXPO_PUBLIC_API_URL
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_APP_ENV
```

No private backend, Gemini, service-role, password, or token variables were added
to mobile.

## Navigation And Screens

Implemented mock navigation with Expo Router:

- `login`
- authenticated mock bottom tabs:
  - Dashboard
  - Nutricion
  - Entrenamiento
  - Perfil

The login screen enters mock mode only. It does not connect Supabase Auth or
FastAPI.

## Git Ignore Coverage

The root `.gitignore` now covers mobile local/env/build artifacts:

- `mobile/.env`
- `mobile/.env.*`
- `mobile/.expo/`
- `mobile/android/`
- `mobile/ios/`
- `mobile/dist/`
- `mobile/web-build/`
- `*.apk`
- `*.aab`
- `*.keystore`

`mobile/.env.example` remains allowed.

## Validations

Executed:

```powershell
cd mobile
npm run lint
npm run test
$env:EXPO_NO_TELEMETRY='1'
npm run dev -- --port 8099 --localhost

cd ../frontend
npm.cmd run build

cd ../backend
python -m pytest
```

Results:

- `mobile npm run lint`: passed.
- `mobile npm run test`: passed, 1 suite / 2 tests.
- `mobile npm run dev -- --port 8099 --localhost`: Metro started and reported
  `Waiting on http://localhost:8099`; command was stopped by timeout because the
  dev server is persistent.
- `frontend npm.cmd run build`: passed.
- `backend python -m pytest`: passed, 146 tests.
- No Node/Expo process remained running after validation.
- `git check-ignore -v` confirmed mobile env/build/cache artifacts are ignored.

## Risks And Pending Items

- `npm install` reported moderate vulnerabilities from the Expo dependency
  graph. They were not auto-fixed to avoid breaking the generated SDK set.
- Dev dependency installation required `--legacy-peer-deps` due a React peer
  resolution conflict in the Expo Router dependency tree.
- Expo dev startup reported a fallback React Native DevTools warning because
  the restricted environment could not write under the user-level dotslash cache.
  Metro still started successfully.
- Supabase Auth is configuration-only in Fase 1.
- FastAPI integration is intentionally not connected in Fase 1.
- Android native build with EAS is documented but not validated in this phase.
