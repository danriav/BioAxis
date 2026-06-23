# Mobile Phase C5A Biometric History API Report

Fecha: 2026-06-18

## Resultado

Se implemento `GET /profile/history` como fuente backend autenticada y de solo
lectura para evolucion biometrica.

El endpoint:

- Deriva identidad exclusivamente del JWT Supabase.
- Consulta `dim_atleta` con `user_id` del usuario autenticado.
- Solicita solo columnas necesarias y ordena por `valid_from` ascendente.
- No devuelve `user_id` ni `biometria_id`.
- No modifica filas ni el flujo SCD2.
- Rechaza `user_id` en query, headers y body.
- Devuelve errores de Supabase sanitizados sin detalles internos.

## Contrato

Respuesta con historial:

```text
status=ready
count=<numero de registros propios>
entries=<historial cronologico normalizado>
```

Respuesta sin historial:

```text
status=empty
count=0
entries=[]
```

Los contratos `MobileBiometricHistoryEntry` y
`MobileBiometricHistoryResponse` usan Pydantic estricto con
`extra="forbid"`.

## Ratios

- Mujer: `ratio_simetria = hombros / cadera`.
- Mujer: `ratio_curvatura = cintura / cadera`.
- Hombre: `ratio_simetria = hombros / cintura`.
- Hombre: `ratio_curvatura = null`.
- Denominadores no positivos o medidas incompletas producen `null`.
- Los ratios se redondean a dos decimales.

## Seguridad Verificada En Tests

- JWT ausente, invalido y expirado: `401`.
- `user_id` en query, header o body: `422`.
- Filas de otro usuario no aparecen.
- La respuesta no contiene `user_id` ni `biometria_id`.
- Un error de Supabase devuelve `502` controlado.
- No se imprimen medidas ni respuestas completas en logs.

## Gates

- Suite backend completa: 203 pruebas pasaron.
- Coverage total: 93.50%.
- Ruff/lint: no existe configuracion Ruff en el repositorio; `git diff --check`
  paso sin errores.
- Docker runtime: el servicio Compose real
  `healhtechecosystem-backend-1` fue reconstruido y recreado con
  `docker compose up -d --build --force-recreate backend`.
- Contenedor activo: creado el `2026-06-18T20:42:11.880526341Z`, estado
  `running`, con el puerto host `8000` publicado hacia el puerto `8000` del
  contenedor.
- OpenAPI: `GET http://127.0.0.1:8000/openapi.json` devolvio `HTTP 200` y
  contiene `/profile/history`.
- Solicitud anonima: `GET /profile/history` devolvio `HTTP 401`.
- JWT sandbox real: validado el 2026-06-18 mediante un archivo local temporal
  ignorado por Git. El token no se imprimio ni se incorporo al reporte.
- `GET /profile/me`: `HTTP 200`, `status=ready`, `has_profile=true`.
- `GET /profile/history`: `HTTP 200`, `status=ready`, `count=21`.
- Consistencia de contrato: `count` coincide con la cantidad de elementos en
  `entries`.

La evidencia autenticada registrada se limita a:

```text
status=ready
count=21
```

No se registro el token ni el contenido de `entries`. El archivo temporal se
elimino al terminar la validacion.

## Configuracion Docker

El archivo local e ignorado `backend/.env` fue normalizado sin exponer otras
variables:

```text
GEMINI_TIMEOUT_SECONDS=8
GEMINI_MAX_RETRIES=2
```

Ambos valores quedaron sin comillas. No se uso una imagen ni un contenedor
alterno para la validacion.

## Datos Sensibles

Este reporte no contiene JWT, service role key, refresh tokens, correos reales
ni biometria completa de usuarios runtime.
