# Mobile Phase 10 Report - Android Kalos preview runtime validation

Fecha: 2026-06-12

## Objetivo

Validar en emulador Android real que `Entrenamiento` genera previews Kalos
contra FastAPI autenticado, sin persistir rutinas y sin exponer tokens ni datos
sensibles.

## Entorno Validado

- Dispositivo: `emulator-5554 device`.
- Backend local: `http://127.0.0.1:8000/docs` respondio `200`.
- Metro/Expo: `http://127.0.0.1:8081/status` respondio
  `packager-status:running`.
- Mobile Android API URL: `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000`.
- App abierta en Expo Go con sesion sandbox ya activa.

No se incluyen capturas en este reporte para evitar exponer correo visible,
tokens o datos sensibles.

## Comandos Ejecutados

```powershell
& "C:\Users\Av_da\AppData\Local\Android\Sdk\platform-tools\adb.exe" devices
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/docs | Select-Object StatusCode
Invoke-RestMethod http://127.0.0.1:8081/status
Select-String -Path mobile\.env.local -Pattern '^EXPO_PUBLIC_API_URL=' | Select-Object Line
& "C:\Users\Av_da\AppData\Local\Android\Sdk\platform-tools\adb.exe" logcat -c
& "C:\Users\Av_da\AppData\Local\Android\Sdk\platform-tools\adb.exe" logcat -d -v time | Select-String -Pattern "JWT|refresh_token|service_role|SUPABASE_SERVICE|dim_atleta|Authorization: Bearer|Bearer ey|access_token|biometric"
npm.cmd run lint
npm.cmd test -- --runInBand
npx.cmd tsc --noEmit
```

## Resultados Runtime

| Combinacion | Resultado | Dias renderizados | Dia default | Cambio de tab |
| --- | --- | ---: | --- | --- |
| 4 dias, 75 min, Hipertrofia, Balanceado, Intermedio | Paso | 4 | Dia 1 | Al tocar Dia 2, se oculto Dia 1 y se mostro solo Upper A. |
| 5 dias, 90 min, Hipertrofia, Balanceado, Intermedio | Paso | 5 | Dia 1 | Selector mostro Dia 1 a Dia 5; contenido de Dia 1 visible con sesion y ejercicios. |
| 3 dias, 60 min, Recomposicion, Balanceado, Principiante | Paso | 3 | Dia 1 | Selector mostro Dia 1 a Dia 3; contenido de Dia 1 visible con sesion y ejercicios. |

## Detalle Observado

### Combinacion 1

- `Generar preview` devolvio estado visible `Preview generado`.
- Tabs renderizadas: `Dia 1`, `Dia 2`, `Dia 3`, `Dia 4`.
- Dia default: `Dia 1`.
- Dia 1 mostro:
  - Sesion: `Lower A`.
  - Musculos: `quads`, `glutes`.
  - Duracion: `70 min`.
  - Fatiga: `9`.
  - Ejercicios con nombre, musculo, equipo, sets, reps, RIR y descanso.
- Cambio de tab:
  - Al tocar `Dia 2`, se mostro `Upper A`.
  - `Lower A` dejo de mostrarse en pantalla.

### Combinacion 2

- Configuracion aplicada: 5 dias, 90 min, Hipertrofia, Balanceado, Intermedio.
- `Generar preview` devolvio estado visible `Preview generado`.
- Tabs renderizadas: `Dia 1`, `Dia 2`, `Dia 3`, `Dia 4`, `Dia 5`.
- Dia default: `Dia 1`.
- Dia 1 mostro sesion, duracion/fatiga y ejercicios con sets, reps, RIR y
  descanso.
- No hubo error visible.

### Combinacion 3

- Configuracion aplicada: 3 dias, 60 min, Recomposicion, Balanceado,
  Principiante.
- `Generar preview` devolvio estado visible `Preview generado`.
- Tabs renderizadas: `Dia 1`, `Dia 2`, `Dia 3`.
- Dia default: `Dia 1`.
- Dia 1 mostro:
  - Sesion: `Full Body A`.
  - Musculos: `quads`, `chest`, `back`.
  - Duracion: `60 min`.
  - Fatiga: `8`.
  - Ejercicios con nombre, musculo, equipo, sets, reps, RIR y descanso.
- No hubo error visible.

## No Persistencia

Se valido que el preview no queda persistido:

1. Se generaron previews.
2. Se cambio temporalmente a otra tab y se volvio a Entrenamiento: el preview
   seguia solo como estado de pantalla en memoria.
3. Se ejecuto `am force-stop host.exp.exponent`.
4. Se reabrio Expo Go con `exp://10.0.2.2:8081`.
5. Al volver a `Entrenamiento`, la pantalla mostro el formulario inicial, sin
   `Preview generado`, sin tabs de dias y sin rutina/historial persistido.

## Seguridad Y Logs

Auditoria ejecutada sobre `logcat` despues de limpiar la ventana de logs:

```powershell
& "C:\Users\Av_da\AppData\Local\Android\Sdk\platform-tools\adb.exe" logcat -d -v time | Select-String -Pattern "JWT|refresh_token|service_role|SUPABASE_SERVICE|dim_atleta|Authorization: Bearer|Bearer ey|access_token|biometric"
```

Resultado:

- Sin coincidencias.
- No se observaron JWT.
- No se observaron refresh tokens.
- No se observaron service role keys.
- No se observaron correos en logs revisados.
- No se observaron datos biometricos ni `dim_atleta` en logs revisados.

## Textos Mock

En la pantalla `Entrenamiento` validada:

- No aparece `mock`.
- No aparece `placeholder`.
- No aparece `Rutinas en preparacion`.
- Se muestra el flujo real `Preview Kalos` con boton `Generar preview`.

## Hallazgos No Bloqueantes

- Al reiniciar Expo Go aparecio un LogBox de desarrollo:
  `SafeAreaView has been deprecated...`.
- No contiene tokens, correos ni datos sensibles.
- No bloqueo el flujo; se descarto con `Dismiss`.
- Agente recomendado para corregirlo en otra fase: Mobile Android/UI,
  reemplazando `SafeAreaView` desde `react-native` por `react-native-safe-area-context`.

## Validacion De Calidad

```powershell
cd mobile
npm.cmd run lint
npm.cmd test -- --runInBand
npx.cmd tsc --noEmit
```

Resultados:

- `npm.cmd run lint`: paso.
- `npm.cmd test -- --runInBand`: paso, 10 suites y 67 tests.
- `npx.cmd tsc --noEmit`: paso.

## Criterios De Aceptacion

- Las tres combinaciones fueron probadas en Android real.
- El boton `Generar preview` llamo al backend y mostro resultados.
- Los resultados se mostraron seccionados por dia.
- Cambiar de dia oculto el dia anterior.
- Cada dia inspeccionado mostro ejercicios, sets, reps, RIR, descanso, duracion
  y fatiga.
- El preview no se persistio al reiniciar app.
- No se expusieron tokens, correos, service role keys ni datos biometricos en el
  reporte.
- No se modifico backend.
- No se implemento guardado de rutinas.
