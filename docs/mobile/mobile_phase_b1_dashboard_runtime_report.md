# Mobile Phase B1 Report - Dashboard real Android

Fecha: 2026-06-16

## Objetivo

Reemplazar el Dashboard mobile de estado MVP/placeholder por una primera vista
real que consume backend autenticado y muestra metricas basicas del atleta, sin
enviar `user_id`, sin calcular ratios en mobile y sin exponer secretos.

## Estado Final

Aprobado para MVP.

Dashboard mobile ya consume endpoints autenticados, muestra perfil real del
atleta y presenta metricas principales disponibles. No se observaron textos
visibles `mock`, `placeholder`, `Sesion mock` ni `Sin datos reales` en Dashboard.

## Endpoints Usados

- `GET /profile/me`
  - Fuente principal del Dashboard.
  - Se consume con `Authorization: Bearer <access_token>`.
  - Mobile no envia `user_id`.
- `GET /nutrition/targets/me`
  - Fuente de calorias objetivo.
  - Se consume con `Authorization: Bearer <access_token>`.
  - Mobile no calcula calorias localmente.

## Implementacion Mobile

- `mobile/src/features/dashboard/DashboardScreen.tsx`
  - Carga `GET /profile/me` al enfocar Dashboard.
  - Reutiliza `useNutritionTargets()` para la tarjeta de calorias.
  - Maneja estados `loading`, `empty`, `ready` y errores.
  - CTA de empty state: `Completar perfil`, navega a `/profile-setup`.
- `mobile/src/features/dashboard/dashboardViewModel.ts`
  - Formatea etiqueta de atleta.
  - Formatea tarjetas principales: peso, objetivo y dias de entrenamiento.
  - Formatea metricas principales: hombros, cintura y cadera.
  - Formatea calorias objetivo desde backend o estado pendiente de nutricion.
- `mobile/__tests__/dashboard-view-model.test.ts`
  - Cubre formato ready.
  - Cubre valores pendientes.
  - Cubre calorias desde backend y pendiente.
  - Cubre mapeo de errores.

## Estados Probados

| Estado | Resultado |
| --- | --- |
| `loading` | Cubierto por UI: se muestra tarjeta `Perfil / Cargando` mientras carga. |
| `ready` | Validado en Android real con perfil existente. |
| `empty` | Cubierto por ruta UI y view model; no hubo sandbox sin perfil disponible para runtime real. |
| `error` | Cubierto por view model y UI de reintento. |

## Resultado Runtime Android

Entorno:

- Dispositivo: `emulator-5554 device`.
- Backend: `http://127.0.0.1:8000/docs` respondio `200`.
- Metro: `http://127.0.0.1:8081/status` respondio `packager-status:running`.
- App: Expo Go con sesion sandbox activa.
- Conectividad: se aplico `adb reverse tcp:8081 tcp:8081`.

Resultado visual validado:

- Dashboard abre sin textos mock.
- Muestra sesion activa.
- Muestra fecha actual.
- Muestra etiqueta de atleta.
- Muestra peso actual.
- Muestra objetivo metabolico.
- Muestra dias de entrenamiento por semana.
- Muestra metricas principales: hombros, cintura, cadera.
- Muestra calorias objetivo desde backend.
- Muestra CTA `Ir a Nutricion`.

Resultado backend observado en runtime:

```text
GET /profile/me HTTP/1.1" 200 OK
GET /nutrition/targets/me HTTP/1.1" 200 OK
```

## Empty State

No habia un usuario sandbox sin perfil disponible durante esta corrida runtime.
El estado queda implementado y cubierto por pruebas/modelo:

- Mensaje claro: completar perfil para activar resumen.
- CTA: `Completar perfil`.
- Navegacion: `/profile-setup`.

## Seguridad

- No se envia `user_id` en Dashboard.
- No se consulta Supabase directo para datos protegidos.
- No se imprime JWT.
- No se imprime refresh token.
- No se imprime service role key.
- No se documenta correo real.
- No se documenta biometria completa.

Patrones revisados en logcat filtrado por PID, backend y logs de Expo:

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

No hubo coincidencias sensibles en la revision final.

## Gates Mobile

Ejecutados en `C:\HealhTechEcosystem\mobile`:

- `npm.cmd run lint`: paso.
- `npm.cmd test -- --runInBand`: paso.
  - 13 suites.
  - 84 tests.
- `npx.cmd tsc --noEmit`: paso.

## Notas

- No se tocaron backend, schema Supabase ni frontend web para B1.
- No se agregaron graficos complejos.
- No se calcularon ratios ni calorias en frontend mobile.
- Se corrigieron textos visibles de Dashboard con acentos: `Sesión`,
  `Métricas`, `Calorías`, `Nutrición`, `días`.
