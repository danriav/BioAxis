# Mobile Phase 4 Frontend Report - nutrition daily logs client

Fecha: 2026-06-12

## Objetivo

Conectar la pantalla mobile de nutricion al endpoint real:

```http
GET /nutrition/logs?date=YYYY-MM-DD
Authorization: Bearer <Supabase JWT>
```

La lectura diaria de consumos ya no debe depender de datos mock ni de queries
directas a Supabase desde mobile.

## Archivos modificados

- `mobile/src/lib/api/nutrition-logs.ts`
- `mobile/src/features/nutrition/useNutritionLogs.ts`
- `mobile/src/features/nutrition/NutritionScreen.tsx`
- `mobile/src/lib/api/client.ts`
- `mobile/__tests__/nutrition-logs-client.test.ts`
- `mobile/__tests__/nutrition-targets-view.test.ts`

## Contrato consumido

Request:

```http
GET /nutrition/logs?date=2026-06-12
Authorization: Bearer <access_token>
```

Reglas de seguridad del cliente:

- El cliente mobile solo envia `date`.
- No se envia `user_id` en query, body ni estado derivado.
- Si no hay sesion local, el cliente no llama `fetch`.
- El JWT solo se adjunta en `Authorization`.
- No se imprime JWT en logs.

Response esperado:

```json
{
  "date": "2026-06-12",
  "items": [
    {
      "id": "log-uuid",
      "food_id": "food-uuid",
      "food_name": "Avena",
      "meal_slot": "desayuno",
      "quantity_g": 100,
      "consumed_at": "2026-06-12",
      "kcal": 389,
      "protein": 16.9,
      "carbs": 66,
      "fat": 6.9
    }
  ],
  "totals": {
    "kcal": 389,
    "protein": 16.9,
    "carbs": 66,
    "fat": 6.9
  },
  "meals": {
    "desayuno": [],
    "comida": [],
    "cena": [],
    "snacks": []
  }
}
```

Dia vacio:

```json
{
  "date": "2026-06-12",
  "items": [],
  "totals": {
    "kcal": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0
  },
  "meals": {
    "desayuno": [],
    "comida": [],
    "cena": [],
    "snacks": []
  }
}
```

## UI implementada

La pantalla `NutritionScreen` ahora muestra:

- Estado de fecha actual en formato `YYYY-MM-DD`.
- Acciones simples: dia anterior, hoy, dia siguiente.
- Calorias consumidas del dia.
- Proteina, carbohidratos y grasas consumidas.
- Objetivos diarios separados desde `/nutrition/targets/me`.
- Estado vacio amable cuando `items` llega vacio.
- Alimentos agrupados por comida cuando `meals` llega con items.
- Boton de recarga que actualiza logs diarios y targets.

## Separacion de responsabilidades

- `/nutrition/logs?date=YYYY-MM-DD` se usa solo para consumo real del dia.
- `/nutrition/targets/me` se mantiene solo para objetivos diarios.
- La pantalla compone ambas fuentes sin mezclar calculos de targets con logs.

## Estados manejados

| Estado | Comportamiento UI |
| --- | --- |
| Sin sesion | No llama backend; muestra sesion no disponible. |
| Loading | Muestra cards de carga para consumo y objetivos. |
| Dia vacio | Muestra `0 kcal`, `0 g` macros y mensaje para registrar comida. |
| Logs reales | Muestra totales del backend y grupos por comida. |
| `401` | Muestra sesion expirada. |
| `403` | Muestra permiso denegado. |
| `422` | Muestra solicitud rechazada. |
| Network/backend apagado | Muestra error de red recuperable. |

## Tests agregados

- Cliente llama `/nutrition/logs?date=YYYY-MM-DD`.
- Cliente adjunta `Authorization: Bearer <token>`.
- Cliente no llama backend sin sesion.
- Cliente no envia `user_id`.
- Dia vacio devuelve totales en cero.
- `401` mapea a `session_expired`.
- `422` mapea a `validation_error`.
- Error de red mapea a `network_error`.
- View model renderiza totales consumidos.
- View model renderiza dia vacio en cero.
- View model agrupa comidas desde `meals`.
- Helpers de fecha mantienen `YYYY-MM-DD`.

## Validacion esperada

Comandos obligatorios:

```powershell
cd mobile
npm run lint
npm test
npx tsc --noEmit
```

## Pendiente fuera de alcance

- Agregar alimento desde mobile.
- Editar/borrar logs.
- Calendario mensual.
- Persistencia offline.
- Modificar backend.
- Cambiar IA o rutinas.
