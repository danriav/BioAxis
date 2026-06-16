# Mobile Phase A3 Report - Profile onboarding Android runtime validation

Fecha: 2026-06-16

## Objetivo

Validar en Android/Expo real el flujo `Perfil -> Completar/Actualizar setup ->
Guardar perfil` contra FastAPI autenticado y Supabase, despues de aplicar la RPC
`public.replace_current_dim_atleta(uuid,jsonb)`, sin exponer tokens, correos,
UUID reales ni biometria completa.

## Resultado

Estado final: aprobado.

El reintento final se ejecuto en Android real con `emulator-5554 device`. La app
abrio en Expo Go, la sesion sandbox estaba activa, Perfil cargo desde backend,
el setup biometrico se guardo correctamente y la app regreso a Perfil mostrando
el resumen actualizado.

## Entorno Usado

- Workspace: `C:\HealhTechEcosystem`
- Dispositivo: `emulator-5554 device`
- AVD: `Pixel_6`
- Backend: FastAPI via Docker Compose
- Backend health: `http://127.0.0.1:8000/docs` respondio `200`
- Mobile: Expo/React Native en `mobile/`
- Metro: `http://127.0.0.1:8081/status` respondio `packager-status:running`
- API Android configurada: `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000`
- Usuario: sandbox, sin correo documentado

## Comandos Ejecutados

```powershell
& "C:\Users\Av_da\AppData\Local\Android\Sdk\platform-tools\adb.exe" devices
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/docs | Select-Object StatusCode
cd C:\HealhTechEcosystem\mobile
npm.cmd run android
& "C:\Users\Av_da\AppData\Local\Android\Sdk\platform-tools\adb.exe" reverse tcp:8081 tcp:8081
```

## Validacion Runtime

| Paso | Resultado |
| --- | --- |
| Confirmar backend | Cumplido: `/docs` respondio `200`. |
| Confirmar Android | Cumplido: `emulator-5554 device`. |
| Levantar mobile Android | Cumplido: Metro activo y Expo Go abrio Kalos. |
| Confirmar sesion sandbox | Cumplido: Perfil mostro sesion activa. |
| Ejecutar `GET /profile/me` desde app | Cumplido: backend registro `200 OK`. |
| Abrir `Actualizar setup` | Cumplido. |
| Modificar variacion sandbox | Cumplido, sin documentar biometria completa. |
| Ejecutar `POST /profile/setup` | Cumplido: backend registro `200 OK`. |
| Confirmar retorno a Perfil | Cumplido. |
| Confirmar perfil actualizado | Cumplido: Perfil mostro resumen actualizado. |
| Confirmar unico current profile | Cumplido con consulta sanitizada: `tested_user_current_profiles=1`. |

## Resultado De Endpoints

- `GET /profile/me`: `200 OK` desde Android.
- `POST /profile/setup`: `200 OK` desde Android despues de aplicar/refrescar la
  RPC.
- `GET /profile/me` posterior al guardado: `200 OK`.

## Resultado Visual

- Perfil mostro `PERFIL BIOMETRICO` en estado `Listo`.
- Despues de guardar, la app regreso a Perfil.
- El resumen visible cambio para la variacion sandbox:
  - Peso actualizado.
  - Altura actualizada.
  - Objetivo actualizado.
  - Dias de entrenamiento visibles.
- No se agregan capturas al reporte para evitar exponer datos del usuario
  sandbox.

## Confirmacion SCD2

Se ejecuto una consulta temporal dentro del backend usando variables ya
configuradas y sin imprimir UUID, correo ni biometria completa.

Resultado sanitizado:

```text
matching_current_profiles=1; tested_user_current_profiles=1
```

Esto confirma que el usuario probado quedo con exactamente un registro
`is_current=true`.

## Revision De Logs Y Secretos

- No se documenta correo del usuario sandbox.
- No se documenta JWT, refresh token, service role key, API key ni UUID real.
- No se documenta biometria completa.
- Logcat filtrado por PID de Expo Go no mostro patrones sensibles.
- Logs recientes de backend no mostraron patrones sensibles.
- Logs de Expo/Metro no mostraron patrones sensibles.

Patrones revisados:

```text
JWT
refresh_token
service_role
SUPABASE_SERVICE
Authorization: Bearer
Bearer ey
access_token
apikey
api_key
eyJ
```

## Validaciones Mobile

Resultados finales en `mobile/`:

- `npm.cmd run lint`: paso.
- `npm.cmd test -- --runInBand`: paso.
  - 12 suites.
  - 79 tests.
- `npx.cmd tsc --noEmit`: paso.

## Incidentes Y Notas

- Expo Go mostro un aviso temporal de conexion con Expo CLI; se aplico
  `adb reverse tcp:8081 tcp:8081` y Metro estaba activo.
- La validacion final de setup no requirio cambios de logica mobile.
- La correccion backend minima previa para tolerar `user_profiles` ausente sigue
  necesaria para que `GET /profile/me` sea robusto en este runtime.

## Criterios De Aceptacion

- Android abre la app: cumplido.
- Perfil carga desde backend: cumplido.
- Setup guarda correctamente: cumplido.
- Perfil actualizado se ve en la app: cumplido.
- No se filtran secretos ni datos sensibles: cumplido.
- Gates mobile pasan: cumplido.
