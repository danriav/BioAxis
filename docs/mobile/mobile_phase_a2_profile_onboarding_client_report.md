# Mobile Phase A2 Report - Profile onboarding client

Fecha: 2026-06-15

## Objetivo

Conectar Android/Expo con los endpoints backend autenticados de perfil
biometrico sin consultar `dim_atleta` directo desde mobile, sin enviar
`user_id` y sin exponer tokens ni biometria sensible en logs o documentacion.

## Alcance Implementado

### Cliente API mobile

Archivo: `mobile/src/lib/api/profile.ts`

Funciones agregadas:

- `getProfileMe(session)`
  - `GET /profile/me`
  - Usa `Authorization: Bearer <access_token>`.
  - No envia `user_id`.
- `setupProfile(session, payload)`
  - `POST /profile/setup`
  - Envia solo campos aprobados del setup biometrico.
  - No envia `user_id`.
- `createMeasurement(session, payload)`
  - `POST /profile/measurements`
  - Prepara el flujo de actualizacion de mediciones.
  - No envia `user_id`.

Tipos agregados:

- `ProfileMeResponse`
- `AthleteProfile`
- `ProfileSetupPayload`
- `MeasurementCreatePayload`
- `ProfileMutationResponse`

### View model y validacion local

Archivo: `mobile/src/features/profile/profileViewModel.ts`

Se agrego:

- `validateProfileSetupForm`
- `statusFromProfileError`
- `getProfileSummaryCards`
- opciones de genero y objetivo metabolico
- estado UI para loading, missing session, session expired, validation error,
  network error, empty profile, ready y success

La validacion local rechaza payload incompleto antes de llamar backend.

### Pantalla Perfil

Archivo: `mobile/src/features/profile/ProfileScreen.tsx`

Cambios:

- Carga `GET /profile/me` al enfocar la tab Perfil.
- Muestra estado loading.
- Si el backend responde perfil vacio:
  - muestra estado "Sin perfil"
  - muestra CTA `Completar perfil`
- Si el perfil existe:
  - muestra resumen basico de peso, altura, objetivo y dias de entrenamiento
  - evita mostrar perimetros completos en la pantalla principal
- Mantiene `Cerrar sesion`.

### Pantalla Setup

Archivos:

- `mobile/src/features/profile/ProfileSetupScreen.tsx`
- `mobile/app/profile-setup.tsx`

Flujo:

- Captura campos requeridos por `POST /profile/setup`.
- Valida localmente nombre, genero, edad o fecha de nacimiento, dias de
  entrenamiento y medidas requeridas.
- Envia `POST /profile/setup`.
- Al exito vuelve a Perfil.

## Seguridad

- Mobile no llama `dim_atleta`.
- Mobile no llama la RPC `replace_current_dim_atleta`.
- Mobile no envia `user_id` en query, body, path ni estado derivado.
- JWT solo via header `Authorization`.
- No se agregaron logs de tokens, correos ni biometria sensible.
- El resumen visible de Perfil se mantiene limitado a datos basicos:
  peso, altura, objetivo y dias de entrenamiento.

## Tests Agregados

Archivos:

- `mobile/__tests__/profile-client.test.ts`
- `mobile/__tests__/profile-view-model.test.ts`

Cobertura:

- `GET /profile/me` usa Authorization.
- `GET /profile/me` no envia `user_id`.
- `POST /profile/setup` no envia `user_id`.
- `POST /profile/measurements` no envia `user_id`.
- Sin sesion no llama backend.
- 401, 403, 422 y error de red se mapean correctamente.
- Validacion local rechaza payload incompleto.
- El modelo de Perfil soporta CTA cuando no hay perfil.
- El modelo de Perfil genera resumen cuando hay perfil.

## Comandos Ejecutados

```powershell
cd C:\HealhTechEcosystem\mobile
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd test -- --runInBand
```

Resultado observado:

- `npm.cmd test -- --runInBand`: paso, 12 suites y 79 tests.
- `npx.cmd tsc --noEmit`: paso tras ajustar el estado `not_found`.
- `npm.cmd run lint`: paso; se corrigio una advertencia de estilo antes del cierre.

## Pendiente Fuera De Esta Fase

- Dashboard biometrico.
- Metricas historicas.
- Pantalla dedicada de actualizacion de mediciones con `POST /profile/measurements`.
- UX avanzada de onboarding multi-step.

## Criterios De Aceptacion

- Cliente profile creado.
- Pantalla Perfil muestra empty state/CTA y resumen basico.
- Setup inicial funcional contra endpoint backend.
- Tests cubren seguridad y validacion.
- No se modifico backend.
- No se toco frontend web.
