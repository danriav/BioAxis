# Mobile Phase 3 Backend Report - nutrition targets me

Fecha: 2026-06-10

## Objetivo

Crear un endpoint movil seguro para obtener targets nutricionales del usuario
autenticado sin aceptar `user_id` desde el cliente.

## Resultado

Implementado `GET /nutrition/targets/me`.

- Deriva identidad desde `Authorization: Bearer <access_token>`.
- Reutiliza la misma logica de calculo del endpoint legacy
  `GET /nutrition/targets/{user_id}`.
- No acepta `user_id` en path, query ni body.
- Mantiene compatibilidad con `GET /nutrition/targets/{user_id}` para web.
- Conserva `403` en el endpoint legacy cuando el path `user_id` no coincide con
  el usuario autenticado.

## Contrato

Request:

```http
GET /nutrition/targets/me
Authorization: Bearer <Supabase JWT>
```

Response `200`:

```json
{
  "kcal": 2100,
  "protein": 160,
  "carbs": 220,
  "fat": 70
}
```

Errores esperados:

- `401`: sin token.
- `401`: token invalido o expirado.
- `422`: `user_id` enviado por query/body en `/nutrition/targets/me`.
- `403`: solo aplica al endpoint legacy `/nutrition/targets/{user_id}` cuando
  se intenta acceder a otro usuario.

## Tests agregados

- `/nutrition/targets/me` con JWT valido devuelve targets.
- `/nutrition/targets/me` sin token devuelve `401`.
- `/nutrition/targets/me` con token invalido devuelve `401`.
- `/nutrition/targets/me?user_id=...` devuelve `422`.
- `/nutrition/targets/me` con body que contiene `user_id` devuelve `422`.
- Legacy `/nutrition/targets/{user_id}` sigue aceptando usuario propio y
  rechazando usuario ajeno con `403`.

## Validacion

Comando especifico:

```text
C:\Users\Av_da\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m pytest tests/test_nutrition_auth.py
```

Resultado funcional: `17 passed`. El comando aislado no satisface el umbral
global de coverage porque ejecuta solo una parte de la suite.

Comando obligatorio completo:

```text
C:\Users\Av_da\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m pytest
```

Resultado: `151 passed`, coverage total `91.80%`.

## Auditoria de secrets

Archivos auditados:

- `backend/app/main.py`
- `backend/tests/test_nutrition_auth.py`
- `docs/api.md`
- `docs/mobile/backend_mobile_readiness.md`
- `docs/mobile/android_mvp_architecture.md`

Resultado:

- No se agregaron JWTs reales.
- No se agregaron service-role keys reales.
- No se agregaron API keys.
- El unico valor con forma de credencial es `service-role-test-key`, usado como
  fixture falso en tests.

## Archivos modificados

- `backend/app/main.py`
- `backend/tests/test_nutrition_auth.py`
- `docs/api.md`
- `docs/mobile/backend_mobile_readiness.md`
- `docs/mobile/android_mvp_architecture.md`
- `docs/mobile/mobile_phase_3_backend_targets_me_report.md`

## Notas de compatibilidad

El frontend web puede seguir usando `/nutrition/targets/{user_id}`. La app movil
debe usar `/nutrition/targets/me` para evitar enviar identidad de usuario desde
el cliente.
