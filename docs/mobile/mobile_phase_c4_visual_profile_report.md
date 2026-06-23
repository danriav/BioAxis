# Mobile Fase C4 - Rediseño visual de Perfil y onboarding biométrico

Fecha: 2026-06-18  
Estado: implementación, validación Android, evidencia y gates aprobados.

## Perfil

La pantalla Perfil se reorganizó en una vista compacta y coherente con Dashboard, Nutrición y Entrenamiento:

- Encabezado con etiqueta del atleta, sin correo ni identificadores.
- Sección Cuenta con estado de cuenta, sesión y perfil biométrico.
- Sección Datos físicos limitada a peso y altura actuales.
- Nota explícita para evitar exponer la biometría completa.
- Sección Objetivo con etiqueta localizada del objetivo metabólico.
- Sección Preferencias con sistema de unidades y nivel de resumen.
- Acción `Actualizar perfil` separada de los datos.
- Sección Seguridad y acción `Cerrar sesión` diferenciada visualmente.

No se muestra la frecuencia de entrenamiento en Perfil. Su valor contractual se conserva internamente cuando se actualiza un perfil existente.

## Estados de Perfil

La presentación diferencia:

- Cargando.
- Perfil completo.
- Perfil incompleto con CTA para completarlo.
- Error con acción de reintento.
- Sesión expirada.
- Cierre de sesión en progreso.

`getProfileScreenMode(...)` centraliza la selección de estos estados. `signOutFromProfile(...)` invoca el cierre de sesión autenticado existente sin acceder ni registrar tokens.

## Onboarding y actualización biométrica

El formulario se dividió en cinco pasos:

1. Identidad.
2. Medidas base.
3. Torso.
4. Zona inferior.
5. Objetivo y revisión.

Cada paso incluye:

- Progreso visible.
- Título y contexto del grupo de datos.
- Unidades junto al campo.
- Validación junto al campo correspondiente.
- Mensaje de error resumido.
- Navegación estable `Atrás` / `Siguiente`.
- CTA principal fijo e identificable fuera del área desplazable.

La actualización carga `GET /profile/me` y precarga el formulario con los valores actuales. El CTA final presenta `Guardando` durante la mutación.

## Contratos preservados

Se mantienen sin cambios:

- `GET /profile/me`
- `POST /profile/setup`
- Autenticación Supabase.
- Reemplazo histórico SCD2 realizado por el backend.
- Nombres y valores originales del contrato.

El payload continúa sin `user_id`. `dias_entrenamiento_semana` permanece en el payload requerido por el contrato, pero no se solicita ni se repite en la UI de Perfil; al actualizar se conserva el valor recibido de `profile/me`.

No se modificaron backend, Supabase, contratos ni lógica SCD2.

## Validaciones

La validación por pasos cubre:

- Nombre visible.
- Género.
- Edad entre 13 y 100 o fecha con formato `AAAA-MM-DD`.
- Peso y altura positivos.
- Medidas de torso positivas.
- Medidas de zona inferior positivas.
- Payload completo antes de llamar al backend.

Los errores se muestran junto al campo y no requieren esperar una respuesta del backend.

## Pruebas

La cobertura de Perfil incluye:

- Payload biométrico completo sin `user_id`.
- Validación por paso y por campo.
- Alternativas edad/fecha de nacimiento.
- Precarga del formulario desde `profile/me`.
- Preservación del valor contractual de días de entrenamiento.
- Localización del objetivo metabólico.
- Estados completo, incompleto, cargando, error y sesión expirada.
- Mapeo de errores API.
- Invocación del cierre de sesión.
- Clientes `profile/me`, `profile/setup` y measurements autenticados.

## Validación Android

- Dispositivo: `emulator-5554`, Pixel 6.
- Perfil completo validado con cuenta, resumen físico, objetivo y preferencias.
- Navegación a actualización desde Perfil validada.
- Los cinco pasos conservan el progreso y el footer de navegación.
- Error de nombre vacío validado junto al campo.
- Estado `Guardando` validado con CTA deshabilitado.
- Vista validada a resolución efectiva `720x1280`, densidad `280`.
- El emulador se restauró a `1080x2400`, densidad `420`, al terminar.

La evidencia de perfil incompleto se produjo con una simulación visual local y reversible. La implementación real se restauró antes de ejecutar los gates; no se creó ni modificó un perfil en backend para esa captura.

## Evidencia sanitizada

- `docs/mobile/visual-audit-captures/c4-profile-complete.png`
- `docs/mobile/visual-audit-captures/c4-profile-incomplete.png`
- `docs/mobile/visual-audit-captures/c4-onboarding-step-1.png`
- `docs/mobile/visual-audit-captures/c4-onboarding-step-2.png`
- `docs/mobile/visual-audit-captures/c4-onboarding-step-5.png`
- `docs/mobile/visual-audit-captures/c4-profile-validation-error.png`
- `docs/mobile/visual-audit-captures/c4-profile-saving.png`
- `docs/mobile/visual-audit-captures/c4-profile-720x1280.png`

Las capturas no muestran correo, UUID, tokens ni biometría completa.

## Gates

- `npm.cmd test -- --runInBand`: aprobado, 14 suites y 129 tests.
- `npm.cmd run lint`: aprobado.
- `npx.cmd tsc --noEmit`: aprobado.

## Archivos principales

- `mobile/src/features/profile/ProfileScreen.tsx`
- `mobile/src/features/profile/ProfileSetupScreen.tsx`
- `mobile/src/features/profile/profileViewModel.ts`
- `mobile/__tests__/profile-view-model.test.ts`
- `mobile/app/_layout.tsx`
- `mobile/app/(tabs)/_layout.tsx`

## Restricciones

- Sin cambios de backend.
- Sin cambios de Supabase.
- Sin cambios de contratos.
- Sin cambios de lógica SCD2.
- Sin commit, push ni Pull Request.
