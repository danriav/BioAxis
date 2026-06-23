# Mobile Fase B4 - Sustitución De Ejercicios En Preview De Entrenamiento

## Estado final

Implementado en mobile. Runtime Android bloqueado por inestabilidad del entorno Expo/ADB antes de completar la interacción visual.

El código mobile agrega sustitución de ejercicios con backend autenticado mediante `POST /training/kalos/substitute`, muestra botón `Cambiar` por ejercicio y reemplaza localmente solo el ejercicio seleccionado dentro del preview actual. No guarda rutinas ni recalcula sustituciones en mobile.

## Entorno usado

- Fecha de validación: 2026-06-17.
- Workspace: `C:\HealhTechEcosystem`.
- Mobile: Expo / React Native en Android.
- Backend local: `http://127.0.0.1:8000`.
- Dispositivo esperado: `emulator-5554 device`.
- Usuario: sandbox, sin documentar correo, UUID, JWT ni biometría completa.

## Endpoint usado

- `POST /training/kalos/substitute`

La llamada mobile usa `Authorization: Bearer <access_token>`. El payload mobile no contiene `user_id`.

## Payload mobile de sustitución

Campos enviados:

```text
current_exercise_id
current_session.goal
current_session.experience
current_session.priority
current_session.label
current_session.intent
current_session.target_muscles
available_equipment
excluded_exercise_ids
constraints
movement_pattern
role
primary_muscle
fatigue_cost
sets
```

No se envía `user_id`.

## Comportamiento implementado

- Cada ejercicio visible en el preview muestra botón `Cambiar`.
- Al tocar `Cambiar`, mobile llama al backend para obtener sustituto equivalente.
- Mobile reemplaza solo el ejercicio seleccionado usando `session_id` y `order`.
- Mobile conserva del ejercicio original:
  - orden;
  - sets;
  - reps;
  - RIR;
  - descanso.
- Mobile mantiene:
  - día seleccionado;
  - estructura de sesiones;
  - otros ejercicios;
  - otros días.
- Si backend responde `422`, mobile muestra `No hay un sustituto disponible para este ejercicio.`
- No hay guardado persistente de rutina.

## Pruebas unitarias agregadas

- Cliente llama `/training/kalos/substitute`.
- Cliente adjunta `Authorization`.
- Cliente no llama backend sin sesión.
- Payload de sustitución no contiene `user_id`.
- Errores `401/403/422/network` se mapean correctamente.
- View model construye payload de sustitución sin `user_id`.
- View model reemplaza solo el ejercicio seleccionado por sesión/orden.
- View model preserva sets/reps/RIR/descanso.
- View model mapea ausencia de sustituto a mensaje claro.

## Gates ejecutados

Desde `C:\HealhTechEcosystem\mobile`:

```text
npm.cmd run lint
Resultado: pasa.

npm.cmd test -- --runInBand
Resultado: pasa. 13 suites, 101 tests.

npx.cmd tsc --noEmit
Resultado: pasa.
```

## Runtime Android

Resultado: bloqueado por entorno antes de completar la sustitución visual.

Intentos realizados:

- Backend `http://127.0.0.1:8000/docs` respondió `200`.
- `adb devices` llegó a mostrar `emulator-5554 device` después de reiniciar el daemon ADB.
- Metro llegó a responder `packager-status:running`.
- Se abrió Expo Go con:
  - `exp://10.0.2.2:8081`
  - `exp://127.0.0.1:8081` con `adb reverse tcp:8081 tcp:8081`
- Expo Go mostró `Something went wrong` en un intento por fallo de descarga de update remoto.
- En intentos posteriores, comandos ADB de inspección (`uiautomator dump`) quedaron colgados y Metro dejó de responder.

Evidencia sanitizada de logcat:

```text
Cannot connect to Expo CLI.
Failed to download remote update.
Something went wrong.
```

No se observó un error JS atribuible a la implementación B4 durante los logs revisados; el bloqueo fue de conectividad Expo/ADB/Metro.

## Confirmación de seguridad

- No se documentaron JWT, refresh tokens, service role keys, API keys, correo real, UUID real ni biometría completa.
- No se imprimieron tokens desde el cliente mobile.
- La implementación no consulta Supabase directo para entrenamiento.
- La implementación no persiste rutina ni envía `user_id`.

## Riesgo / siguiente acción

Para aprobar runtime B4 falta reintentar en un entorno Expo/ADB estable:

1. Levantar backend.
2. Levantar Metro con `npm.cmd run android` o `npx.cmd expo start --android --clear`.
3. Confirmar `adb devices`.
4. Generar preview `4 días / 75 min / Hipertrofia / Balanceado / Intermedio`.
5. Tocar `Cambiar` en un ejercicio.
6. Confirmar que solo cambia ese ejercicio y se preservan sets/reps/RIR/descanso.

Agente recomendado para el bloqueo: Mobile Android / Infra local Expo-ADB.
