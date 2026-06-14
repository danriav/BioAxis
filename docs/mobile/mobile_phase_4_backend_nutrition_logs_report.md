# Mobile Phase 4 Backend Report - nutrition daily logs

Fecha: 2026-06-10

## Objetivo

Crear un endpoint seguro para que Android pueda leer los alimentos registrados
de un dia, con macros resueltas, sin consultar Supabase directo desde mobile.

## Resultado

Implementado `GET /nutrition/logs?date=YYYY-MM-DD`.

- Requiere `Authorization: Bearer <access_token>`.
- Deriva `current_user_id` desde JWT Supabase.
- No acepta `user_id` en query ni body.
- Filtra `nutrition_logs` por `user_id = current_user_id` y
  `consumed_at = date`.
- Compone cada log con datos de `catalog_foods`.
- Devuelve items, totales diarios y agrupacion por comida.
- Si no hay registros, devuelve `200` con lista vacia y totales en `0`.
- Mantiene compatibilidad con endpoints actuales.

## Contrato

Request:

```http
GET /nutrition/logs?date=2026-06-10
Authorization: Bearer <Supabase JWT>
```

Response `200`:

```json
{
  "date": "2026-06-10",
  "items": [
    {
      "id": "log-uuid",
      "food_id": "food-uuid",
      "food_name": "Avena",
      "meal_slot": "desayuno",
      "quantity_g": 100.0,
      "consumed_at": "2026-06-10",
      "kcal": 389.0,
      "protein": 16.9,
      "carbs": 66.3,
      "fat": 6.9
    }
  ],
  "totals": {
    "kcal": 389.0,
    "protein": 16.9,
    "carbs": 66.3,
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

Errores esperados:

- `401`: sin token.
- `401`: token invalido o expirado.
- `422`: `date` ausente o invalida.
- `422`: `user_id` enviado por query/body.

## Seguridad

- El endpoint nunca usa `user_id` enviado por el cliente.
- La query a Supabase siempre agrega filtro por `current_user_id`.
- El contrato rechaza intentos de pasar `user_id` por query/body.
- No se agregaron logs que impriman JWT, service role ni datos sensibles.
- No se expone service role fuera del backend.

## Tests agregados

- JWT valido devuelve solo logs del usuario autenticado.
- Fecha sin logs devuelve `items: []` y totales `0`.
- Sin token devuelve `401`.
- Token invalido devuelve `401`.
- Query con `user_id` devuelve `422`.
- Body con `user_id` en GET devuelve `422`.
- Logs de otro usuario no aparecen.
- Calculo de macros por gramos y totales diarios correcto.

## Validacion

Comando especifico:

```text
C:\Users\Av_da\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m pytest tests/test_nutrition_auth.py
```

Resultado funcional: `23 passed`. El comando aislado no satisface el umbral
global de coverage porque ejecuta solo una parte de la suite.

Comando obligatorio completo:

```text
C:\Users\Av_da\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m pytest
```

Resultado: `157 passed`, coverage total `91.80%`.

## Auditoria de secrets

Archivos auditados:

- `backend/app/main.py`
- `backend/app/schemas/nutrition_api.py`
- `backend/tests/test_nutrition_auth.py`
- `docs/api.md`
- `docs/mobile/backend_mobile_readiness.md`
- `docs/mobile/android_mvp_architecture.md`

Resultado:

- Sin JWTs reales.
- Sin service-role keys reales.
- Sin API keys.
- Sin URLs de base de datos nuevas.

## Archivos modificados

- `backend/app/main.py`
- `backend/app/schemas/nutrition_api.py`
- `backend/tests/test_nutrition_auth.py`
- `docs/api.md`
- `docs/mobile/backend_mobile_readiness.md`
- `docs/mobile/android_mvp_architecture.md`
- `docs/mobile/mobile_phase_4_backend_nutrition_logs_report.md`

## Pendiente posterior

Para completar nutricion movil quedan fuera de esta fase:

- `DELETE /nutrition/logs/{log_id}`.
- `PATCH /nutrition/logs/{log_id}`.
- Migrar el frontend web para que deje de leer `nutrition_logs` directo.
