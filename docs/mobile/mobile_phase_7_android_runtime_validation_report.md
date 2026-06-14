# Mobile Phase 7 Report - Android nutrition runtime validation

Fecha: 2026-06-12

## Objetivo

Validar el flujo completo de nutricion en Android/Expo contra FastAPI local:
login Supabase, targets, logs, busqueda, alta, edicion y borrado de alimentos.

## Resultado del entorno actual

Validacion Android runtime real: bloqueada en este shell.

Bloqueadores observados:

- `adb` no esta disponible en PATH.
- `emulator` no esta disponible en PATH.
- FastAPI no estaba escuchando en `http://127.0.0.1:8000/docs`.
- Las credenciales sandbox de Supabase no estan comprometidas ni documentadas en
  el repositorio, por diseno.
- No se capturaron screenshots porque no hubo emulador Android accesible desde
  este entorno.

Validacion estatica/unitaria mobile: completada y verde.

## Variables Android Local

Para emulador Android:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
EXPO_PUBLIC_SUPABASE_URL=<supabase-sandbox-url-publica>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key-publica>
EXPO_PUBLIC_APP_ENV=local
```

`10.0.2.2` es obligatorio para el emulador Android cuando FastAPI corre en el
host. No usar `localhost` ni `127.0.0.1` dentro del emulador, porque apuntan al
propio dispositivo virtual.

Para dispositivo fisico en la misma red local:

```env
EXPO_PUBLIC_API_URL=http://<IP-LAN-DEL-HOST>:8000
EXPO_PUBLIC_SUPABASE_URL=<supabase-sandbox-url-publica>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key-publica>
EXPO_PUBLIC_APP_ENV=local
```

En esta maquina, `ipconfig` mostro como IP LAN candidata:

```text
192.168.0.74
```

Por tanto, para esta sesion local el valor esperado para dispositivo fisico
seria:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.74:8000
```

Si cambia la red, volver a ejecutar `ipconfig` y usar la IPv4 del adaptador
activo. El telefono y la PC deben estar en la misma red, y el firewall debe
permitir conexiones entrantes al puerto `8000`.

## Levantar FastAPI Local

Usar solo valores sandbox/locales en `backend/.env`. No copiar service role keys
a mobile ni a capturas.

```powershell
Set-Location C:\HealhTechEcosystem\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verificacion local esperada:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/docs | Select-Object StatusCode
```

Resultado esperado:

```text
StatusCode
----------
200
```

Resultado en esta ejecucion:

```text
No es posible conectar con el servidor remoto
```

Agente recomendado si persiste: Backend/Datos, porque el bloqueo ocurre antes de
Android y requiere FastAPI + Supabase sandbox activos.

## Ejecutar Expo En Android

Emulador Android:

```powershell
Set-Location C:\HealhTechEcosystem\mobile
Copy-Item .env.example .env.local
notepad .env.local
npm.cmd run android
```

Confirmar en `.env.local`:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
```

Dispositivo fisico:

```powershell
Set-Location C:\HealhTechEcosystem\mobile
Copy-Item .env.example .env.local
notepad .env.local
npm.cmd start
```

Confirmar en `.env.local`:

```env
EXPO_PUBLIC_API_URL=http://<IP-LAN-DEL-HOST>:8000
```

Abrir con Expo Go o dev client en el dispositivo. No capturar pantallas donde se
vean tokens, headers, contrasenas o datos sensibles.

## Checklist Manual Runtime

Antes de iniciar:

- FastAPI responde `200` en `/docs`.
- `.env.local` mobile usa `10.0.2.2` para emulador o IP LAN para dispositivo.
- Supabase URL y anon key publicas corresponden al sandbox.
- Existe usuario sandbox email/password disponible localmente, no en repo.

Pasos:

1. Abrir app Android desde Expo.
2. Pantalla login visible.
3. Iniciar sesion con usuario sandbox.
4. Confirmar navegacion a tabs autenticadas.
5. Abrir `Nutricion`.
6. Confirmar carga de `GET /nutrition/targets/me`.
7. Confirmar carga de `GET /nutrition/logs?date=YYYY-MM-DD`.
8. Cambiar a una fecha sin logs y confirmar estado vacio con totales en cero.
9. Abrir `Agregar alimento`.
10. Buscar `avena` o alimento existente en catalogo sandbox.
11. Confirmar resultados de busqueda.
12. Seleccionar alimento.
13. Elegir comida, por ejemplo `Desayuno`.
14. Ingresar gramos positivos, por ejemplo `100`.
15. Guardar alimento.
16. Confirmar mensaje de exito.
17. Confirmar que los totales se actualizan tras reload de logs.
18. Tocar `Editar` en el alimento registrado.
19. Cambiar comida, por ejemplo de `Desayuno` a `Cena`.
20. Cambiar gramos, por ejemplo `125`.
21. Guardar cambios.
22. Confirmar mensaje de exito.
23. Confirmar que los totales se actualizan tras reload.
24. Tocar `Borrar`.
25. Cancelar una vez para validar confirmacion.
26. Tocar `Borrar` de nuevo y confirmar.
27. Confirmar mensaje de exito.
28. Confirmar que los totales se actualizan tras reload.
29. Cerrar sesion desde perfil.
30. Confirmar regreso a login.

Resultados esperados:

- Ninguna request mobile envia `user_id`.
- Todas las requests protegidas usan `Authorization: Bearer <access_token>`.
- No se ven JWT, refresh tokens, service role keys ni passwords en logs.
- `401` muestra sesion expirada.
- `403` muestra permiso denegado.
- `404` muestra alimento no encontrado.
- `422` muestra solicitud rechazada.
- Backend apagado o red incorrecta muestra error de red.

## Evidencia Sanitizada

Comandos ejecutados:

```powershell
Get-Command adb,emulator,npx,npm.cmd -ErrorAction SilentlyContinue | Select-Object Name,Source
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/docs | Select-Object StatusCode
ipconfig
rg -n "console\.log|Authorization|refresh_token|access_token|JWT|Bearer" mobile\src mobile\app
npm.cmd run lint
npm.cmd test
npx.cmd tsc --noEmit
```

Resultados:

- `adb`: no encontrado.
- `emulator`: no encontrado.
- `npm.cmd`: disponible.
- `npx.ps1`: disponible, pero `npx.cmd` tambien ejecuto correctamente.
- FastAPI `/docs`: no conecto, backend no activo.
- `ipconfig`: IP LAN candidata `192.168.0.74`.
- Auditoria mobile logs/tokens: no hay `console.log`; solo construccion de
  `Authorization` en cliente API y tipos que referencian `access_token`.
- `npm.cmd run lint`: paso.
- `npm.cmd test`: paso, 8 suites y 57 tests.
- `npx.cmd tsc --noEmit`: paso.

## Bugs O Bloqueadores

1. Android runtime no ejecutable desde este entorno.
   - Evidencia: no hay `adb` ni `emulator` en PATH.
   - Agente recomendado: Mobile Android, con Android Studio/SDK instalado.

2. FastAPI local no estaba levantado.
   - Evidencia: `/docs` en `127.0.0.1:8000` no conecto.
   - Agente recomendado: Backend/Datos para levantar servicio con `.env`
     sandbox valido.

3. Login real no validado por falta de emulador y credenciales sandbox locales.
   - Evidencia: docs previas indican que no hay credenciales sandbox
     comprometidas en repo.
   - Agente recomendado: Auditor/Producto debe proveer credenciales sandbox por
     canal seguro local.

## Conclusiones

La app mobile esta lista a nivel cliente, tipos y pruebas para ejecutar el flujo
runtime. La validacion Android real queda pendiente por limitaciones del entorno
actual: sin Android tooling, sin backend activo y sin credenciales sandbox
locales disponibles para esta sesion.
