---
name: validate-api-contracts
description: Se activa al diseñar o modificar endpoints en FastAPI para asegurar que los request y response cumplan estrictamente los contratos JSON acordados con el frontend Next.js.
---

# Propósito
Evitar desalineaciones de datos entre el cliente web y el servidor mediante la validación automatizada de las cargas útiles de la API a través de Pydantic.

# Cuándo usar esta skill
Cada vez que se cree un nuevo APIRouter en FastAPI o se requiera conectar un nuevo hook de consumo en Next.js.

# Entradas requeridas
- Archivo `docs/api.md` con la especificación de los endpoints esperados.
- Modelos Pydantic desarrollados en el backend.

# Instrucciones de ejecución
1. Revisar que cada ruta en FastAPI declare explícitamente su parámetro `response_model`.
2. Validar que los códigos de estado HTTP devueltos sean semánticamente correctos (200 para éxito, 201 para creación, 400 para errores de cliente, 401 para autenticación).
3. Inspeccionar que las excepciones lógicas del negocio se transformen en `HTTPException` controladas.
4. Exportar o documentar la estructura exacta del JSON de salida para que el agente frontend configure sus interfaces TypeScript.

# Evidencia esperada
- Rutas implementadas en `backend/app/routers/`.
- Actualización detallada del archivo `docs/api.md`.

# Criterios de aceptación
- Cero rutas que devuelvan diccionarios puros de Python (`dict`) sin un esquema de Pydantic que los gobierne.
- Pruebas de integración que simulen payloads corruptos y verifiquen que la API responda con un estado `422 Unprocessable Entity`.

# Condiciones de bloqueo
- Se bloquea la integración si el backend altera un campo del JSON de respuesta sin actualizar simultáneamente el tipado correspondiente en la documentación de la API.

# Seguridad y cumplimiento
- Ningún contrato de API debe exponer tokens de acceso o contraseñas en los cuerpos de respuesta de los endpoints públicos.