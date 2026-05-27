---
name: run-security-audit
description: Se activa de manera mandatoria antes de cerrar cada bloque técnico para auditar la exposición de secretos, el manejo de logs y el aislamiento multi-tenant en el código.
---

# Propósito
Garantizar que el código escrito en el backend (FastAPI) y frontend (Next.js) no comprometa la privacidad de las métricas físicas de los usuarios ni exponga las credenciales de infraestructura.

# Cuándo usar esta skill
Al final de cada sprint o bloque de desarrollo, antes de enviar un Pull Request a la rama `develop` o `main`.

# Entradas requeridas
- Código fuente modificado en el bloque actual.
- Archivo `.env.example`.
- Directrices de seguridad en `docs/security.md`.

# Instrucciones de ejecución
1. Escanear todos los archivos modificados buscando cadenas de texto que asemejen tokens de la API de Gemini, contraseñas de bases de datos o llaves JWT.
2. Revisar los controladores y consultas a la base de datos para certificar que todas las peticiones incluyan el filtro mandatorio por el `user_id` del token JWT.
3. Inspeccionar las declaraciones de logging en el backend para comprobar que ningún payload antropométrico sensible o dato en texto plano se esté guardando en los archivos de salida.
4. Validar que las entradas del usuario en el chat pasen por esquemas Pydantic antes de interactuar con las capas internas del software.

# Evidencia esperada
- Reporte técnico de vulnerabilidades de seguridad depositado en `docs/security-audit-report.md`.

# Criterios de aceptación
- Cero llaves privadas expuestas en los commits o código fuente.
- Verificación exitosa de que no existen consultas SQL construidas por concatenación directa de strings.

# Condiciones de bloqueo
- Bloquear de forma absoluta el merge o la entrega si se detecta una sola API key real, un log con información biométrica expuesta o una ruta desprotegida sin validación de identidad.

# Seguridad y cumplimiento
- Esta skill es la máxima salvaguarda de cumplimiento ético y técnico del sistema; sus fallos son de criticidad alta.