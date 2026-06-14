# Mobile UI/UX Plan - Kalos Android

Fecha: 2026-06-10

## Objetivo

Definir la experiencia movil Android de Kalos para Expo / React Native antes de
implementar pantallas. Este documento cubre navegacion, alcance MVP,
adaptacion visual, estados de UI, diferencias contra web y riesgos de
usabilidad.

No crea codigo, no cambia endpoints, no modifica backend, no cambia contratos
API y no sustituye la arquitectura tecnica descrita en
`docs/mobile/android_mvp_architecture.md`.

## Principios de producto movil

- La app movil debe sentirse como una herramienta diaria, rapida y clara.
- La primera pantalla autenticada debe responder: que hago hoy, como voy y que
  falta registrar.
- La informacion debe mostrarse por bloques cortos. Evitar trasladar paneles
  web completos a una pantalla vertical.
- Las acciones primarias deben quedar al alcance del pulgar: registrar comida,
  generar preview, cambiar ejercicio y guardar perfil.
- No mostrar datos sensibles en logs, toasts tecnicos o errores sin control.
- Mantener Kalos como marca publica. BioAxis debe quedar solo como nombre
  tecnico interno si aun existe en codigo/documentacion.

## Navegacion principal movil

### Estructura propuesta con Expo Router

```text
mobile/app/
  _layout.tsx
  (auth)/
    login.tsx
    register.tsx
  (onboarding)/
    profile.tsx
    biometrics.tsx
    nutrition-goal.tsx
  (tabs)/
    _layout.tsx
    dashboard.tsx
    nutrition.tsx
    workout.tsx
    profile.tsx
```

### Flujo de entrada

1. Usuario sin sesion:
   - `Login`
   - `Register` si se habilita alta desde mobile.
2. Usuario con sesion pero sin perfil minimo:
   - `Onboarding/perfil`.
   - Captura de datos minimos necesarios para targets y preview Kalos.
3. Usuario con sesion y perfil listo:
   - `Dashboard`.

### Bottom tabs

La navegacion autenticada debe usar bottom tabs:

| Tab | Pantalla | Intencion |
| --- | --- | --- |
| Inicio | Dashboard | Resumen diario compacto y accesos rapidos. |
| Nutricion | Nutricion | Buscar alimentos, registrar comidas y revisar targets. |
| Entreno | Entrenamiento | Preview Kalos, rutina por dia y cambios de ejercicio. |
| Perfil | Perfil/ajustes | Datos personales, objetivos, sesion y preferencias. |

Reglas:

- No usar sidebar en mobile.
- El tab activo debe ser evidente por icono + label.
- Mantener labels cortos: `Inicio`, `Nutricion`, `Entreno`, `Perfil`.
- Evitar mas de 4 tabs en MVP Android.
- Acciones contextuales como `Agregar comida` o `Cambiar ejercicio` viven
  dentro de la pantalla, no como tabs globales.

## Pantallas MVP Android

### 1. Login

MVP:

- Email y password.
- Estado de carga al iniciar sesion.
- Error controlado para credenciales invalidas o sesion expirada.
- Link a registro si el producto lo permite.
- Recuperacion de password puede ser post-MVP si no esta priorizada.

Wireframe textual:

```text
[Kalos]
Tu progreso fisico, medido con precision

[Email]
[Password]

[Ingresar]

Crear cuenta
```

### 2. Onboarding / perfil

MVP:

- Datos basicos: nombre visible, sexo/genero si el motor lo requiere,
  estatura, peso, edad o fecha de nacimiento segun contrato final.
- Metricas corporales necesarias para ratios si ya estan disponibles:
  hombros, cintura, cadera u otras definidas por backend.
- Objetivo nutricional.
- Dias por semana y tiempo por sesion como preferencias iniciales.
- Validacion de rangos logicos antes de guardar.

Post-MVP:

- Edicion guiada por pasos avanzados.
- Fotos o analisis visual.
- Historial completo de perfil.
- Recomendaciones explicativas por metrica.

### 3. Dashboard

MVP:

- Saludo corto.
- Calorias del dia y macros compactos.
- Estado de nutricion: registrado / faltante.
- Acceso directo a `Nutricion`.
- Acceso directo a `Entreno`.
- Estado de perfil incompleto si aplica.

Post-MVP:

- Graficas historicas.
- Analisis bio-estetico completo.
- Streaks, metas semanales y widgets configurables.

Wireframe textual:

```text
Hola, Laura

[Resumen hoy]
Calorias  1,240 / 1,850
Proteina  82 / 122g
Carbs     120 / 167g
Grasas    38 / 55g

[Entreno de hoy]
Preview Kalos listo
[Ver rutina]

[Registrar comida]
```

### 4. Nutricion

MVP:

- Selector de dia compacto.
- Targets nutricionales visibles.
- Busqueda de alimentos.
- Agregar alimento por gramos o porcion base.
- Empty state: `Aun no hay alimentos registrados`.
- Loading en busqueda y registro.
- Error controlado para red, 401, 403 y 422.

Post-MVP:

- Edicion y borrado de logs si backend no esta listo.
- Favoritos.
- Escaneo de codigo de barras.
- Plantillas de comidas.
- Calendario mensual avanzado.

### 5. Entrenamiento

MVP:

- Formulario de preview Kalos:
  - Objetivo.
  - Prioridad.
  - Experiencia.
  - Dias por semana.
  - Tiempo por sesion.
  - Boton `Generar preview`.
- Resumen del preview:
  - Objetivo.
  - Dias por semana.
  - Minutos por sesion.
  - Nivel.
  - Enfoque por ratios solo si backend devuelve el campo.
  - Si no hay campo de ratios, mostrar `Prioridad seleccionada`.
- Vista por dia con tabs/chips.
- Una sola sesion visible a la vez.
- Ejercicios con nombre, musculo principal, series, reps, RIR, descanso y
  boton `Cambiar`.
- Sustitucion de ejercicio si endpoint esta disponible.

Post-MVP:

- Persistir rutina.
- Historial de entrenamientos.
- Logging de series realizadas.
- Progresion semanal.
- Temporizador de descanso.
- Video o instrucciones tecnicas por ejercicio.

### 6. Perfil / ajustes

MVP:

- Ver datos basicos del perfil.
- Acceso a editar perfil.
- Cerrar sesion.
- Informacion simple de version y entorno si aplica.

Post-MVP:

- Preferencias de notificaciones.
- Privacidad y exportacion de datos.
- Cambiar password.
- Borrar cuenta.
- Unidades y preferencias regionales.

## Pantallas post-MVP

- Comunidad o social.
- Chatbot conversacional completo.
- Analisis historico avanzado de medidas.
- Reportes semanales con insights.
- Scanner de alimentos.
- Biblioteca completa de ejercicios.
- Persistencia y planificacion semanal editable de rutinas.
- Notificaciones push inteligentes.
- Modo offline con cola de sincronizacion.

## Adaptacion visual de Kalos a Android

### Tipografia

Recomendacion MVP:

- Usar fuente del sistema Android para reducir peso inicial:
  - Titulos: `System` con peso 800/900.
  - Texto base: `System` con peso 400/500.
  - Labels: uppercase solo en micro-labels cortos.
- Evitar tipografia demasiado condensada en textos funcionales.
- No usar tamanos hero de web dentro de cards moviles.

Escala sugerida:

| Uso | Tamano |
| --- | --- |
| Header pantalla | 24-28 |
| Titulo card | 16-20 |
| Body | 14-16 |
| Label / meta | 11-12 |
| Bottom tab label | 11-12 |

### Espaciado

- Safe area arriba y abajo en todas las pantallas.
- Padding horizontal base: 16px.
- Gap entre secciones: 16-20px.
- Gap dentro de cards: 8-12px.
- Altura minima de botones tactiles: 44-48px.
- Evitar grids de mas de 2 columnas en telefonos angostos.

### Colores

Mantener la identidad dark premium de Kalos:

| Token | Uso |
| --- | --- |
| `background` | Fondo principal casi negro. |
| `surface` | Cards y panels. |
| `surfaceRaised` | Cards activas o destacadas. |
| `primary` | Cyan/azul Kalos para acciones principales. |
| `success` | Verde moderado para estados correctos. |
| `warning` | Ambar para avisos no bloqueantes. |
| `danger` | Rojo/rose para errores. |
| `textPrimary` | Blanco suave. |
| `textSecondary` | Slate claro. |
| `textMuted` | Slate medio. |

Reglas:

- Usar cyan para accion primaria, no para todo.
- Evitar pantallas monocromaticas.
- No usar gradientes grandes en todas las cards. Reservarlos para una card
  protagonista si aporta claridad.

### Cards

- Radio base: 16-24px.
- Evitar cards dentro de cards cuando se pueda resolver con separadores o filas.
- Cards de lista deben ser compactas y escaneables.
- Cards de resumen pueden tener mayor contraste.
- En mobile, una card debe responder una pregunta concreta:
  - Que comi hoy.
  - Que toca entrenar.
  - Cual es mi objetivo.

### Botones

- Primario: lleno, alto 48-56px, texto corto.
- Secundario: borde o surface.
- Icon button: 40-44px minimo.
- Botones destructivos con confirmacion.
- Boton `Cambiar` en ejercicios:
  - Visible.
  - Compacto.
  - Si esta deshabilitado: texto `Proximamente`.
  - Si esta activo: loading local `Buscando`.

### Estados vacios

Principio: decir que falta y ofrecer la siguiente accion.

Ejemplos:

- Nutricion:
  - Texto: `Aun no hay alimentos registrados`.
  - CTA: `Agregar primera comida`.
- Entrenamiento:
  - Texto: `Genera tu primer preview Kalos`.
  - CTA: `Generar preview`.
- Perfil:
  - Texto: `Completa tu perfil para personalizar tus objetivos`.
  - CTA: `Completar perfil`.

### Estados de carga

- Usar skeletons para dashboard y listas.
- Usar spinner solo en acciones cortas.
- En busqueda de alimentos, mostrar loader inline dentro del campo o debajo.
- En preview Kalos, mostrar estado de generacion con texto humano:
  `Preparando tu rutina`.
- No bloquear toda la app si solo carga una seccion.

### Estados de error

- 401: redirigir a login con mensaje `Tu sesion expiro. Inicia sesion otra vez`.
- 403: mensaje seguro `No tienes acceso a esta informacion`.
- 422: mostrar error claro del formulario o contrato.
- Red/backend caido: `No pudimos conectar. Intenta de nuevo`.
- Nunca mostrar JWT, service role, payload completo con biometria o stack traces.

## Diferencias web vs movil

### Sidebar web vs bottom tabs movil

Web:

- Sidebar lateral con rutas principales.
- Espacio para dashboards densos.

Movil:

- Bottom tabs con 4 destinos maximo.
- Acciones frecuentes dentro de la pantalla.
- Headers simples por seccion.

### Calendario de nutricion

Web:

- Puede mostrar calendario semanal/mensual o paneles amplios.

Movil MVP:

- Selector horizontal de dias:
  - Hoy.
  - Ayer.
  - Chips de ultimos 7 dias.
- Calendario mensual queda post-MVP.
- Target diario siempre cerca del resumen de consumo.

### Vista por dia de rutinas

Web:

- Puede mostrar mas contexto del plan y varias columnas.

Movil:

- Tabs/chips `Dia 1`, `Dia 2`, `Dia 3`.
- Solo una sesion visible.
- Resumen del dia antes de ejercicios:
  - ejercicios.
  - minutos.
  - fatiga.
- Ejercicios en cards compactas.

### Boton de cambiar ejercicio

Web:

- Puede convivir con metricas en una fila amplia.

Movil:

- Debe estar visible dentro de cada ejercicio.
- No debe competir con los datos principales.
- Debe tener loading local y no recargar toda la rutina.

### Dashboard mas compacto

Web:

- Puede tener graficas, bloques amplios y analisis detallado.

Movil:

- Priorizar:
  - Calorias/macros del dia.
  - Proximo entrenamiento.
  - CTA principal.
- Analisis avanzado se abre como detalle, no en la primera vista.

## Componentes reutilizables recomendados

### Base UI

- `Screen`: wrapper con safe area, background y padding.
- `KalosHeader`: titulo, subtitulo opcional y accion derecha.
- `KalosCard`: surface base.
- `KalosButton`: variantes primary, secondary, ghost, danger.
- `IconButton`: acciones compactas.
- `SegmentedControl`: objetivo/prioridad/experiencia cuando hay pocas opciones.
- `ChipSelector`: dias, tiempo, tabs de rutina.
- `MetricRow`: label, valor, meta y barra opcional.
- `MacroSummary`: calorias + proteina/carbs/grasas.
- `EmptyState`: texto + CTA.
- `InlineError`: errores controlados.
- `LoadingSkeleton`: skeletons de pantalla.

### Dominio

- `NutritionDaySelector`.
- `FoodSearchInput`.
- `FoodResultItem`.
- `NutritionLogItem`.
- `TrainingPreviewForm`.
- `TrainingSummaryCard`.
- `WorkoutDayTabs`.
- `ExerciseCard`.
- `ChangeExerciseButton`.
- `ProfileMetricInput`.

### Servicios y hooks

- `useAuthSession`.
- `useDashboardSummary`.
- `useNutritionDay`.
- `useFoodSearch`.
- `useAddNutritionLog`.
- `useKalosPreview`.
- `useExerciseSubstitution`.
- `useProfileSetup`.

## Riesgos de usabilidad movil

| Riesgo | Impacto | Mitigacion |
| --- | --- | --- |
| Formulario de perfil largo | Abandono en onboarding | Dividir en pasos cortos con progreso. |
| Demasiadas cards en dashboard | Saturacion visual | Mostrar solo resumen y CTAs principales. |
| Rutinas largas | Scroll excesivo | Vista por dia y cards compactas. |
| RIR confuso | Usuario no entiende intensidad | Mostrar RIR visible y microcopy simple en detalle. |
| Botones pequenos | Mala interaccion tactil | Minimo 44px y areas presionables amplias. |
| Errores tecnicos | Desconfianza | Mensajes humanos y acciones de recuperacion. |
| Sesion expirada | Flujo roto | Redirect claro a login y preservacion de intencion si es posible. |
| Sin perfil/biometria | Rutina menos explicable | Mostrar `Prioridad seleccionada` si no hay enfoque por ratios. |
| Teclado tapa inputs | Friccion en formularios | Usar `KeyboardAvoidingView` y scroll automatico. |
| Android chico/gama baja | Jank y cortes | Evitar sombras pesadas, listas largas sin virtualizacion. |

## Reglas de contenido movil

- Preferir verbos directos: `Ingresar`, `Guardar perfil`, `Agregar comida`,
  `Generar preview`, `Cambiar`.
- No usar microcopy sci-fi o demasiado tecnico.
- No afirmar personalizacion por ratios si el backend no devuelve el campo.
- No mostrar `Sin datos`; usar estados especificos.
- No mostrar biometria completa en errores o logs.

## Roadmap UI recomendado

### Fase 1: Prototipo navegable sin backend completo

- Crear `mobile/` con Expo.
- Implementar navegacion auth/onboarding/tabs.
- Crear componentes base con estados mock.
- Validar Android small/medium viewport.

### Fase 2: MVP funcional parcial

- Login Supabase.
- Dashboard compacto con datos disponibles.
- Nutricion: search + add-log + targets.
- Entrenamiento: preview + sustitucion.
- Perfil: lectura/edicion minima segun endpoints disponibles.

### Fase 3: Beta

- Persistencia de rutina cuando backend exista.
- Historial nutricional editable.
- Mejoras de dashboard.
- Notificaciones y recordatorios.

## Criterios de aceptacion visual para MVP Android

- No hay sidebar.
- Bottom tabs siempre visibles en pantallas autenticadas principales.
- Cada pantalla tiene una accion primaria clara.
- Nutricion permite registrar una comida con menos de 4 pasos.
- Entrenamiento muestra una sola sesion a la vez.
- El boton `Cambiar` es visible por ejercicio.
- Loading/error/empty states existen en cada flujo principal.
- No hay texto cortado en ancho Android pequeno.
- No hay scroll horizontal accidental.
- No se muestran tokens, API keys ni biometria completa en UI de error.
