# Mobile Fase B3 - Entrenamiento Real En Android

## Estado final

Aprobado en emulador Android real.

La pantalla Entrenamiento mobile genera un preview Kalos contra FastAPI autenticado, muestra la rutina por días, permite cambiar de día y renderiza ejercicios con sets, reps, RIR y descanso. No se implementó guardado persistente.

## Entorno usado

- Fecha de validación: 2026-06-17.
- Workspace: `C:\HealhTechEcosystem`.
- Mobile: Expo / React Native en Android.
- Dispositivo: `emulator-5554 device`.
- Backend local: `http://127.0.0.1:8000`.
- Metro: `http://127.0.0.1:8081/status` respondió `packager-status:running`.
- Usuario: sandbox, sin documentar correo, UUID, JWT ni biometría completa.

## Endpoint usado

- `POST /training/kalos/preview`

La llamada se realizó desde mobile con sesión activa y `Authorization: Bearer <access_token>`. Mobile no envió `user_id` en body, query, path ni estado derivado.

## Parámetros probados

| Campo | Valor |
| --- | --- |
| Días por semana | `4` |
| Tiempo por sesión | `75` min |
| Objetivo | Hipertrofia |
| Prioridad | Balanceado |
| Experiencia | Intermedio |

## Resultado Android

- Entrenamiento abrió sin placeholder, sin texto mock y sin `Rutinas en preparación`.
- El formulario mostró opciones MVP:
  - días: `3`, `4`, `5`.
  - tiempo: `45`, `60`, `75`, `90`.
  - objetivo: Hipertrofia por default.
  - prioridad: Balanceado, Glúteos/pierna, Torso.
  - experiencia: Principiante, Intermedio, Avanzado.
- El botón `Generar preview` llamó al backend y mostró `Preview generado.`.
- Se renderizaron 4 tabs: `Día 1`, `Día 2`, `Día 3`, `Día 4`.
- El día seleccionado por defecto fue `Día 1`.
- `Día 1` mostró:
  - nombre de sesión: `Lower A`.
  - enfoque muscular: `lower_squat_glute`.
  - músculos objetivo: `quads, glutes`.
  - duración estimada: `70 min`.
  - fatiga estimada: `9`.
  - ejercicios con grupo, equipo, sets, reps, RIR y descanso.
- Se tocó `Día 2` y la sesión visible cambió a:
  - nombre de sesión: `Upper A`.
  - enfoque muscular: `upper_push_pull`.
  - músculos objetivo: `chest, back, triceps`.
  - duración estimada: `70 min`.
  - fatiga estimada: `9`.
- Al cambiar a `Día 2`, la tarjeta activa dejó de mostrar `Día 1`, confirmando que no se mezclan todos los días en una sola lista.
- No apareció UI de guardado ni rutina persistida; el flujo permanece como preview únicamente.

## Resumen sanitizado de rutina

Ejemplos visibles en Android, sin datos personales:

```text
Día 1 / Lower A
Enfoque: lower_squat_glute
Músculos: quads, glutes
Duración: 70 min
Fatiga: 9
Ejercicios visibles:
- Sentadilla con Barra: quads, barbell, 3 sets, 8-12 reps, RIR 1-3, descanso 3 min
- Sentadilla Búlgara: glutes, dumbbell, 3 sets, 8-12 reps, RIR 1-2, descanso 3 min
- Curl Femoral Tumbado: hamstrings, machine, 3 sets, 8-12 reps, RIR 0-2, descanso 2 min

Día 2 / Upper A
Enfoque: upper_push_pull
Músculos: chest, back, triceps
Duración: 70 min
Fatiga: 9
Ejercicios visibles:
- Press de Banca: chest, barbell, 3 sets, 8-12 reps, RIR 1-3, descanso 3 min
- Dominadas Asistidas Agarre Ancho: back, machine, 3 sets, 8-12 reps, RIR 1-2, descanso 2 min
```

## Incidencia runtime resuelta

El primer intento real devolvió `500 Internal Server Error` en `POST /training/kalos/preview` porque el contenedor backend no tenía visible el archivo:

```text
/docs/training-data/kalos_exercise_taxonomy_seed.csv
```

El archivo sí existía en el workspace local bajo `docs/training-data/`. La corrección aplicada fue montar `./docs:/docs:ro` en el servicio `backend` de `docker-compose.yml`, de modo que el contenedor vea el catálogo Kalos automáticamente en la ruta que espera FastAPI.

Confirmación post-fix:

```text
docker compose up -d --build backend
Resultado: backend reconstruido e iniciado.

docker compose exec backend ls /docs/training-data/kalos_exercise_taxonomy_seed.csv
Resultado: archivo visible dentro del contenedor.

POST /training/kalos/preview
Resultado: 200 OK en validación controlada dentro del contenedor con `TestClient` y auth falsa de prueba, sin usar secretos reales.
```

Ya no se requiere copia manual del CSV al contenedor. El montaje es read-only y no introduce secretos.

La revalidación Android real no se repitió en esta corrección porque `adb devices` no respondió antes del timeout local. Las compuertas mobile se volvieron a ejecutar y siguen en verde:

```text
npm.cmd run lint
Resultado: pasa.

npm.cmd test -- --runInBand
Resultado: pasa. 13 suites, 90 tests.

npx.cmd tsc --noEmit
Resultado: pasa.
```

## Logs backend recientes

Evidencia sanitizada:

```text
POST /training/kalos/preview 500 Internal Server Error
Motivo: catálogo Kalos no visible en /docs/training-data dentro del contenedor.

POST /training/kalos/preview 200 OK
```

## Estados probados

| Estado | Resultado |
| --- | --- |
| `empty inicial` | Validado antes de generar: formulario visible y sin rutina renderizada. |
| `loading` | Cubierto al presionar `Generar preview`; botón cambia a estado de generación. |
| `ready` | Validado con preview generado y tabs por día. |
| `error` | Validado con el primer 500 backend; mobile mostró mensaje comprensible y no filtró detalles sensibles. |
| cambio de día | Validado al cambiar de `Día 1` a `Día 2`; solo se mostró la sesión seleccionada. |

## Gates ejecutados

Desde `C:\HealhTechEcosystem\mobile`:

```text
npm.cmd run lint
Resultado: pasa.

npm.cmd test -- --runInBand
Resultado: pasa. 13 suites, 90 tests.

npx.cmd tsc --noEmit
Resultado: pasa.
```

## Confirmación de seguridad

- No se documentaron JWT, refresh tokens, service role keys, API keys, correo real, UUID real ni biometría completa.
- Logs backend revisados no mostraron tokens ni secretos.
- Logs Expo revisados no mostraron tokens ni secretos.
- Logcat revisado no mostró tokens, correos ni biometría; los matches de `@` correspondieron a objetos Android/Expo, no a emails.
- El cliente mobile usa backend autenticado y no consulta Supabase directo para generar rutinas.
- El preview no persiste rutina ni escribe datos nuevos.

## Archivos mobile implementados

- `mobile/src/lib/api/training-preview.ts`
- `mobile/src/features/workout/trainingPreviewViewModel.ts`
- `mobile/src/features/workout/WorkoutScreen.tsx`
- `mobile/__tests__/training-preview-client.test.ts`
- `mobile/__tests__/training-preview-view-model.test.ts`
