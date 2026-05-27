---
name: update-agent-memory
description: Se activa al cierre de cada bloque o sprint para consolidar el estado del arte del proyecto, decisiones de diseño, deudas técnicas y directrices de continuidad.
---

# Propósito
Mantener una memoria de largo plazo fidedigna y estructurada para que humanos u otros agentes de IA puedan continuar el desarrollo de BioAxis sin pérdida de contexto técnico.

# Cuándo usar esta skill
Al final de cada ciclo de trabajo o hito importante del desarrollo, antes de entregar los resultados al usuario.

# Entradas requeridas
- Código modificado en el bloque actual.
- Estado previo de `docs/agent-memory.md`.

# Instrucciones de ejecución
1. Realizar una lectura exhaustiva de los cambios realizados en el espacio de trabajo durante el sprint.
2. Identificar qué decisiones técnicas fueron consolidadas (ej. cambios en el ORM, nuevas dependencias de Python o npm).
3. Clasificar los supuestos que pasaron a estar validados y registrar los nuevos riesgos técnicos descubiertos.
4. Redactar de forma concisa los próximos pasos sugeridos, detallando de qué archivos o módulos deben hacerse cargo los siguientes agentes.

# Evidencia esperada
- Archivo `docs/agent-memory.md` actualizado con un nuevo bloque de historial fechado.

# Criterios de aceptación
- La documentación debe reflejar con total fidelidad el estado actual del código del repositorio. No se permiten hojas de ruta abstractas; deben ser tareas técnicas concretas.

# Condiciones de bloqueo
- Romper el flujo si existen contradicciones entre lo que dice la memoria del agente y lo que realmente está implementado en el backend o frontend.

# Seguridad y cumplimiento
- Prohibido dejar anotaciones en la memoria que hagan alusión a credenciales temporales, accesos de desarrollo reales o datos personales del desarrollador.