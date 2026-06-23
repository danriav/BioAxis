# Mobile Fase C5C - Visualización completa de métricas biométricas

Fecha: 2026-06-19  
Estado: implementación, pruebas, lint y TypeScript aprobados. Validación runtime Android iniciada; aprobación C5C pendiente por credenciales sandbox no disponibles tras limpiar Expo Go.

## Objetivo

Completar la visualización de todas las métricas biométricas disponibles del atleta en Android sin saturar el Dashboard y manteniendo la estética Kalos.

## Resultado funcional

Mobile mantiene el resumen principal de Dashboard con:

- Hombros.
- Cintura.
- Cadera.

Además, el Dashboard incorpora un bloque compacto `Mapa corporal` con las medidas actuales agrupadas por contexto:

- Torso: hombros, pecho, cintura, cadera.
- Brazos: brazo, antebrazo.
- Piernas: glúteo, pierna, pantorrilla.

La vista `Progresión detallada` reorganiza el selector de métricas en grupos visibles:

- General: peso.
- Torso: hombros, pecho, cintura, cadera.
- Brazos: brazo, antebrazo.
- Piernas: glúteo, pierna, pantorrilla.
- Ratios: ratio de simetría, ratio de curvatura.

Cada métrica puede graficarse cuando existe historial. Si una métrica no tiene serie disponible, la UI muestra un empty state específico, por ejemplo:

```text
Aún no hay registros de pantorrilla.
```

Perfil ahora muestra todas las medidas actuales en el orden corporal solicitado:

```text
peso, altura, hombros, pecho, brazo, antebrazo, cintura, cadera, glúteo, pierna, pantorrilla
```

## Seguridad y contrato

- No se modificó backend.
- No se modificó Supabase.
- No se modificaron contratos.
- No se recalculan ratios en Mobile.
- No se agregó `user_id` a requests.
- No se agregaron logs con JWT, tokens ni medidas biométricas sensibles.
- El historial continúa consumiéndose desde `GET /profile/history`.

## Limpieza de textos corruptos

Se validó que no queden patrones visibles de mojibake en UI mobile ni documentación mobile. El escaneo cubrió `mobile/src`, `mobile/app` y `docs/mobile`.

Resultado: sin coincidencias.

También se corrigió el único patrón residual encontrado en un reporte histórico, donde aparecía dentro de un comando literal de auditoría.

## Pruebas agregadas

La cobertura nueva confirma:

- Existencia de las 12 métricas biométricas:
  - peso
  - hombros
  - pecho
  - brazo
  - antebrazo
  - cintura
  - cadera
  - glúteo
  - pierna
  - pantorrilla
  - ratio de simetría
  - ratio de curvatura
- Agrupación completa del selector de Progresión.
- Empty state específico para una métrica sin datos.
- Render del estado vacío del gráfico biométrico.
- Orden completo de medidas actuales en Perfil.

## Gates

- `npm.cmd test -- --runInBand`: aprobado, 17 suites y 152 tests.
- `npm.cmd run lint`: aprobado.
- `npx.cmd tsc --noEmit`: aprobado.

## Validación visual

Intento runtime del 2026-06-19:

- Se inició el AVD `Pixel_6`.
- Se confirmó Android runtime en `1080x2400`, densidad `420`.
- Se levantó Expo/Metro y se abrió la app nativa en Expo Go.
- Expo Go mostró inicialmente `Failed to download remote update`; se limpió estado de Expo Go y se relanzó en modo Android.
- La app cargó correctamente hasta `Login sandbox`.
- Al limpiar Expo Go se perdió la sesión sandbox persistida.
- No hay credenciales sandbox versionadas ni locales disponibles para iniciar sesión.
- Un intento con el par obvio del placeholder fue rechazado por Supabase Auth.

Capturas runtime generadas como evidencia del bloqueo:

- `docs/mobile/visual-audit-captures/c5c-android-launch.png`
- `docs/mobile/visual-audit-captures/c5c-error-log.png`
- `docs/mobile/visual-audit-captures/c5c-after-login.png`

Estas capturas no aprueban C5C porque no alcanzan Dashboard, Progresión ni Perfil autenticados.

Capturas requeridas en cuanto exista una sesión sandbox válida:

- Dashboard con bloque `Mapa corporal`.
- Progresión detallada mostrando una métrica de brazos.
- Progresión detallada mostrando una métrica de piernas.
- Perfil con todas las medidas actuales.
- Pantalla Android pequeña para verificar ausencia de solapamientos.

Conclusión runtime: C5C permanece pendiente de aprobación visual. El bloqueo actual no es código ni backend; es falta de credenciales sandbox válidas o sesión autenticada persistida para entrar a las pantallas protegidas.

## Archivos modificados

- `mobile/src/features/dashboard/biometricHistoryViewModel.ts`
- `mobile/src/features/dashboard/DashboardScreen.tsx`
- `mobile/src/features/dashboard/BiometricProgressScreen.tsx`
- `mobile/src/features/profile/ProfileScreen.tsx`
- `mobile/src/features/profile/profileViewModel.ts`
- `mobile/__tests__/biometric-history-view-model.test.ts`
- `mobile/__tests__/biometric-chart-components.test.tsx`
- `mobile/__tests__/profile-view-model.test.ts`
- `docs/mobile/mobile_phase_9_training_preview_client_report.md`
- `docs/mobile/mobile_phase_c5c_complete_biometric_metrics_report.md`

## Restricciones respetadas

- Sin cambios de backend.
- Sin cambios de Supabase.
- Sin cambios de fórmulas ni ratios.
- Sin cambios de lógica SCD2.
- Sin commit, push ni Pull Request.
