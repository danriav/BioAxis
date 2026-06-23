# Mobile Fase C3 - Rediseño visual de Entrenamiento

Fecha: 2026-06-18  
Estado: aprobado en implementación, flujo principal Android y gates.

## Implementación

La pantalla Entrenamiento ahora reutiliza el sistema visual de C1 y C2:

- Configuración agrupada por objetivo, prioridad, experiencia, días y duración.
- Defaults existentes: 4 días, 75 minutos, hipertrofia, balanceado e intermedio.
- CTA `Generar rutina` dentro del panel principal.
- Configuración colapsada después de generar, con acción `Editar`.
- Tabs horizontales por día.
- Solo se renderiza la sesión seleccionada.
- Resumen del día con enfoque, músculos, duración, fatiga y cantidad de ejercicios.
- Ejercicios compactos con nombre, músculo, equipo, series, reps, RIR y descanso.
- Acción `Cambiar` con icono y estado `Buscando`.

## Estados visuales

- Configuración inicial.
- Generando rutina.
- Preview listo.
- Sustituyendo ejercicio.
- Sin sustituto disponible.
- Error de red.
- Sesión expirada.

`deriveTrainingScreenMode(...)` diferencia la generación del preview y la sustitución de un ejercicio. Los errores `422` de sustitución se presentan como `Sin alternativa disponible`.

## Contratos preservados

- `POST /training/kalos/preview`
- `POST /training/kalos/substitute`

No se modificaron endpoints, payloads, motor Kalos, ratios ni autenticación. Los payloads siguen sin `user_id`.

`replaceExerciseInPreview(...)` continúa preservando:

- orden;
- series;
- rango de repeticiones;
- RIR;
- descanso.

## Pruebas

La cobertura incluye:

- Payload de configuración.
- Orden y selección de días.
- Solo una sesión seleccionada.
- Formato de prescripción.
- Estados inicial, generando y preview listo.
- Estado de sustitución.
- Error sin alternativa.
- Error de red.
- Sesión expirada.
- Sustitución exitosa.
- Preservación de series, repeticiones, RIR, descanso y orden.

## Validación Android

- Dispositivo: `emulator-5554`, Pixel 6.
- Backend local confirmado en `http://127.0.0.1:8000/docs`.
- Metro confirmado en `http://127.0.0.1:8081/status`.
- Parámetros probados: 4 días, 75 minutos, hipertrofia, balanceado e intermedio.
- Backend generó cuatro sesiones.
- Día seleccionado inicialmente: Día 1.
- Se cambió a Día 2 y solo se mostró `Upper A`.
- Se sustituyó `Press de Banca` por una alternativa de press inclinado.
- Antes y después se conservaron 3 series, 8-12 reps, RIR 1-3 y 3 minutos de descanso.
- El backend se detuvo temporalmente para validar el estado de error de red y se reinició inmediatamente.
- Backend restaurado: `/docs` respondió `200`.
- No se persiste el preview.

Los bloques de días y duración se presentan en filas independientes y estables para evitar compresión y solapamientos en los tamaños Android validados.

## Corrección C3.1

El cierre solicitado por el Auditor se verificó el 2026-06-18 sobre `emulator-5554`:

- Se estabilizó Expo Go con resolución efectiva de `720x1280` y densidad `280`.
- Se capturó la vista general de Entrenamiento con el preview generado, la configuración activa, los tabs por día y el resumen de la sesión.
- Se capturó la lista de ejercicios con descansos de `150 s` y `90 s` visibles simultáneamente.
- La presentación conserva los segundos sin redondeo: `150 s` se muestra como `2 min 30 s` y `90 s` como `1 min 30 s`.
- `c31-stage.png` no forma parte de la evidencia de C3.1: correspondía al Dashboard y no está presente en el workspace al cierre. Se considera descartada/reclasificada fuera de Entrenamiento.
- No se modificaron backend, contratos, autenticación ni motor Kalos durante esta corrección.

## Corrección C3.2

El cierre de localización y limpieza solicitado por el Auditor se completó el 2026-06-18:

- Se revisaron el mapa de grupos musculares del motor Kalos, el adaptador del catálogo y la taxonomía normalizada de entrenamiento.
- La taxonomía muscular visible queda completamente localizada, incluidos `abductors` → `Abductores`, `adductors` → `Aductores`, `rear_delts` → `Deltoides posteriores` y `side_delts` → `Deltoides laterales`.
- También se cubrió `cardio` → `Cardio`, presente en el dataset normalizado. Los demás códigos efectivos ya contaban con etiqueta localizada.
- La localización se aplica únicamente al presentar datos. Los códigos originales del backend permanecen intactos en contratos, payloads y respuestas.
- Se agregaron pruebas específicas para `abductors` y `adductors`, además de cobertura para los deltoides posteriores y laterales.
- Se eliminó el artefacto temporal `c31-training.xml` de la raíz del workspace.
- No se modificaron backend, contratos, autenticación ni motor Kalos durante esta corrección.

## Evidencia sanitizada

- `docs/mobile/visual-audit-captures/c3-training-config.png`
- `docs/mobile/visual-audit-captures/c3-training-generating.png`
- `docs/mobile/visual-audit-captures/c3-training-preview.png`
- `docs/mobile/visual-audit-captures/c3-training-day.png`
- `docs/mobile/visual-audit-captures/c3-training-substituting.png`
- `docs/mobile/visual-audit-captures/c3-training-substituted.png`
- `docs/mobile/visual-audit-captures/c3-training-error.png`
- `docs/mobile/visual-audit-captures/c31-training-720x1280.png`
- `docs/mobile/visual-audit-captures/c31-training-720x1280-rests.png`

Las capturas no contienen correo, tokens, UUID ni biometría.

## Gates

- `npm.cmd run lint`: aprobado.
- `npm.cmd test -- --runInBand`: aprobado, 14 suites y 122 tests.
- `npx.cmd tsc --noEmit`: aprobado.

## Archivos principales

- `mobile/src/features/workout/WorkoutScreen.tsx`
- `mobile/src/features/workout/trainingPreviewViewModel.ts`
- `mobile/__tests__/training-preview-view-model.test.ts`
- `mobile/app/(tabs)/_layout.tsx`

## Restricciones

- Sin cambios de backend.
- Sin cambios en contratos o motor Kalos.
- Sin cambios de Supabase.
- Sin commit, push ni Pull Request.
