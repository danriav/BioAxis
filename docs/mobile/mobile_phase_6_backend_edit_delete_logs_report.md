# Mobile Phase 6 Backend Report - edit and delete nutrition logs

Fecha: 2026-06-12

## Objetivo

Permitir que mobile edite y borre alimentos registrados sin consultar Supabase
directo, manteniendo aislamiento por usuario y sin aceptar `user_id` desde el
cliente.

## Resultado

Implementados:

- `PATCH /nutrition/logs/{log_id}`
- `DELETE /nutrition/logs/{log_id}`

Ambos endpoints:

- Requieren `Authorization: Bearer <Supabase JWT>`.
- Derivan `current_user_id` desde el JWT.
- Filtran por `id = log_id` y `user_id = current_user_id`.
- Rechazan `user_id` en query/body con `422`.
- Devuelven `404` si el log no existe o pertenece a otro usuario.
- No imprimen JWT, service role ni payloads sensibles.

## Contrato PATCH

Request:

```http
PATCH /nutrition/logs/log-uuid
Authorization: Bearer <Supabase JWT>
Content-Type: application/json
```

Body permitido:

```json
{
  "meal_slot": "cena",
  "quantity_g": 125.0,
  "target_date": "2026-06-12"
}
```

Campos editables:

- `meal_slot`: string no vacio.
- `quantity_g`: numero mayor a `0`.
- `target_date`: fecha ISO `YYYY-MM-DD`.
- `consumed_at`: fecha ISO `YYYY-MM-DD`.

Reglas:

- No acepta campos extra.
- No acepta `user_id`.
- No acepta `target_date` y `consumed_at` al mismo tiempo.
- Requiere al menos un campo editable.

Response `200`:

```json
{
  "id": "log-uuid",
  "food_id": "food-uuid",
  "meal_slot": "cena",
  "quantity_g": 125.0,
  "consumed_at": "2026-06-12"
}
```

## Contrato DELETE

Request:

```http
DELETE /nutrition/logs/log-uuid
Authorization: Bearer <Supabase JWT>
```

Response `200`:

```json
{
  "status": "success",
  "deleted_id": "log-uuid"
}
```

## Errores

- `401`: sin token.
- `401`: token invalido o expirado.
- `404`: log inexistente.
- `404`: log de otro usuario.
- `422`: `user_id` enviado por query/body.
- `422`: PATCH con `quantity_g <= 0`.
- `422`: PATCH con `meal_slot` vacio.
- `422`: PATCH con campos extra.

## Tests agregados

- PATCH valido actualiza solo log propio.
- DELETE valido borra solo log propio.
- PATCH/DELETE sin token devuelve `401`.
- PATCH/DELETE con token invalido devuelve `401`.
- PATCH/DELETE de log ajeno devuelve `404`.
- PATCH/DELETE inexistente devuelve `404`.
- PATCH con `user_id` en body devuelve `422`.
- PATCH/DELETE con `user_id` en query devuelve `422`.
- PATCH con `quantity_g <= 0` devuelve `422`.
- PATCH con `meal_slot` vacio devuelve `422`.
- PATCH con campos extra devuelve `422`.

## Validacion

Comando especifico:

```text
C:\Users\Av_da\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m pytest tests/test_nutrition_auth.py
```

Resultado funcional: `41 passed`. El comando aislado no satisface el umbral
global de coverage porque ejecuta solo una parte de la suite.

Comando obligatorio completo:

```text
C:\Users\Av_da\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m pytest
```

Resultado: `175 passed`, coverage total `91.80%`.

## Auditoria de secrets

Archivos auditados:

- `backend/app/main.py`
- `backend/app/schemas/nutrition_api.py`
- `backend/tests/test_nutrition_auth.py`
- `docs/api.md`
- `docs/mobile/backend_mobile_readiness.md`

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
- `docs/mobile/mobile_phase_6_backend_edit_delete_logs_report.md`

## Pendiente posterior

- Actualizar mobile para consumir PATCH/DELETE.
- Migrar frontend web para dejar de borrar `nutrition_logs` directo desde
  Supabase.
