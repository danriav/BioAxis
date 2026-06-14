# Mobile Phase 5 Frontend Report - add food from Android

Fecha: 2026-06-12

## Objetivo

Permitir que Android busque alimentos y registre un alimento para la fecha
seleccionada usando endpoints FastAPI autenticados, sin consultar Supabase
directo para datos protegidos y sin enviar `user_id`.

## Archivos modificados

- `mobile/src/lib/api/client.ts`
- `mobile/src/lib/api/nutrition-foods.ts`
- `mobile/src/features/nutrition/addFoodViewModel.ts`
- `mobile/src/features/nutrition/NutritionScreen.tsx`
- `mobile/src/styles/theme.ts`
- `mobile/__tests__/nutrition-foods-client.test.ts`
- `mobile/__tests__/nutrition-add-food-view-model.test.ts`
- `docs/mobile/mobile_phase_5_add_food_client_report.md`

## Contratos consumidos

Busqueda:

```http
GET /nutrition/search?query=avena
Authorization: Bearer <access_token>
```

Registro:

```http
POST /nutrition/add-log
Authorization: Bearer <access_token>
Content-Type: application/json
```

Payload mobile aprobado:

```json
{
  "food_id": "food-uuid",
  "meal_slot": "desayuno",
  "quantity_g": 100,
  "target_date": "2026-06-12"
}
```

## Seguridad

- Mobile no envia `user_id` en query, body, path ni estado derivado.
- Si no hay sesion local, el cliente no ejecuta `fetch`.
- El JWT solo se adjunta como `Authorization: Bearer <access_token>`.
- No se imprime JWT, refresh token ni datos sensibles en logs.
- Los logs protegidos siguen viniendo de `GET /nutrition/logs?date=YYYY-MM-DD`.
- No se agregaron lecturas directas a Supabase para catalogo/logs protegidos.

## UI implementada

`NutritionScreen` ahora incluye un flujo "Agregar alimento":

- Abrir/cerrar formulario desde la pantalla de nutricion.
- Buscar alimento por texto.
- Mostrar busqueda vacia, loading, error y resultados.
- Seleccionar alimento del catalogo.
- Elegir comida: desayuno, comida, cena o snacks.
- Ingresar cantidad en gramos.
- Guardar registro.
- Refrescar `GET /nutrition/logs?date=YYYY-MM-DD` al guardar correctamente.

## Estados cubiertos

| Estado | Comportamiento |
| --- | --- |
| Sin sesion | No llama backend y muestra sesion no disponible. |
| Busqueda vacia | No llama backend y pide escribir alimento. |
| Loading busqueda | Deshabilita accion mientras busca. |
| Error busqueda | Muestra mensaje mapeado del cliente API. |
| Guardando | Deshabilita accion mientras registra. |
| Guardado exitoso | Muestra confirmacion y recarga logs diarios. |
| `401` | `session_expired`. |
| `403` | `forbidden`. |
| `422` | `validation_error`. |
| Red/backend apagado | `network_error`. |

## Tests agregados

- `searchNutritionFoods` llama `/nutrition/search?query=` sin `user_id`.
- `searchNutritionFoods` adjunta `Authorization`.
- `searchNutritionFoods` no llama backend sin sesion.
- `addNutritionLog` manda solo `food_id`, `meal_slot`, `quantity_g`,
  `target_date`.
- `addNutritionLog` adjunta `Authorization`.
- `addNutritionLog` no llama backend sin sesion.
- `401`, `403`, `422` y red se mapean al estado mobile esperado.
- El view model valida cantidad positiva.
- Despues de guardar se llama `reloadLogs`.
- Guardado invalido no llama backend ni recarga.

## Validacion ejecutada

```powershell
cd mobile
npm.cmd run lint
npm.cmd test
npx.cmd tsc --noEmit
```

Resultados:

- `npm.cmd run lint`: paso.
- `npm.cmd test`: paso, 7 suites y 36 tests.
- `npx.cmd tsc --noEmit`: paso.

Nota de entorno: `npm run lint` con el shim `npm.ps1` fue bloqueado por la
politica local de PowerShell. Se ejecuto `npm.cmd`, equivalente en Windows.

## Fuera de alcance

- Editar alimentos registrados.
- Borrar alimentos registrados.
- Favoritos o alimentos personalizados.
- Cambios backend.
- Cambios frontend web.
- IA o generacion de rutinas.
