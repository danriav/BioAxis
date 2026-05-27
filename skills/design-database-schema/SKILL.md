---
name: design-database-schema
description: Se activa al inicio del Bloque 2 para diseñar e implementar la estructura relacional de BioAxis en SQLAlchemy, controlando tipos de datos biométricos y restricciones de integridad.
---

# Propósito
Garantizar que el modelo de datos de BioAxis sea altamente cohesivo, normalizado y tipado de forma estricta, protegiendo la integridad de los registros de entrenamiento y nutrición de los usuarios.

# Cuándo usar esta skill
Exclusivamente en la fase de inicialización de la capa de persistencia del backend, antes de escribir rutas de API o controladores de servicio.

# Entradas requeridas
- Especificación funcional de features de perfil biométrico e historial de progreso (Fase 2).
- Archivo `docs/database.md` base.

# Instrucciones de ejecución
1. Analizar los requerimientos de almacenamiento para perfiles de usuario (peso, grasa, perímetros), planes nutricionales y bitácoras de entrenamiento.
2. Diseñar las entidades utilizando SQLAlchemy declarativo, aplicando restricciones de claves primarias, foráneas y campos no nulos (`nullable=False`) en atributos críticos.
3. Incorporar de manera mandatoria el campo `user_id` en cada tabla dependiente para asegurar el aislamiento multi-tenant lógico.
4. Generar los esquemas de validación Pydantic correspondientes a cada modelo para operaciones de lectura (ORM) y escritura.

# Evidencia esperada
- Archivos de python en `backend/app/models/` y `backend/app/schemas/`.
- Script de migración base o archivo de inicialización de tablas.

# Criterios de aceptación
- El código debe pasar el linter sin errores de tipado.
- Todas las tablas deben contar con índices en los campos de búsqueda frecuentes (`user_id`, `date`).

# Condiciones de bloqueo
- Detener la ejecución si se intenta plantear un esquema donde los datos de múltiples usuarios se mezclen sin un filtro determinista por `user_id`.

# Seguridad y cumplimiento
- Los campos de contraseñas deben definirse para almacenar hashes (ej. utilizando Bcrypt), nunca texto plano.