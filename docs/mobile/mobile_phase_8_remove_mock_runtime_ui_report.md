# Mobile Phase 8 Report - remove mock runtime UI

Fecha: 2026-06-12

## Objetivo

Eliminar textos mock visibles en Android y reemplazarlos por datos reales
disponibles o estados MVP honestos, sin prometer funcionalidad no implementada.

## Archivos modificados

- `mobile/src/features/dashboard/DashboardScreen.tsx`
- `mobile/src/features/workout/WorkoutScreen.tsx`
- `mobile/src/features/nutrition/NutritionScreen.tsx`
- `mobile/src/features/nutrition/addFoodViewModel.ts`
- `mobile/src/features/nutrition/useNutritionLogs.ts`
- `mobile/src/features/profile/ProfileScreen.tsx`
- `mobile/src/features/auth/AuthProvider.tsx`
- `mobile/src/features/auth/LoginScreen.tsx`
- `mobile/src/components/Screen.tsx`
- `mobile/app/(tabs)/_layout.tsx`
- `mobile/__tests__/nutrition-targets-view.test.ts`
- `docs/mobile/mobile_phase_8_remove_mock_runtime_ui_report.md`

## Dashboard

Se quitaron textos visibles:

- `Vista autenticada mock`
- `Sesion mock`
- `Sin datos reales`

La pantalla ahora muestra:

- Estado real de sesión.
- Fecha actual.
- Estado de nutrición cuando targets/logs cargan correctamente.
- Estado honesto `Resumen en preparación` si todavía no hay resumen completo.
- Acceso rápido a `Nutrición`.

No se creó endpoint nuevo de dashboard y no se promete una funcionalidad que no
existe.

## Entrenamiento

Se quitaron textos visibles:

- `Kalos mock`
- `Placeholder`
- Contrato técnico `POST /training/kalos/preview`

La pantalla ahora muestra un estado MVP:

- `Rutinas en preparación`.
- Mensaje de que el generador Kalos estará disponible en mobile cuando el flujo
  sea aprobado.

No se agregó llamada backend de entrenamiento en esta fase.

## Nutrición

Se mantuvo la integración actual:

- Targets.
- Logs diarios.
- Buscar alimento.
- Agregar alimento.
- Editar alimento.
- Borrar alimento.

Se corrigieron textos visibles con acentos:

- `Nutricion` -> `Nutrición`.
- `Sesion` -> `Sesión`.
- `dia` -> `día`.
- `Calorias` -> `Calorías`.
- `Proteina` -> `Proteína`.

Tambien se aumento el padding inferior de `Screen` para reducir riesgo de que
el contenido quede tapado por la tab inferior.

## Perfil

Se mantiene el email visible en app para identificar la cuenta activa. El
reporte no incluye capturas ni emails reales.

Se corrigieron textos:

- `Sesión Supabase activa`.
- `Cerrar sesión`.

## Auditoría De Texto Y Secretos

Comandos ejecutados:

```powershell
rg -n "mock|Kalos mock|Sin datos reales|Placeholder|Sesion mock" mobile\src mobile\app
rg -n "Nutricion|Sesion|sesion|Calorias|Proteina|proteina" mobile\src mobile\app
rg -n "console\.log|refresh_token|service_role|SUPABASE_SERVICE|JWT|Bearer" mobile\src mobile\app
```

Resultados:

- No quedaron textos mock visibles en `mobile/src` ni `mobile/app`.
- No quedaron los textos principales sin acento buscados.
- No hay `console.log` ni referencias a refresh tokens o service role en UI.
- La unica aparicion de `Bearer` es la construccion del header en el cliente API.

## Pruebas Actualizadas

Se actualizaron expectativas de `nutrition-targets-view.test.ts` para los nuevos
labels con acentos:

- `Calorías objetivo`.
- `Proteína`.
- `Calorías consumidas`.
- `Proteína consumida`.

## Validación Ejecutada

```powershell
cd mobile
npm.cmd run lint
npm.cmd test -- --runInBand
npx.cmd tsc --noEmit
```

Resultados:

- `npm.cmd run lint`: pasó.
- `npm.cmd test -- --runInBand`: pasó, 8 suites y 57 tests.
- `npx.cmd tsc --noEmit`: pasó.

## Límites Respetados

- No se implementó generación de entrenamiento.
- No se modificó backend.
- No se tocó frontend web.
- No se cambió Auth.
- No se agregaron capturas ni emails reales a documentación.
