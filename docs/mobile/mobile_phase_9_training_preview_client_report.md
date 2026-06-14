# Mobile Phase 9 Report - Kalos training preview client

Fecha: 2026-06-12

## Objetivo

Conectar Android al preview real de entrenamiento Kalos con
`POST /training/kalos/preview`, sin persistir rutina, sin enviar `user_id` y sin
llamar IA directamente desde mobile.

## Archivos modificados

- `mobile/src/lib/api/training-preview.ts`
- `mobile/src/features/workout/trainingPreviewViewModel.ts`
- `mobile/src/features/workout/WorkoutScreen.tsx`
- `mobile/__tests__/training-preview-client.test.ts`
- `mobile/__tests__/training-preview-view-model.test.ts`
- `docs/mobile/mobile_phase_9_training_preview_client_report.md`

## Cliente Mobile

Se agrego `postTrainingPreview` para:

```http
POST /training/kalos/preview
Authorization: Bearer <access_token>
Content-Type: application/json
```

Payload aprobado desde mobile:

```json
{
  "days_per_week": 4,
  "goal": "hypertrophy",
  "priority": "balanced",
  "experience": "intermediate",
  "time_budget_minutes": 75,
  "available_equipment": ["barbell", "dumbbell", "machine", "cable", "bodyweight", "bench"],
  "constraints": {}
}
```

Seguridad:

- No se envia `user_id` en body, query, path ni estado derivado.
- Sin sesion local, el cliente no llama backend.
- El JWT solo viaja en `Authorization`.
- No se persiste el preview.

## UI Entrenamiento

La pantalla `Entrenamiento` ahora permite configurar:

- Dias por semana.
- Tiempo por sesion.
- Objetivo.
- Prioridad.
- Experiencia.

Defaults:

- 4 dias.
- 75 minutos.
- Hipertrofia.
- Balanceado.
- Intermedio.

Al presionar `Generar preview`, Android llama al endpoint autenticado y muestra
el resultado separado por dia.

## Render Del Preview

La UI muestra:

- Selector `Dia 1`, `Dia 2`, etc.
- Nombre de sesion.
- Musculos objetivo.
- Duracion estimada.
- Fatiga.
- Ejercicios del dia seleccionado.

Cada ejercicio muestra:

- Nombre.
- Grupo muscular.
- Equipo.
- Sets.
- Reps.
- RIR.
- Descanso.

El view model expone `getSelectedTrainingSession`, por lo que la pantalla renderiza
solo el dia seleccionado en lugar de una lista unica gigante.

## Estados Cubiertos

| Estado | Comportamiento |
| --- | --- |
| Sin sesion | No llama backend; error `missing_session`. |
| Loading | Boton muestra `Generando` y queda deshabilitado. |
| Preview generado | Mensaje de exito y sesiones por dia. |
| `401` | `session_expired`. |
| `403` | `forbidden`. |
| `422` | `validation_error`. |
| Red/backend apagado | `network_error`. |

## Tests Agregados

- Cliente llama `/training/kalos/preview`.
- Cliente adjunta `Authorization`.
- Cliente no envia `user_id`.
- Sin sesion no llama backend.
- `401`, `403`, `422` y red se mapean correctamente.
- View model construye payload aprobado sin `user_id`.
- View model ordena sesiones por dia.
- View model devuelve solo el dia seleccionado.

## Auditoria De Secretos

Comandos:

```powershell
rg -n "user_id" mobile\src\lib\api\training-preview.ts mobile\src\features\workout mobile\__tests__\training-preview-client.test.ts mobile\__tests__\training-preview-view-model.test.ts
rg -n "console\.log|refresh_token|service_role|SUPABASE_SERVICE|JWT|Bearer" mobile\src\features\workout mobile\src\lib\api\training-preview.ts
rg -n "Ã|Â|�" mobile\src\features\workout mobile\src\lib\api\training-preview.ts mobile\__tests__\training-preview-client.test.ts mobile\__tests__\training-preview-view-model.test.ts
```

Resultado:

- `user_id` solo aparece en tests como asercion de ausencia.
- No hay `console.log`, refresh tokens, service role ni JWT impresos en los
  archivos nuevos.
- No se detecto mojibake en los archivos nuevos/tocados de entrenamiento.

## Validacion Ejecutada

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

## Limites Respetados

- No se implemento guardado de rutina.
- No se implemento historial.
- No se modifico backend.
- No se toco frontend web.
- No se toco nutricion.
- No se llamo IA directamente desde mobile.
