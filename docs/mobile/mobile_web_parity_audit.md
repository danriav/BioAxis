# Mobile Web Parity Audit

Fecha: 2026-06-14

## Objetivo

Comparar la funcionalidad web actual de Kalos contra la app Android/Expo y
definir que falta implementar para que mobile alcance la funcionalidad principal
sin inventar features nuevas ni modificar backend.

## Fuentes Revisadas

- Web: `/login`, `/onboarding`, `/dashboard`, `/dashboard/metrics`,
  `/dashboard/update`, `/nutrition`, `/workout`, `/profile/setup`, `/api/chat`.
- Mobile: `Login`, `Dashboard`, `Nutricion`, `Entrenamiento`, `Perfil`.
- Backend observado: endpoints FastAPI actuales de nutricion y entrenamiento
  Kalos preview/substitute.

## Resumen Ejecutivo

Mobile ya cubre el nucleo autenticado minimo:

- Login con Supabase Auth.
- Persistencia de sesion mobile con almacenamiento seguro cuando
  `expo-secure-store` esta disponible.
- Nutricion diaria por endpoints FastAPI autenticados:
  targets, logs, busqueda, alta, edicion y borrado.
- Preview Kalos por FastAPI autenticado sin persistencia.
- Navegacion autenticada por tabs: Dashboard, Nutricion, Entrenamiento, Perfil.

La paridad principal aun falta en cuatro areas:

- UI mobile para perfil/onboarding biometrico y actualizacion de medidas.
- Dashboard y metricas corporales reales.
- Entrenamiento completo mas alla del preview: sustitucion de ejercicios,
  modo manual, registro y persistencia aprobada.
- Chat/IA, que hoy existe en web como ruta Next `/api/chat` con Gemini, pero
  no existe como contrato backend mobile aprobado.

## Tabla De Paridad

| Web Feature | Existe en Mobile | Falta | Prioridad |
| --- | --- | --- | --- |
| `/login`: login con email/password Supabase y redireccion a dashboard | Parcial | Mobile tiene login sandbox y guardado de sesion, pero no flujo de registro/onboarding desde login ni copy final equivalente | Alta |
| `/onboarding`: formulario BioForm multi-step | No | Backend ya expone `POST /profile/setup`; falta UI mobile | Critica |
| `/profile/setup`: configuracion de biotipo con BioForm | No | Backend ya expone `GET /profile/me`, `POST /profile/setup` y `POST /profile/measurements`; falta pantalla mobile | Critica |
| `/dashboard`: resumen con nombre, biometria actual, ratios, evolucion, macros, links a metricas/update/nutricion | Parcial | Mobile solo muestra sesion, fecha y estado de nutricion; faltan biometria, ratios, historial, nombre de perfil, accesos a metricas/update | Alta |
| `/dashboard/metrics`: laboratorio Bioaxis, historial por metrica y delta | No | Pantalla mobile de metricas corporales con historial y seleccion de metrica | Alta |
| `/dashboard/update`: nuevo registro biometrico | No | Pantalla mobile para actualizar peso/perimetros y guardar nueva medicion | Critica |
| `/nutrition`: plan diario, targets, consumo, buscar/agregar alimento | Si, y en algunos puntos mobile esta mas alineado a backend | Mobile ya tiene lectura, busqueda, alta, edicion y borrado por FastAPI; revisar UX visual frente a web, calendario semanal y copy | Media |
| `/nutrition`: borrar alimentos | Si | Mobile borra por FastAPI; web borra directo en Supabase | Media |
| `/workout`: Preview Kalos | Parcial | Mobile genera preview por dia; falta resumen de quality checks, input summary, split/program name y ajuste visual equivalente | Alta |
| `/workout`: sustitucion de ejercicio Kalos | No | Mobile no consume `/training/kalos/substitute`; falta UI de cambiar ejercicio | Alta |
| `/workout`: modo Arquitecto manual | No | Mobile no tiene constructor manual, busqueda de ejercicios, dias editables, parametros por ejercicio ni persistencia local | Media |
| `/workout`: registrar entrenamiento manual | No | Falta contrato mobile seguro para registrar entrenamiento sin Supabase directo ni user_id | Alta |
| `/api/chat`: Bio-Copiloto web | No | No hay cliente ni pantalla mobile; tampoco contrato FastAPI mobile aprobado | Baja/Condicional |
| Perfil mobile: email y cerrar sesion | Parcial | Web no tiene una pagina perfil simple equivalente; mobile no muestra ni edita biotipo | Alta |

## Gaps De Backend Necesarios

### Perfil y Onboarding Biometrico

La web guarda y consulta `dim_atleta` y `user_profiles` directo desde Supabase.
Mobile no debe hacer eso para datos protegidos. Backend ya expone contratos
FastAPI autenticados que derivan `user_id` del token:

- `GET /profile/me`
  - Devuelve nombre/display_name, perfil base y biometria actual.
- `POST /profile/setup`
  - Crea perfil inicial y primera medicion.
  - No acepta `user_id`.
  - Incluye campos equivalentes a BioForm: nombre, genero, fecha_nacimiento o
    edad calculada, altura, peso, perimetros, objetivo_metabolico.
- `POST /profile/measurements`
  - Crea nuevo registro biometrico SCD2 para update.
  - No acepta `user_id`.

Pendiente backend posterior:

- `GET /athlete/measurements/history`
  - Devuelve historial ordenado para dashboard y metricas.

`user_profiles` queda fuera de esta fase backend; `display_name` se acepta en
setup y se devuelve en la respuesta inmediata, pero la sincronizacion persistida
con `user_profiles` requiere contrato posterior para no romper la web actual.

### Dashboard y Metricas

La web calcula ratios y deltas en cliente leyendo historial de `dim_atleta`.
Para mobile conviene un contrato dedicado:

- `GET /dashboard/me`
  - Snapshot actual: display_name, peso, objetivo, fecha, ratios, macros
    actuales y flags de datos insuficientes.
- `GET /dashboard/metrics`
  - Serie historica normalizada por metrica.
  - Deltas primer/ultimo registro.
  - Estados empty/loading/error claros.

### Entrenamiento

Backend ya expone:

- `POST /training/kalos/preview`.
- `POST /training/kalos/substitute`.

Mobile solo usa preview. Para paridad con web faltan:

- Cliente/UI mobile para `POST /training/kalos/substitute`.
- Contrato backend seguro para entrenamiento manual y registro, porque web hoy
  inserta en Supabase directo:
  - `GET /training/exercises`
  - `POST /training/workouts`
  - Opcional posterior: `GET /training/workouts?date=...`

### Chat/IA

Web usa una ruta Next local:

- `POST /api/chat`

Para mobile no debe llamarse Gemini directo ni depender de una ruta Next web.
Si se aprueba Chat/IA en mobile, hace falta contrato backend autenticado:

- `POST /chat`
  - Sanitiza entrada.
  - Aplica limites/rate limit.
  - No expone API keys.
  - Define si requiere contexto de usuario y que datos puede usar.

## Gaps De UI/UX

### Login

- Mobile existe, pero esta orientado a sandbox.
- Falta acceso claro a onboarding/perfil setup cuando el usuario no tiene
  biotipo.
- Falta copy final equivalente al producto web sin exponer tecnicismos.

### Onboarding / Perfil

- No existe flujo mobile de BioForm.
- Faltan pasos:
  - bienvenida,
  - estructura base,
  - medidas corporales,
  - objetivo nutricional,
  - validacion biometrica,
  - guardado y redireccion.
- Faltan estados mobile: perfil incompleto, guardando, validacion local,
  sesion expirada, 403, 422, backend apagado.

### Dashboard

- Mobile tiene resumen MVP, no dashboard biometrico.
- Faltan:
  - display name,
  - biometria actual,
  - ratios X-Frame/Hourglass,
  - balance de extremidades,
  - resumen de macros conectado a biometria,
  - CTA para actualizar medidas,
  - CTA a metricas detalladas.

### Metricas

- No existe pantalla mobile de laboratorio.
- Faltan selector de metrica, historial, delta neto, empty state y detalle por
  medida.
- En mobile se debe adaptar a pantalla chica con controles nativos y no copiar
  directamente el layout desktop.

### Nutricion

- Mobile tiene funcionalidad principal mas completa y segura que la web actual
  para logs protegidos.
- Gaps de paridad visual:
  - calendario semanal tipo web,
  - mejor agrupacion por comidas,
  - resumen de progreso visual,
  - estados empty mas pulidos.
- No se identifican gaps funcionales criticos frente al alcance actual.

### Entrenamiento

- Mobile tiene preview basico funcional.
- Faltan frente a web:
  - quality checks visibles,
  - resumen del input generado,
  - nombre del programa/split,
  - boton Ajustar/reset,
  - sustitucion de ejercicios,
  - modo manual Arquitecto,
  - busqueda de ejercicios,
  - edicion de sets/reps/RIR/descanso/notas,
  - registro de entrenamiento.

### Perfil

- Mobile solo muestra cuenta y cerrar sesion.
- Falta:
  - estado de perfil biometrico,
  - editar/completar biotipo,
  - enlace a historial/metricas,
  - no mostrar datos sensibles en reportes/capturas.

### Chat

- No existe UI mobile.
- Si se aprueba, hace falta pantalla o widget mobile con estados: loading,
  error, rate limit, sesion expirada y respuesta vacia.

## Gaps De Navegacion

Mobile actual:

- `/login`
- `/(tabs)/dashboard`
- `/(tabs)/nutrition`
- `/(tabs)/workout`
- `/(tabs)/profile`

Rutas/pantallas mobile faltantes para paridad:

- `/onboarding` o `/profile/setup`
- `/dashboard/metrics`
- `/dashboard/update`
- `/workout/manual` o tab interna Arquitecto
- `/chat` o entrada desde Dashboard/Perfil

Reglas de navegacion recomendadas:

- Si no hay sesion: redirigir a login.
- Si hay sesion pero no hay perfil biometrico: redirigir o sugerir setup sin
  bloquear nutricion si backend ya puede responder con defaults seguros.
- Si el perfil esta incompleto: mostrar CTA "Completar perfil" en Dashboard y
  Perfil.
- Mantener tabs principales estables: Dashboard, Nutricion, Entrenamiento,
  Perfil.
- Evitar rutas inaccesibles por headers/tabs y cubrir back/cancel en formularios.

## Gaps De Seguridad Y Autenticacion

Fortalezas mobile actuales:

- Usa Supabase Auth para sesion.
- Adjunta `Authorization: Bearer <access_token>` en clientes FastAPI.
- El cliente API corta requests cuando falta sesion.
- Para tokens usa `expo-secure-store` cuando esta disponible.
- Nutricion y preview no envian `user_id`.

Riesgos/gaps:

- `secureSessionStorage` cae a AsyncStorage si SecureStore no esta disponible.
  Para produccion Android se debe tratar como degradacion controlada y
  documentada; no usar almacenamiento inseguro en builds productivos.
- Mobile no debe replicar el patron web de leer/escribir `dim_atleta`,
  `nutrition_logs`, `exercises` o `fact_entrenamientos` directo desde Supabase.
- Perfil/biometria ya tiene endpoints backend base; faltan historial de
  mediciones, dashboard y entrenamiento manual para cerrar paridad completa.
- Chat mobile no debe llamar Gemini directo ni exponer API keys.
- Los reportes/capturas no deben incluir correo, tokens ni biometria sensible.
- Web actual contiene rutas que pasan `user.id` a servicios o hacen filtros
  Supabase por `user_id`; mobile debe evitar ese patron y derivar identidad en
  backend.

## Propuesta De Fases

### Fase A: Perfil/onboarding biometrico

Objetivo: permitir que mobile cree y complete el biotipo sin Supabase directo.

Tareas backend requeridas:

- Hecho: `GET /profile/me`.
- Hecho: `POST /profile/setup`.
- Hecho: `POST /profile/measurements`.
- Pendiente posterior: historial de mediciones para dashboard/metrica.

Tareas mobile:

- Pantalla onboarding/setup multi-step.
- Cliente API de perfil/biometria.
- Validacion local de campos requeridos.
- Estados loading/error/empty/sesion expirada/422.
- CTA desde Login, Dashboard y Perfil.
- Tests de payload sin `user_id`, auth header y validaciones.

### Fase B: Dashboard biometrico

Objetivo: reemplazar resumen MVP por dashboard con datos reales.

Tareas backend requeridas:

- `GET /dashboard/me` o equivalente.
- Incluir snapshot actual, ratios, objetivo, macros y flags de datos
  insuficientes.

Tareas mobile:

- View model de dashboard.
- Cards de biometria actual.
- Ratios y balance de extremidades.
- CTA a Nutricion, Metricas y Actualizar medidas.
- Estados sin perfil, loading, error, sesion expirada.

### Fase C: Metricas/analisis corporal

Objetivo: portar laboratorio Bioaxis a mobile con historial real.

Tareas backend requeridas:

- `GET /athlete/measurements/history` o `GET /dashboard/metrics`.
- Normalizar series y deltas.

Tareas mobile:

- Pantalla de metricas.
- Selector de metrica.
- Grafica o lista historica mobile-first.
- Detalle de delta primer/ultimo.
- Empty state cuando no hay historial suficiente.
- Tests de transformacion de series.

### Fase D: Entrenamiento completo

Objetivo: acercar mobile al centro de entrenamiento web sin persistir rutinas
hasta que exista contrato aprobado.

Subfase D1: enriquecer preview

- Mostrar nombre de programa, split, summary y quality checks.
- Agregar ajustar/reset.
- Mantener no persistencia.

Subfase D2: sustitucion de ejercicios

- Cliente `POST /training/kalos/substitute`.
- UI "Cambiar" por ejercicio.
- Estados substituting, 401, 403, 422, network.
- Tests de Authorization y payload sin `user_id`.

Subfase D3: modo manual y registro

- Requiere backend seguro para catalogo y registro.
- No usar Supabase directo desde mobile.
- Implementar constructor por dia, busqueda, sets/reps/RIR/descanso/notas.
- Registrar entrenamiento via endpoint autenticado.

### Fase E: Chat/IA si aplica

Objetivo: portar Bio-Copiloto solo si hay aprobacion de producto/seguridad.

Tareas backend requeridas:

- Endpoint autenticado o explicitamente anonimo con limites.
- Proxy server-side a proveedor IA.
- Sanitizacion, rate limit y manejo de errores.
- Politica de contexto: que datos del usuario puede usar.

Tareas mobile:

- Pantalla/widget de chat.
- Cliente API.
- Estados loading/error/empty.
- No guardar ni loggear respuestas sensibles.
- Tests de no exponer API keys y no llamar IA directa.

## Riesgos Y Bloqueadores

| Riesgo/Bloqueador | Impacto | Agente recomendado |
| --- | --- | --- |
| Falta cliente mobile para consumir endpoints de perfil/onboarding | Bloquea Fase A visual, pero backend base ya existe | Mobile |
| No hay endpoints FastAPI para historial de mediciones/dashboard | Bloquea Fase B y C | Backend/Datos |
| Web usa Supabase directo para biometria, nutrition logs en parte y entrenamiento manual | Mobile no puede copiar ese patron por seguridad | Auditor + Backend/Datos |
| No hay contrato mobile para registrar entrenamiento manual | Bloquea paridad del modo Arquitecto | Backend/Datos |
| Chat web depende de Next `/api/chat` y API key server-side web | Mobile no tiene contrato seguro aprobado | Auditor + Backend/IA |
| Fallback de SecureStore a AsyncStorage | Riesgo si se permite en produccion Android | Mobile + Seguridad |
| Codificacion visible con caracteres rotos en varios textos web/mobile | Degrada UX y puede afectar snapshots/documentacion | Frontend/Mobile |
| Layout web desktop no es portable directamente a Android | Riesgo de UI saturada si se copia sin adaptacion | Mobile UI/UX |

## Conclusiones

Mobile esta adelantado en seguridad de nutricion y ya tiene preview Kalos real,
pero esta atrasado en el eje biometrico que alimenta la experiencia principal de
Kalos. La ruta critica para paridad no es UI primero: es aprobar contratos
backend autenticados para perfil, mediciones, dashboard y entrenamiento manual.

Orden recomendado:

1. Fase A: Perfil/onboarding biometrico.
2. Fase B: Dashboard biometrico.
3. Fase C: Metricas/analisis corporal.
4. Fase D: Entrenamiento completo.
5. Fase E: Chat/IA, solo si hay aprobacion explicita.
