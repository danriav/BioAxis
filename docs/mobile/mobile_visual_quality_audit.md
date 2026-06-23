# Auditoria visual comparativa Kalos Mobile vs Web vs Fitia

Fecha: 2026-06-17  
Alcance: auditoria visual y recomendaciones. No se implementaron redisenos, no se tocaron contratos, endpoints, calculos, autenticacion ni backend.

## Evidencia revisada

| Superficie | Evidencia | Estado | Nota de privacidad |
| --- | --- | --- | --- |
| Mobile Android - Dashboard | `docs/mobile/visual-audit-captures/mobile_dashboard_redacted.png` | Capturado | Valores de perfil y metricas sensibles ocultos. |
| Mobile Android - Perfil | `docs/mobile/visual-audit-captures/mobile_profile_redacted.png` | Capturado | Peso, altura, objetivo y frecuencia ocultos. |
| Mobile Android - Nutricion | `docs/mobile/visual-audit-captures/mobile_nutrition.png` | Capturado | No expone email, JWT, UUID ni biometria. |
| Mobile Android - Entrenamiento | `docs/mobile/visual-audit-captures/mobile_current.png` | Capturado | Vista de configuracion de preview; no expone tokens ni biometria. |
| Mobile Android - Login | No capturado | Limitado | La app estaba autenticada en Expo Go. No se cerro sesion para evitar perder usuario sandbox o alterar estado de auth. |
| Mobile Android - Preview generado/sustitucion | No capturado | Limitado | La captura disponible muestra el generador antes del preview. Se audita con la UI actual visible y el alcance funcional declarado. |
| Web Kalos | No capturado en esta pasada | Limitado | El frontend web local no respondia en `127.0.0.1:3000` durante la auditoria. Comparacion web se deja como lectura direccional, no pixel-perfect. |
| Fitia - referencia publica | https://fitia.app/ | Revisado | Fuente publica. Fitia presenta contador de calorias/macros, logging por foto/voz/texto/scan, planes y base verificada. |
| Fitia - imagen app preview | https://fitia.app/img/diego/en/app.webp | Revisado | Fuente publica. |
| Fitia - snap to track | https://fitia.app/img/diego/en/snap-to-track.webp | Revisado | Fuente publica. |
| Fitia - speak/type to track | https://fitia.app/img/diego/en/speak-to-track.webp, https://fitia.app/img/diego/en/type-to-track.webp | Revisado | Fuente publica. |

## Lectura general

Kalos Mobile ya demuestra producto real: sesion activa, nutricion con logs, preview de entrenamiento y perfil conectado. El problema principal no es funcional sino de percepcion: las pantallas se sienten mas como una consola tecnica adaptada a mobile que como una app fitness premium.

El patron dominante actual es: fondo oscuro, cards grandes, etiquetas en mayusculas, mucho borde, mucho espacio vertical y acciones poco jerarquizadas. Esto genera una sensacion de MVP funcional, pero no comunica de inmediato progreso fisico, nutricion diaria ni entrenamiento accionable.

Fitia, como referencia, concentra su valor visual en tres ideas: una metrica dominante, acciones rapidas de registro y feedback nutricional inmediato. Su pagina publica destaca "Calorie Counter & Diet Plans", tracking por foto/voz/texto/scan y calculo de calorias/macros. Esa claridad de propuesta deberia guiar el rediseno mobile de Kalos.

## Comparacion Mobile Kalos vs Web Kalos

La web de Kalos, por las iteraciones previas del dashboard/nutricion/preview, tiene una identidad mas marcada: bloques protagonistas, tarjetas con intencion visual, CTA fuerte y componentes de macros mas reconocibles. Mobile conserva el dark theme y el acento cyan, pero pierde refinamiento por escala:

- Las cards ocupan demasiado alto relativo y todas compiten por la misma importancia.
- El header mobile repite titulos genericos como "Dashboard" sin convertir la primera pantalla en un resumen de hoy.
- La navegacion inferior usa letras como iconos, lo que baja percepcion de calidad frente a iconografia real.
- El contenido no prioriza la accion principal de cada pantalla: agregar comida, revisar rutina del dia o continuar progreso.
- La tipografia se ve pesada en cards secundarias y deja poco margen para densidad util.

## Comparacion Mobile Kalos vs Fitia

Fitia hace que nutricion se entienda primero: calorias/macros, registro rapido y comida como unidad principal. Kalos Mobile muestra datos reales, pero la lectura requiere mas esfuerzo.

En Fitia, las acciones rapidas son parte de la promesa visual: foto, voz, texto y scan. Kalos no necesita copiar esas features para el MVP, pero si deberia adoptar el principio: una accion de registro visible, inmediata y facil de repetir.

En Kalos Nutricion, el log de alimentos existe y se agrupa por comida, lo cual es correcto. El problema visual es que el usuario no recibe primero un resumen compacto del dia con kcal/macros consumidos vs objetivo. Las comidas vacias y el formulario de edicion abierto pesan mas visualmente que el progreso del dia.

## Hallazgos priorizados

### P0 - Redisenar primero

1. Nutricion debe ser la primera pantalla a pulir. Es la mas comparable con Fitia y la de mayor frecuencia de uso. Necesita un resumen superior con kcal consumidas/objetivo, macros consumidos/objetivo y CTA "Agregar comida" siempre evidente.

2. Dashboard debe pasar de "resumen tecnico" a "hoy en Kalos". Debe mostrar 2-3 indicadores compactos: energia/nutricion, entrenamiento del dia y estado de perfil. Las cards actuales son demasiado grandes para la informacion que contienen.

3. Bottom tabs necesitan iconos reales y estados activos mas finos. Las letras `D`, `N`, `E`, `P` se perciben como placeholder. Esto afecta toda la app.

### P1 - Pulido importante

4. Entrenamiento debe mostrar el resultado por dia con jerarquia clara: nombre del dia, duracion, fatiga/intensidad, ejercicios y boton "Cambiar". La configuracion previa esta funcional, pero el formulario ocupa demasiado y el CTA queda lejos.

5. Perfil debe sentirse como ajustes/perfil, no como panel de diagnostico. Los datos sensibles deben mostrarse con mas contencion, idealmente en modo edicion o en filas compactas.

6. Reducir radio y borde visual en mobile. Muchas tarjetas usan bordes grandes y contornos pesados; conviene usar radios 16-24px, bordes sutiles y superficies menos repetitivas.

### P2 - Despues del primer rediseno

7. Login y onboarding deben elevar marca y confianza, pero no son el mayor cuello de botella si la retencion diaria depende de nutricion/dashboard.

8. Estados vacios deben ser mas accionables. En lugar de solo informar que no hay datos, deben empujar una accion concreta: "Agrega tu primera comida", "Genera tu rutina" o "Completa tu perfil".

## Recomendaciones visuales concretas

### Sistema visual mobile

- Mantener el fondo oscuro Kalos, pero introducir superficies con menos contraste de borde y mas jerarquia por escala.
- Usar una escala tipografica mobile mas contenida: titulos 28-32, metricas protagonistas 40-48, labels 11-12, cuerpo 14-16.
- Reservar mayusculas espaciadas para labels pequenos, no para todos los bloques.
- Usar iconos reales en tabs y acciones: dashboard, nutricion, entrenamiento, perfil, agregar, cambiar, calendario.
- Convertir cards grandes en filas compactas cuando el dato sea secundario.
- Evitar que todas las tarjetas tengan la misma presencia visual; una pantalla debe tener un protagonista claro.

### Dashboard

- Primer bloque: "Hoy" con kcal, macros y entrenamiento pendiente/listo.
- Segundo bloque: progreso semanal compacto.
- Tercer bloque: acceso rapido a Nutricion y Entrenamiento.
- Evitar repetir "Dashboard" como titulo grande y como screen title.
- Hacer que el engrane no compita con el contenido principal.

### Nutricion

- Arriba: contador kcal consumidas vs objetivo con macros en tres barras pequenas.
- Debajo: selector de fecha compacto.
- Luego: lista de comidas agrupadas con estado vacio por comida.
- CTA principal: "Agregar comida" visible como boton flotante o boton sticky inferior sobre la navegacion.
- El formulario de agregar/editar debe abrirse en modal/sheet, no dominar el scroll por defecto.
- Mantener separados los objetivos de `/nutrition/targets/me` y el consumo de `/nutrition/logs?date=`.

### Entrenamiento

- Configuracion inicial mas breve: objetivo, prioridad, experiencia, dias y tiempo.
- Boton "Generar preview" visible sin scroll excesivo.
- Preview por dia: tabs horizontales, un solo dia abierto, resumen del dia y ejercicios en cards compactas.
- En ejercicios: nombre, musculo principal, sets/reps/RIR/rest y "Cambiar" como accion secundaria.
- RIR 0 debe verse como intensidad alta, no como error.

### Perfil

- Convertir la vista en ajustes compactos: cuenta, perfil biometrico, preferencias de entrenamiento, nutricion.
- Mostrar estado "listo" y acciones de edicion sin exponer todos los datos sensibles en cards gigantes.
- Reducir cards redundantes y usar filas con valor + accion.

## Pantallas a redisenar primero

1. Nutricion: impacto directo en valor percibido y comparacion con Fitia.
2. Dashboard: primera impresion autenticada; debe comunicar progreso, no solo estado.
3. Bottom navigation: mejora transversal rapida en percepcion de calidad.
4. Entrenamiento preview: importante para que el motor determinista se sienta premium.
5. Perfil: despues de estabilizar las pantallas de uso diario.
6. Login/onboarding: pulido posterior si ya existe flujo estable.

## Que no cambiar

- No cambiar contratos API ni nombres de campos.
- No enviar `user_id` desde mobile.
- No tocar autenticacion Supabase ni manejo de JWT salvo para preservar seguridad.
- No cambiar calculos de calorias, macros, targets, logs o entrenamiento.
- No modificar backend, DB, IA ni endpoints.
- No loggear tokens, correos, UUIDs ni biometria completa.
- No redisenar todo el sistema de golpe; empezar con nutricion/dashboard y propagar tokens visuales.

## Riesgos de usabilidad mobile

- Scroll excesivo en pantallas que deberian responder una pregunta rapida: que comi, que me falta, que entreno hoy.
- Contenido critico debajo de la navegacion inferior.
- CTA principal demasiado bajo o mezclado con cards secundarias.
- Densidad baja: muchas cards grandes para pocos datos.
- Exceso de lenguaje tecnico o labels internas que reducen confianza.
- Datos sensibles demasiado visibles en capturas, demos o soporte.

## Conclusiones

Kalos Mobile esta en una buena posicion funcional, pero necesita un primer rediseno concentrado para que el producto se sienta a la altura del motor que ya tiene. La prioridad no es agregar mas features; es hacer que nutricion, dashboard y entrenamiento se entiendan en menos de cinco segundos.

El norte visual recomendado es: menos consola, mas app fitness diaria; menos cards grandes, mas progreso accionable; menos texto tecnico, mas decisiones simples para el atleta.
