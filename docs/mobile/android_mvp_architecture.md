# Android MVP Mobile Architecture

## Objetivo

Preparar la incorporacion de una app movil Android para Kalos usando Expo y
React Native sin afectar el backend FastAPI ni el frontend web existentes.

Este documento es una propuesta tecnica. No crea codigo funcional, no cambia
contratos de API y no modifica rutas actuales de `backend/` o `frontend/`.

## Estructura Recomendada

La app movil debe vivir en un directorio aislado:

```text
mobile/
  app/
    _layout.tsx
    index.tsx
    login.tsx
    dashboard.tsx
    nutrition/
    workout/
  src/
    components/
    features/
      auth/
      dashboard/
      nutrition/
      workout/
    lib/
      api/
      env/
      supabase/
    navigation/
    styles/
    types/
  assets/
  __tests__/
  app.config.ts
  babel.config.js
  eslint.config.mjs
  package.json
  tsconfig.json
  .env.example
```

Notas:

- `mobile/` debe ser un paquete separado para evitar acoplar dependencias web
  de Next.js con React Native.
- `mobile/app/` asume Expo Router.
- `mobile/src/features/` agrupa logica por dominio.
- `mobile/src/lib/api/` contiene clientes HTTP hacia FastAPI.
- `mobile/src/lib/supabase/` contiene el cliente Supabase Auth para React
  Native.
- `mobile/.env` y `mobile/.env.local` deben ser locales e ignorados por Git.

## Scripts Propuestos

En `mobile/package.json`:

```json
{
  "scripts": {
    "dev": "expo start",
    "android": "expo run:android",
    "build": "eas build --platform android",
    "lint": "eslint .",
    "test": "jest"
  }
}
```

Uso esperado:

```powershell
cd mobile
npm run dev
npm run android
npm run lint
npm run test
npm run build
```

Para la fase inicial, `build` puede quedar documentado aunque EAS no este
configurado todavia. La compuerta minima de Fase 1 debe ser `npm run lint` y
`npm run test` si existen tests.

## Dependencias Propuestas

Base Expo:

```powershell
npx create-expo-app mobile --template
```

Dependencias esperadas:

```powershell
cd mobile
npm install @supabase/supabase-js
npm install expo-secure-store react-native-url-polyfill
npm install @tanstack/react-query
npm install zod
npm install -D jest jest-expo eslint typescript
```

Dependencias opcionales por fase:

- `expo-router`: navegacion por archivos.
- `expo-constants`: lectura de configuracion publica de Expo.
- `@react-native-async-storage/async-storage`: cache no sensible.
- `react-hook-form`: formularios.
- `@testing-library/react-native`: pruebas de componentes.

No se deben instalar dependencias moviles en `frontend/`.

## Variables De Entorno

La app movil debe usar su propio archivo ejemplo:

```text
mobile/.env.example
```

Variables propuestas:

```text
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
EXPO_PUBLIC_SUPABASE_URL=https://example.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=replace-with-supabase-anon-key
EXPO_PUBLIC_APP_ENV=local
```

Reglas:

- Solo variables publicas deben llevar prefijo `EXPO_PUBLIC_`.
- No guardar `SUPABASE_SERVICE_ROLE_KEY` en mobile.
- No guardar `GEMINI_API_KEY` en mobile.
- No guardar tokens de usuario en `.env`.
- `mobile/.env`, `mobile/.env.local` y variantes reales deben estar ignoradas.
- El token de sesion debe vivir en almacenamiento seguro del dispositivo.

Para Android emulator, `127.0.0.1` apunta al dispositivo/emulador, no al host.
Cuando el backend FastAPI corra en el host local, usar:

```text
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
```

Para dispositivo fisico en la misma red, usar la IP LAN del equipo host:

```text
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000
```

## Conexion Con Backend FastAPI

La app movil debe consumir los endpoints existentes del backend mediante HTTP.

Cliente recomendado:

- Crear `mobile/src/lib/api/client.ts`.
- Leer `EXPO_PUBLIC_API_URL`.
- Adjuntar `Authorization: Bearer <access_token>` cuando exista sesion.
- Centralizar manejo de `401`, `403`, `422` y errores de red.

Ejemplo conceptual:

```text
GET /nutrition/search
GET /nutrition/logs?date=YYYY-MM-DD
POST /nutrition/sync-day
POST /nutrition/add-log
GET /nutrition/targets/me
POST /training/kalos/preview
```

Criterios:

- La app movil no debe construir queries directas a tablas Supabase para datos
  de negocio protegidos.
- Las operaciones protegidas deben pasar por FastAPI.
- El contrato movil recomendado para targets nutricionales es
  `GET /nutrition/targets/me`, derivando identidad desde el bearer token. Este
  endpoint esta disponible en FastAPI y rechaza `user_id` enviado por query o
  body.
- `GET /nutrition/targets/{user_id}` queda solo como endpoint legacy/web actual
  y no debe usarse como patron nuevo para mobile.
- El backend conserva validacion de bearer y ownership.
- CORS no aplica igual que en web, pero el backend debe seguir aceptando
  clientes HTTP autenticados.

## Conexion Con Supabase Auth

La app movil puede usar `@supabase/supabase-js` con storage compatible React
Native.

Estrategia:

- Usar `EXPO_PUBLIC_SUPABASE_URL`.
- Usar `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Persistir sesion con storage seguro.
- Escuchar cambios de auth para actualizar estado global.
- Enviar `session.access_token` al backend FastAPI.

Recomendacion:

- Tokens sensibles: `expo-secure-store`.
- Estado de sesion derivado: React Context o TanStack Query.
- No exponer service-role key.

## Codigo Compartido Con Frontend Web

Se puede compartir:

- Tipos de contratos API puros.
- Validadores Zod compartidos si no dependen de DOM/Next.
- Constantes de dominio.
- Transformadores puros.
- Fixtures de tests.
- Documentacion de contratos.

Debe separarse:

- Componentes UI web basados en DOM, Next.js o Tailwind web.
- Rutas Next.js.
- Server Actions.
- Clientes Supabase especificos de Next.
- Uso de `localStorage` web.
- Dependencias de navegador como `window`, `document`, cookies web o middleware
  Next.

Opcion futura:

```text
packages/
  contracts/
  domain/
```

No crear `packages/` en Fase 1 salvo que el Auditor apruebe mover contratos a
un paquete compartido. Para el MVP, es aceptable duplicar pocos tipos si reduce
riesgo.

## Riesgos De Monorepo

Dependencias:

- Next.js y Expo tienen cadenas de React/Babel/Metro distintas.
- Instalar paquetes moviles en `frontend/` puede romper build web.
- Instalar paquetes web en `mobile/` puede romper Metro.

TypeScript:

- `tsconfig` de mobile debe ser independiente.
- Evitar paths globales que mezclen `frontend/src` y `mobile/src`.
- Compartir tipos solo desde un paquete estable o copias controladas.

Rutas:

- Next usa `frontend/src/app`.
- Expo Router usa `mobile/app`.
- No mezclar convenciones de routing.

Variables de entorno:

- Web usa `NEXT_PUBLIC_*`.
- Mobile usa `EXPO_PUBLIC_*`.
- Backend usa variables privadas.
- Nunca reutilizar `.env` raiz con secretos para mobile.

Build:

- `npm run build` en frontend no debe depender de `mobile/`.
- `eas build` no debe leer secretos backend.
- Artefactos Android deben quedar fuera del repo.

Git:

- Ignorar `mobile/.env*` excepto `mobile/.env.example`.
- Ignorar builds locales: `mobile/android/`, `mobile/.expo/`,
  `mobile/dist/`, `*.apk`, `*.aab`.
- No versionar caches de Metro, Expo o Gradle.

## Plan Incremental

### Fase 1: Boot De App Movil

Objetivo:

- Crear `mobile/` con Expo.
- Confirmar que arranca en Expo Go o emulador Android.
- Configurar TypeScript, lint y test base.

Comandos propuestos:

```powershell
npx create-expo-app mobile --template
cd mobile
npm run dev
npm run lint
npm run test
```

Criterios de aceptacion:

- `mobile/` compila sin afectar `frontend/`.
- `frontend npm run build` sigue pasando.
- `backend python -m pytest` sigue pasando.
- `.env.example` movil existe y no contiene valores reales.

### Fase 2: Login Y Sesion

Objetivo:

- Implementar login Supabase Auth.
- Persistir sesion de forma segura.
- Exponer access token al cliente FastAPI.

Dependencias:

```powershell
npm install @supabase/supabase-js expo-secure-store react-native-url-polyfill
```

Criterios de aceptacion:

- Usuario sandbox puede iniciar sesion.
- Token no se imprime en logs.
- Logout limpia sesion.
- Un endpoint protegido responde con bearer valido.

### Fase 3: Dashboard Basico

Objetivo:

- Mostrar pantalla inicial autenticada.
- Cargar datos minimos desde backend.
- Manejar estados loading/error/empty.

Criterios de aceptacion:

- Usuario sin sesion vuelve a login.
- Usuario con sesion entra al dashboard.
- Errores `401` fuerzan re-login.

### Fase 4: Nutricion

Objetivo:

- Consumir endpoints de nutricion existentes.
- Permitir busqueda y registro basico si el contrato backend ya esta aprobado.

Criterios de aceptacion:

- Requests usan bearer.
- No se escribe directo a Supabase desde mobile para datos protegidos.
- `422` y `403` muestran mensajes controlados.

### Fase 5: Entrenamiento

Objetivo:

- Consumir `POST /training/kalos/preview`.
- Renderizar sesiones y ejercicios.
- Mantener preview sin persistencia hasta que exista contrato aprobado de
  guardado.

Criterios de aceptacion:

- Payload no incluye `user_id`.
- Request incluye `Authorization: Bearer`.
- Respuesta `kalos_training_plan.v1` renderiza sesiones/ejercicios.
- Caso `422` muestra mensaje claro.
- No se persiste rutina desde preview.

### Fase 6: Build Android

Objetivo:

- Configurar EAS Build para Android.
- Generar build interno o preview.

Comandos propuestos:

```powershell
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

Criterios de aceptacion:

- Build Android genera artefacto instalable.
- No contiene secretos privados.
- Configuracion de entorno se inyecta desde EAS secrets o profiles seguros.
- README movil documenta instalacion y arranque.

## Compuertas Antes De Merge

Antes de mergear cualquier Fase:

```powershell
cd backend
python -m pytest

cd ../frontend
npm run build

cd ../mobile
npm run lint
npm run test
```

Para Fase 6:

```powershell
cd mobile
npm run build
```

El merge solo debe prepararse cuando:

- Auditor apruebe arquitectura.
- Tests backend pasen.
- Build frontend pase.
- Lint/test mobile pasen.
- No existan secretos ni env reales staged.
- No existan artefactos Android staged.

## Criterios De Aceptacion Del Documento

- Define estructura recomendada bajo `mobile/`.
- Define scripts `dev`, `android`, `build`, `lint`, `test`.
- Define estrategia de variables de entorno movil.
- Define conexion con FastAPI.
- Define conexion con Supabase Auth.
- Define codigo compartible y codigo separado.
- Enumera riesgos de monorepo.
- Incluye plan incremental de Fase 1 a Fase 6.
- Incluye comandos, dependencias y criterios de aceptacion.
