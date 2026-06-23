# Mobile Fase C5B - Progresión biométrica real en Android

Fecha: 2026-06-18  
Estado: implementación, paridad web/móvil, pruebas, validación Android y evidencia aprobadas.

## Resultado

Mobile consume `GET /profile/history` mediante el cliente autenticado existente y presenta la evolución biométrica real del atleta en Dashboard y en una vista detallada.

No se envía `user_id`. La identidad se deriva exclusivamente del JWT utilizado por el cliente API. El historial permanece en memoria durante la sesión de pantalla y no se persiste ni se imprime en logs.

## Paridad con análisis web

La iteración final replica en Android el análisis biométrico presente en web, adaptado a bloques verticales móviles:

- Gráfico conjunto de `Simetría` y `Curvatura`.
- Simetría en cyan.
- Curvatura en rosa, con trazo discontinuo.
- Valores actuales de hombros, cintura y cadera.
- `X-Frame Index` con valor actual y meta `1.00`.
- `Hourglass Ratio` con valor actual y meta `0.70`, solo cuando aplica.
- Balance de extremidades como diferencia brazo–pantorrilla.
- Acceso visible a `Progresión detallada`.
- Acción visible para `Registrar nueva biometría`.

No se comprimió la distribución desktop en una sola pantalla. La información se separó en bloques verticales con scroll natural y gráficos de altura estable.

No se encontraron capturas web adicionales versionadas en el workspace. La referencia se contrastó contra la implementación web disponible en:

- `frontend/src/components/dashboard/evolution-chart.tsx`
- `frontend/src/components/dashboard/perimeter-analytics.tsx`
- `frontend/src/app/[locale]/dashboard/page.tsx`
- `frontend/src/app/[locale]/dashboard/metrics/page.tsx`

## Cliente y contrato

Se agregó el cliente:

- `mobile/src/lib/api/profile-history.ts`

Modela:

- `status`: `ready` o `empty`.
- `count`.
- `entries`.
- Medidas opcionales.
- Ratios opcionales.
- Fecha de registro y estado actual.

La solicitud es:

```text
GET /profile/history
Authorization: Bearer <sesión Supabase>
```

No incluye query, body, headers auxiliares ni campos con `user_id`.

## Normalización para presentación

`biometricHistoryViewModel.ts`:

- Ordena defensivamente las entradas por `recorded_at` ascendente.
- Verifica la consistencia entre `count` y la cantidad de entradas.
- Filtra valores `null`, no numéricos o no finitos por serie.
- Calcula tendencias de presentación sin modificar fórmulas backend.
- Formatea fechas, medidas y ratios.
- Mantiene separadas las series de peso, cintura, cadera, hombros, simetría y curvatura.

No se recalculan `ratio_simetria` ni `ratio_curvatura`; Mobile consume los valores aprobados por C5A.

## Dashboard

El bloque anterior de último perfil biométrico fue reemplazado por una tarjeta de análisis real:

- Cantidad de registros.
- Gráfico cronológico conjunto de simetría y curvatura.
- Fechas inicial y final.
- Hombros, cintura y cadera actuales.
- X-Frame actual frente a meta.
- Hourglass actual frente a meta cuando aplica.
- Balance de extremidades.
- Acceso a la vista detallada.
- Acción para registrar nueva biometría.

La carga del historial es independiente de Perfil, Nutrición y Entrenamiento. Un error de `/profile/history` muestra reintento únicamente en el bloque de progresión y no derriba el resto del Dashboard.

## Vista detallada

La ruta `biometric-progress` presenta:

- Conteo total y periodo.
- Selector horizontal de métricas.
- Gráfica cronológica.
- Valor actual y rango.
- Tendencia desde el primer registro.
- Timeline del registro más antiguo al más reciente.

Métricas:

- Peso.
- Glúteo.
- Pierna.
- Pantorrilla.
- Cintura.
- Cadera.
- Hombros.
- Pecho.
- Brazo.
- Antebrazo.
- Ratio de simetría.
- Ratio de curvatura.

Cuando una medida o ratio no aplica, la serie se muestra vacía con un mensaje claro. Esto cubre, entre otros casos, `ratio_curvatura = null` para hombres.

## Estados

Dashboard y detalle contemplan:

- Cargando.
- Historial listo.
- Historial vacío.
- Historial insuficiente para evolución.
- Error de red o backend.
- Token ausente.
- Sesión expirada.
- Reintento manual.

## Gráficas Android

`BiometricLineChart` usa `react-native-svg`, dependencia ya presente en el proyecto.

La gráfica:

- Limita su ancho al espacio disponible.
- Mantiene padding interno.
- Escala puntos dentro del área dibujable.
- Reduce las etiquetas visibles a inicio y fin para evitar solapamientos.
- Tolera una sola observación y series vacías.
- Conserva tabs con desplazamiento horizontal en pantallas pequeñas.
- Renderiza el gráfico conjunto sin solapar leyenda, puntos ni fechas.

Se validó a:

- `1080x2400`, densidad `420`.
- `720x1280`, densidad `280`.

El emulador se restauró a `1080x2400`, densidad `420`, al finalizar.

## Pruebas

La cobertura agregada incluye:

- Respuesta `status=ready` con varios registros.
- Respuesta `status=empty`.
- Solicitud autenticada sin `user_id`.
- Token ausente.
- Token expirado.
- Error de red.
- Orden cronológico.
- Conteo consistente e inconsistente.
- Valores nulos en medidas.
- Valores nulos en ratios.
- Curvatura vacía para hombre.
- Mujer con simetría y curvatura.
- Un solo registro como evolución insuficiente.
- Múltiples registros.
- Veinte o más registros.
- Fechas repetidas.
- Selector completo del laboratorio móvil.
- Metas web de X-Frame y Hourglass.
- Balance de extremidades.
- Cálculo de tendencia de presentación.
- Formato de medidas y ratios.
- Layout dentro de una pantalla Android pequeña.

## Validación Android real

La sesión sandbox autenticada devolvió:

```text
status=ready
count=21
```

Se verificó que el Dashboard y la vista detallada utilizan esos 21 registros. No se registró el JWT ni el contenido de `entries` en logs o documentación.

## Evidencia sanitizada

- `docs/mobile/visual-audit-captures/c5b-dashboard-history.png`
- `docs/mobile/visual-audit-captures/c5b-biometric-detail.png`
- `docs/mobile/visual-audit-captures/c5b-dashboard-720x1280.png`
- `docs/mobile/visual-audit-captures/c5b-detail-720x1280.png`
- `docs/mobile/visual-audit-captures/c5b-dashboard-analysis.png`
- `docs/mobile/visual-audit-captures/c5b-laboratory.png`
- `docs/mobile/visual-audit-captures/c5b-dashboard-analysis-720x1280.png`
- `docs/mobile/visual-audit-captures/c5b-dashboard-analysis-720x1280-lower.png`

Las capturas muestran únicamente la UI solicitada. No incluyen correo, UUID, JWT, tokens ni identificadores internos.

## Gates

- `npm.cmd test -- --runInBand`: aprobado, 16 suites y 148 tests.
- `npm.cmd run lint`: aprobado.
- `npx.cmd tsc --noEmit`: aprobado.

## Archivos principales

- `mobile/src/lib/api/profile-history.ts`
- `mobile/src/features/dashboard/biometricHistoryViewModel.ts`
- `mobile/src/components/BiometricLineChart.tsx`
- `mobile/src/components/BiometricRatioChart.tsx`
- `mobile/src/features/dashboard/DashboardScreen.tsx`
- `mobile/src/features/dashboard/BiometricProgressScreen.tsx`
- `mobile/app/biometric-progress.tsx`
- `mobile/__tests__/profile-history-client.test.ts`
- `mobile/__tests__/biometric-history-view-model.test.ts`

## Restricciones

- Sin cambios de backend.
- Sin cambios de Supabase.
- Sin cambios de fórmulas de ratios.
- Sin cambios de esquema.
- Sin cambios de lógica SCD2.
- Sin commit, push ni Pull Request.
