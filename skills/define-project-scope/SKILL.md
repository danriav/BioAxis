---
name: define-project-scope
description: Se activa al inicio del Bloque 1 para validar que los objetivos, requerimientos del MVP y límites del repositorio BioAxis estén alineados antes de generar código o documentación.
---

# Propósito
Garantizar que ningún agente o desarrollador humano extienda las capacidades del sistema más allá de los límites acordados para el MVP (Next.js + FastAPI + Gemini API), evitando la introducción de features fuera de alcance.

# Cuándo usar esta skill
Exclusivamente durante la inicialización del proyecto o al recibir una solicitud para agregar una nueva funcionalidad al repositorio.

# Entradas requeridas
- Especificación funcional del MVP (Fase 2 de la planificación).
- Archivo `README.md` actual del repositorio.

# Instrucciones de ejecución
1. Leer el archivo de especificación funcional y contrastarlo con los objetivos de optimización biológica (nutrición e hipertrofia).
2. Verificar si la tarea asignada pertenece a las features prioritarias (Autenticación, Perfil Biométrico, Motor de Síntesis o Chatbot).
3. Validar explícitamente que la solicitud no involucre elementos fuera de alcance (como integración con wearables, planes de CrossFit o pasarelas de pago).
4. Emitir un reporte de alineación de alcance en el espacio de trabajo.

# Evidencia esperada
- Archivo temporal o log de auditoría `scope-validation.log` indicando estado de cumplimiento (PASS/FAIL).

# Criterios de aceptación
- La feature evaluada debe encajar al 100% dentro de las fronteras del MVP sin requerir dependencias de terceros no aprobadas.

# Condiciones de bloqueo
- Detener inmediatamente cualquier avance si la tarea intenta introducir lógicas médicas, prescripción de fármacos o cualquier elemento marcado como fuera de alcance.

# Seguridad y cumplimiento
- Asegurar que las definiciones de alcance no asuman ni expongan datos personales o de infraestructura real del entorno de desarrollo.