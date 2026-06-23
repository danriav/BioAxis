# Mobile Fase C1 - Rediseño visual de Nutrición y navegación

Fecha: 2026-06-17  
Estado: aprobado en código, gates y validación Android.

## Alcance implementado

- Se amplió el tema mobile con colores semánticos, superficies, tipografía, espaciado, radios, sombras y estados visuales.
- La navegación inferior reemplazó `D`, `N`, `E` y `P` por iconos Lucide con etiqueta textual y estado activo.
- Nutrición conserva los clientes, hooks, endpoints, payloads y cálculos existentes.
- El resumen diario usa un contador circular para calorías y barras separadas para proteína, carbohidratos y grasas.
- El selector de fecha quedó compacto y accesible.
- Los logs se agrupan por comida con totales, acciones de alta, edición y borrado.
- El estado vacío incluye un CTA directo.
- Alta y edición usan un bottom sheet; la tab bar se oculta mientras está abierto.
- El contenido deja espacio inferior para el CTA y la navegación.

## Contratos conservados

- `GET /nutrition/targets/me`
- `GET /nutrition/logs?date=YYYY-MM-DD`
- `GET /nutrition/search?query=<texto>`
- `POST /nutrition/add-log`
- `PATCH /nutrition/logs/{log_id}`
- `DELETE /nutrition/logs/{log_id}`

No se modificaron payloads, autenticación, Supabase, backend, base de datos ni cálculos. Mobile sigue sin enviar `user_id`.

## Estados cubiertos

| Estado | Resultado |
| --- | --- |
| Con datos | Validado en Pixel 6 con objetivos reales y un alimento sandbox. |
| Vacío | Validado en Pixel 6 con resumen en cero y CTA accionable. |
| Carga | Indicador y mensaje dedicados implementados para targets/logs. |
| Error | Panel con mensaje y acción `Intentar de nuevo`; conserva el mapeo existente. |
| Guardando | Botón deshabilitado e indicador visible. |
| Alta/edición | Bottom sheet validado; navegación inferior oculta durante el formulario. |

## Validación Android

- Dispositivo: `emulator-5554`, perfil Pixel 6.
- Resolución física: `1080x2400`, densidad `420`.
- Backend local: `http://127.0.0.1:8000/docs`, respuesta `200`.
- Expo/Metro: `http://127.0.0.1:8081/status`, `packager-status:running`.
- Se validó navegación, resumen, lista de comidas, estado vacío, modal de alta y modal de edición.
- Se simuló una pantalla reducida con `720x1280`, densidad `320`; el resumen cambió a disposición vertical sin cortes.
- El emulador se restauró a resolución y densidad físicas después de la prueba.

## Evidencia sanitizada

Antes:

- `docs/mobile/visual-audit-captures/mobile_nutrition.png`

Después:

- `docs/mobile/visual-audit-captures/c1-nutrition-summary.png`
- `docs/mobile/visual-audit-captures/c1-nutrition-meals.png`
- `docs/mobile/visual-audit-captures/c1-modal-final.png`
- `docs/mobile/visual-audit-captures/c1-small-nutrition2.png`

Las capturas no incluyen correo, JWT, refresh token, UUID ni biometría.

## Pruebas

Se agregó cobertura de componentes visuales para:

- Semántica accesible del progreso circular.
- Separación entre consumo y objetivo de macros.
- Valores accesibles de progreso.

Resultado final:

- `npm.cmd run lint`: aprobado.
- `npm.cmd test -- --runInBand`: aprobado, 14 suites y 103 tests.
- `npx.cmd tsc --noEmit`: aprobado.

## Archivos principales

- `mobile/src/styles/theme.ts`
- `mobile/app/(tabs)/_layout.tsx`
- `mobile/src/components/CircularProgress.tsx`
- `mobile/src/components/MacroProgressBar.tsx`
- `mobile/src/features/nutrition/NutritionScreen.tsx`
- `mobile/__tests__/nutrition-visual-components.test.tsx`

## Observaciones

- Expo Go muestra una advertencia de deprecación de `SafeAreaView` originada en pantallas anteriores. Nutrición ya usa `react-native-safe-area-context`; el cambio global de las demás pantallas queda fuera de esta fase.
- `npm install` reportó vulnerabilidades preexistentes/transitivas del árbol de dependencias. No se ejecutó `npm audit fix` para evitar cambios ajenos al alcance.
- No se hizo commit, push ni Pull Request.
