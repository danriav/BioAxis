# Mobile Fase C2 - Rediseño visual del Dashboard

Fecha: 2026-06-18  
Estado: aprobado en implementación y validación Android.

## Resultado

Dashboard dejó la composición basada en `MockCard` y ahora presenta una vista mobile-first llamada `Hoy en Kalos`.

La pantalla incluye:

- Encabezado con fecha local y actualización manual.
- Saludo con etiqueta neutral de atleta.
- Objetivo metabólico formateado para usuario final.
- Resumen real de nutrición con consumo, objetivo, calorías disponibles y progreso.
- Resumen honesto de entrenamiento basado en frecuencia semanal.
- Perfil actual en una fila compacta.
- Métricas principales en filas escaneables.
- Accesos rápidos a Nutrición, Entrenamiento y actualización de Perfil.
- Estados de carga, perfil vacío, error y perfil listo.

## Datos y contratos

Se reutilizaron exclusivamente integraciones existentes:

- `GET /profile/me`
- `GET /nutrition/targets/me`
- `GET /nutrition/logs?date=YYYY-MM-DD`

No se modificaron endpoints, payloads, Supabase, backend ni base de datos. Mobile no envía `user_id`.

El progreso nutricional solo relaciona el total y el objetivo entregados por backend. No se calculan targets ni biometría en mobile.

## View model

Se agregó cobertura para:

- Formato legible del objetivo metabólico.
- Resumen de consumo, objetivo y calorías restantes.
- Progreso limitado a 100 %.
- Ausencia de resumen cuando faltan datos backend.
- Resumen semanal de entrenamiento sin prometer persistencia.
- Estados pendientes cuando faltan datos.

## Validación Android

- Dispositivo: `emulator-5554`, perfil Pixel 6.
- Resolución física: `1080x2400`, densidad `420`.
- Backend: `http://127.0.0.1:8000/docs`, respuesta `200`.
- Metro: `http://127.0.0.1:8081/status`, `packager-status:running`.
- Estado ready validado con perfil y objetivos reales.
- Estado loading observado durante recarga de bundle/datos.
- Perfil vacío y error quedaron implementados; no había un segundo sandbox vacío para validarlos sin alterar datos.
- Se simuló viewport `720x1280`, densidad `320`.
- En pantalla pequeña, las tarjetas del resumen cambian de dos columnas a una columna.
- No se observaron textos cortados, contenido bajo la tab bar ni controles solapados.
- El emulador fue restaurado a su resolución y densidad físicas.

## Evidencia sanitizada

- `docs/mobile/visual-audit-captures/c2-dashboard-summary.png`
- `docs/mobile/visual-audit-captures/c2-dashboard-actions.png`
- `docs/mobile/visual-audit-captures/c2-dashboard-small-sanitized.png`

Los recortes excluyen mediciones biométricas, correo, JWT, refresh token y UUID. Los archivos raw fueron eliminados.

## Gates

- `npm.cmd run lint`: aprobado.
- `npm.cmd test -- --runInBand`: aprobado, 14 suites y 111 tests.
- `npx.cmd tsc --noEmit`: aprobado.

## Corrección C2.1

Se añadió `deriveDashboardState(...)` como única fuente para decidir el estado global renderizado por `DashboardScreen`.

La composición evalúa Perfil, logs y targets con esta prioridad:

1. `session_expired` / `missing_session`
2. `forbidden`
3. `network_error` / `unexpected_error` / `error`
4. `loading`
5. `empty`
6. `ready`

También se incluyeron `not_found` y `validation_error` dentro del grupo de error para conservar el mapeo existente sin presentar contenido listo.

Consecuencias:

- Un error de sesión o red de Nutrición ya no queda oculto por un Perfil listo.
- El estado vacío solo se muestra después de resolver las tres fuentes.
- El fallback `Abre Nutrición para revisar tu día` solo puede renderizarse cuando logs y targets respondieron `success`, no existe resumen nutricional y no hay error compuesto.
- `Reintentar` ejecuta `loadProfile()`, `logsState.reload()` y `targetsState.reload()`.

Pruebas agregadas:

- Perfil ready + logs `session_expired`.
- Perfil ready + targets `network_error`.
- Nutrición `loading`.
- Nutrición success sin registros.
- Perfil, logs y targets exitosos.
- Prioridad de `session_expired` sobre `loading`.

## Archivos principales

- `mobile/src/features/dashboard/DashboardScreen.tsx`
- `mobile/src/features/dashboard/dashboardViewModel.ts`
- `mobile/__tests__/dashboard-view-model.test.ts`
- `mobile/app/(tabs)/_layout.tsx`

## Límites respetados

- Sin cambios de backend.
- Sin cambios de contratos.
- Sin cambios en Supabase.
- Sin cálculos biométricos nuevos.
- Sin commit, push ni Pull Request.
