# Mobile Phase 6 Frontend Report - edit and delete logged foods

Fecha: 2026-06-12

## Objetivo

Permitir que Android edite y borre alimentos registrados usando endpoints
FastAPI autenticados, sin consultar Supabase directo y sin enviar `user_id`.

## Archivos modificados

- `mobile/src/lib/api/client.ts`
- `mobile/src/lib/api/nutrition-foods.ts`
- `mobile/src/features/nutrition/addFoodViewModel.ts`
- `mobile/src/features/nutrition/editFoodLogViewModel.ts`
- `mobile/src/features/nutrition/NutritionScreen.tsx`
- `mobile/src/features/nutrition/useNutritionLogs.ts`
- `mobile/src/features/nutrition/useNutritionTargets.ts`
- `mobile/__tests__/nutrition-foods-client.test.ts`
- `mobile/__tests__/nutrition-edit-food-view-model.test.ts`
- `docs/mobile/mobile_phase_6_edit_delete_food_client_report.md`

## Contratos consumidos

Editar:

```http
PATCH /nutrition/logs/log-uuid
Authorization: Bearer <access_token>
Content-Type: application/json
```

Payload mobile:

```json
{
  "meal_slot": "cena",
  "quantity_g": 125,
  "target_date": "2026-06-12"
}
```

Borrar:

```http
DELETE /nutrition/logs/log-uuid
Authorization: Bearer <access_token>
```

## Seguridad

- PATCH solo envia `meal_slot`, `quantity_g` y `target_date`.
- DELETE no envia body.
- Mobile no envia `user_id` en query, body, path ni estado derivado.
- Si no hay sesion local, el cliente no ejecuta `fetch`.
- El token solo se adjunta en `Authorization`.
- No se agregaron lecturas directas a Supabase para logs protegidos.
- No se imprimen JWT, refresh tokens ni datos sensibles.

## UI implementada

En cada alimento registrado de `NutritionScreen`:

- Boton `Editar`.
- Edicion inline de comida.
- Edicion inline de gramos.
- Boton `Guardar cambios`.
- Boton `Borrar`.
- Confirmacion simple antes de borrar.
- Estado global de exito o error para mutaciones.

Despues de PATCH o DELETE exitoso:

- Se llama `reload` de `GET /nutrition/logs?date=YYYY-MM-DD`.
- Se conserva la fecha seleccionada.
- Se muestran mensajes de exito.

## Estados cubiertos

| Estado | Comportamiento |
| --- | --- |
| Sin sesion | No llama backend y muestra sesion no disponible. |
| Guardando edicion | Deshabilita la accion y muestra `Guardando`. |
| Borrando | Deshabilita la accion y muestra `Borrando`. |
| `401` | `session_expired`. |
| `403` | `forbidden`. |
| `404` | `not_found`. |
| `422` | `validation_error`. |
| Red/backend apagado | `network_error`. |

## Tests agregados

- PATCH llama `/nutrition/logs/{log_id}`.
- PATCH manda payload aprobado sin `user_id`.
- DELETE llama `/nutrition/logs/{log_id}`.
- DELETE no manda `user_id`.
- `Authorization` se adjunta en PATCH y DELETE.
- Sin sesion no llama backend.
- `401`, `403`, `404`, `422` y red se mapean correctamente.
- Cantidad invalida no llama backend.
- Despues de PATCH exitoso se llama `reloadLogs`.
- Despues de DELETE exitoso se llama `reloadLogs`.

## Validacion ejecutada

```powershell
cd mobile
npm.cmd run lint
npm.cmd test
npx.cmd tsc --noEmit
```

Resultados:

- `npm.cmd run lint`: paso.
- `npm.cmd test`: paso, 8 suites y 57 tests.
- `npx.cmd tsc --noEmit`: paso.

## Fuera de alcance

- Cambios backend.
- Cambios frontend web.
- Favoritos.
- Alimentos personalizados.
- Rutinas o IA.
- Redisenar toda la pantalla.
