# Blueprint Técnico y Guía de Gobernanza de Agentes: BioAxis

Este documento constituye la especificación técnica completa y el marco de gobernanza automatizada para **BioAxis**, una plataforma web desacoplada de optimización biológica (nutrición y programación hipertrófica personalizada). 

Este archivo sirve como la fuente única de verdad para el desarrollo asistido por agentes de IA y programadores humanos, garantizando la consistencia arquitectónica, la portabilidad de habilidades (*skills*) y la seguridad de los datos.

---

## 1. Resumen Ejecutivo y Constitución del Proyecto

### 1.1 Identidad del Proyecto
* **Nombre del Proyecto:** BioAxis[cite: 1]
* **Tipo de Producto:** Plataforma web desacoplada de optimización biológica (Nutrición y entrenamiento hipertrófico automatizado)[cite: 1].
* **Contexto de Uso:** Sistema desacoplado con backend de alta velocidad (FastAPI) y frontend reactivo (Next.js), integrando un motor de síntesis de datos y un chatbot generativo basado en la API de Gemini[cite: 1].
* **Propósito del Ecosistema de Agentes:** Automatizar el desarrollo de características (*features*), refactorización de código, generación de pruebas e instrumentación de la lógica hipertrófica sin romper contratos arquitectónicos existentes[cite: 1].

### 1.2 Stack Tecnológico Confirmado
* **Backend:** Python (FastAPI), SQLAlchemy o Tortoise ORM para la persistencia[cite: 1].
* **Frontend:** TypeScript (Next.js), Tailwind CSS[cite: 1].
* **Integración de IA:** Modelos fundacionales (Gemini API) para el motor de síntesis de hipertrofia y el chatbot conversacional[cite: 1].
* **Arquitectura de Agentes:** Sistema portátil basado en archivos Markdown con metadatos en YAML frontmatter para ejecución en entornos de desarrollo asistidos por IA[cite: 1].

### 1.3 Prácticas Prohibidas (Límites Estrictos)
1.  **Prohibido** modificar código sin actualizar la documentación técnica concurrente en `docs/` y el archivo de historial en `docs/agent-memory.md`[cite: 1].
2.  **Prohibido** subir credenciales, API keys de Gemini o variables de entorno reales al repositorio. Todo cambio de configuración debe reflejarse únicamente en `.env.example`[cite: 1].
3.  **Prohibido** mezclar lógica algorítmica de hipertrofia o fórmulas de macronutrientes directamente en los controladores o rutas de la API de FastAPI (deben residir exclusivamente en la capa de dominio/servicios)[cite: 1].
4.  **Prohibido** mutar contratos de respuesta JSON de la API sin previa validación y tipado estricto a través de esquemas Pydantic[cite: 1].
5.  **Prohibido** registrar datos antropométricos, de salud o información sensible de los usuarios directamente en logs de texto plano[cite: 1].

### 1.4 Convenciones del Proyecto
* **Idioma de Desarrollo:** Código fuente, variables, nombres de bases de datos y comentarios estrictamente en **inglés**. Documentación técnica y memoria de agentes en **español** para facilitar la orquestación y el control estratégico[cite: 1].
* **Formato de Skills:** Archivos Markdown atómicos alojados en la ruta neutral `skills/<nombre-skill>/SKILL.md`[cite: 1].
* **Flujo de Ramas Git:** `main` (producción), `develop` (integración), y ramas de agentes/features bajo el patrón `feature/agent-<nombre-agente>-<descripcion>`[cite: 1].
* **Mensajes de Commit:** Formato convencional obligatorio (`feat:`, `fix:`, `docs:`, `refactor:`)[cite: 1].

### 1.5 Seguridad y Privacidad
* **Aislamiento de Datos:** Multi-tenancy lógico a nivel de base de datos. Cada query o mutación debe incluir obligatoriamente un filtro por el identificador único del usuario (`user_id`) extraído del token JWT para asegurar el aislamiento estricto de las métricas físicas[cite: 1].

---

## 2. Especificación Funcional (MVP Scope)

### 2.1 Definición del Problema
BioAxis resuelve la dificultad para prescribir, ajustar y dar seguimiento a planes de nutrición y entrenamiento de hipertrofia de forma científica y automatizada, eliminando el error humano en el cálculo de macronutrientes y progresiones de carga[cite: 1]. El público objetivo comprende atletas, entrenadores y y entusiastas del fitness enfocados en la ganancia de masa muscular basada en analítica predictiva[cite: 1].

### 2.2 Características Clave del MVP (Priorizadas)
1.  **Módulo de Autenticación y Perfil Biométrico:** Registro seguro de usuarios e ingreso de métricas iniciales (peso, grasa estimada, perímetros corporales, gasto energético)[cite: 1].
2.  **Motor de Síntesis de Hipertrofia:** Algoritmo de dominio encargado de calcular requerimientos calóricos, distribución exacta de macronutrientes y volumen de entrenamiento semanal por grupo muscular[cite: 1].
3.  **Chatbot Generativo Integrado:** Interfaz conversacional que permite a los usuarios interactuar con su plan, resolver dudas de alimentación y registrar entrenamientos de forma natural (lenguaje libre)[cite: 1].
4.  **Historial y Registro de Progreso:** Bitácora visual de pesos levantados, series completadas y fluctuaciones antropométricas a lo largo del tiempo[cite: 1].

### 2.3 Límites de Alcance (Fuera del MVP)
* Integración directa con wearables (smartwatches, bandas de actividad)[cite: 1].
* Planes de entrenamiento para disciplinas distintas a la hipertrofia (ej. Powerlifting puro, CrossFit o resistencia)[cite: 1].
* Pasarelas de pago o módulos de monetización[cite: 1].

---

## 3. Matriz de Contingencia y Clarificación Crítica

### 3.1 Consistencia Biológica y de Datos
* **Cambios de Objetivos:** Si un usuario decide cambiar su objetivo a mitad de un bloque de 4 semanas, el sistema invalidará de inmediato el bloque actual, guardará un snapshot histórico del progreso alcanzado y generará una nueva estructura de bloques desde el día 1 del nuevo ciclo[cite: 1].
* **Tolerancia a Datos Incompletos:** Si el usuario olvida registrar entrenamientos o comidas durante días consecutivos, el chatbot no asumirá datos ficticios. Al reanudar la interacción, el bot notificará el desfase y aplicará un protocolo de "mantenimiento de carga" en lugar de progresar linealmente el volumen o la intensidad[cite: 1].

### 3.2 Resiliencia de Inteligencia Artificial
* **Degradación del Servicio (Caídas de Gemini API):** Si el servicio de Gemini experimenta latencia o caídas, el backend de FastAPI no romperá la experiencia. La interfaz de chat mostrará una degradación sutil informando que el procesamiento conversacional no está disponible, pero mantendrá habilitados los formularios tradicionales de contingencia en el frontend para el registro manual de datos[cite: 1].
* **Validación de Outputs de IA:** Las respuestas conversacionales que involucren cambios en la base de datos pasarán obligatoriamente por una capa de tipado estructural con Pydantic antes de tocar los servicios de persistencia, descartando cualquier alucinación o formato malformado del modelo[cite: 1].

---

## 4. Arquitectura Técnica y Estructura del Repositorio

### 4.1 Árbol de Directorios del Repositorio
```text
bioaxis/
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── .gitignore
├── .env.example
├── docs/
│   ├── architecture.md
│   ├── setup.md
│   ├── development-guide.md
│   ├── api.md
│   ├── database.md
│   ├── security.md
│   ├── testing.md
│   ├── deployment.md
│   └── agent-memory.md
├── skills/
│   ├── define-project-scope/
│   │   └── SKILL.md
│   ├── design-database-schema/
│   │   └── SKILL.md
│   ├── validate-api-contracts/
│   │   └── SKILL.md
│   ├── run-security-audit/
│   │   └── SKILL.md
│   └── update-agent-memory/
│       └── SKILL.md
├── backend/
│   ├── requirements.txt
│   ├── main.py
│   ├── app/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   └── services/
│   └── tests/
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── next.config.js
    ├── src/
    │   ├── app/
    │   ├── components/
    │   ├── hooks/
    │   └── services/
    └── tests/
```[cite: 1]

### 4.2 Matriz de Dependencias Técnicas Cruzadas
* **Bloque 1 (Fundación):** El *Agente Orquestador Base* inicializa carpetas y documentos en `docs/`. De él dependen todos los demás bloques[cite: 1].
* **Bloque 2 (Persistencia):** El *Agente de Datos* toma el diseño funcional e implementa modelos SQL y validaciones Pydantic[cite: 1].
* **Bloque 3 (Servicios e IA):** El *Agente Backend* y el *Agente de IA* consumen los esquemas de persistencia del Bloque 2 para implementar los algoritmos e integración asíncrona con Gemini[cite: 1].
* **Bloque 4 (Presentación):** El *Agente Frontend* consume los contratos JSON expuestos y documentados en el Bloque 3 para armar las vistas en Next.js[cite: 1].

---

## 5. Catálogo Completo de Agentes y Skills Portables

### 5.1 Perfiles de Agentes Especialistas

#### 1. Agente Orquestador Base / Staff DevOps & Release Engineer
* **Responsabilidades:** Crear de forma exacta la estructura de directorios del repositorio BioAxis; inicializar archivos base de configuración (`.env.example`, `README.md`) y plantillas documentales en `docs/`[cite: 1].
* **Límites:** No escribe lógica de negocio, no altera código funcional en `backend/` o `frontend/` y no toma decisiones sobre el diseño de la base de datos[cite: 1].
* **Condición de Bloqueo:** Si detecta código preexistente en rutas que debe inicializar, debe detenerse inmediatamente y solicitar confirmación manual para evitar sobreescrituras destructivas[cite: 1].

#### 2. Agente de Datos y Backend Core / Senior Software Engineer
* **Responsabilidades:** Diseñar e implementar los modelos de datos de métricas biométricas, rutinas y nutrición en SQLAlchemy; construir esquemas de validación Pydantic; codificar la capa de servicios del motor de hipertrofia[cite: 1].
* **Límites:** No toca componentes del frontend (Next.js) ni configura infraestructura de despliegue o pipelines de CI/CD[cite: 1].
* **Condición de Bloqueo:** Detener el avance si los tipos de datos antropométricos carecen de restricciones de rango lógico (ej. pesos negativos o alturas incoherentes)[cite: 1].

#### 3. Agente de Integración de IA / Senior Prompt Engineer & AI Architect
* **Responsabilidades:** Desarrollar el conector asíncrono con la API de Gemini; diseñar el pipeline de procesamiento de lenguaje natural para extraer entrenamientos y comidas; garantizar el parseo correcto de outputs no estructurados[cite: 1].
* **Límites:** No modifica modelos de base de datos relacionales ni altera layouts o componentes visuales del frontend[cite: 1].
* **Condición de Bloqueo:** Si el modelo de Gemini cambia su contrato de respuesta o invalida los formatos de llamadas a funciones (*Tool Calling*), se detiene la integración hasta ajustar las directrices del prompt del sistema[cite: 1].

#### 4. Agente Auditor Principal / Staff Code Reviewer & QA Architect (Compuerta de Calidad)
* **Responsabilidades:** Revisar cada Pull Request o archivo generado por los demás agentes; certificar que la documentación técnica se actualice de forma concurrente con el código; ejecutar auditorías de seguridad e inyección de datos[cite: 1].
* **Límites:** No genera código funcional nuevo; actúa puramente como una compuerta de calidad y veto técnico[cite: 1].
* **Criterios de Bloqueo Absoluto:** El Auditor congelará el repositorio e impedirá cualquier avance si detecta: documentación técnica desactualizada o contradictoria con el código escrito, credenciales expuestas, datos sensibles biométricos volcándose en logs o ausencia de pruebas unitarias[cite: 1].

---

### 5.2 Definición de las 5 Skills Portables (Archivos SKILL.md)

#### Skill 1: `skills/define-project-scope/SKILL.md`
```markdown
---
name: define-project-scope
description: Se activa al inicio del Bloque 1 para validar que los objetivos, requerimientos del MVP y límites del repositorio BioAxis estén alineados antes de generar código o documentación.
---

# Propósito
Garantizar que ningún agente o desarrollador humano extienda las capacidades del sistema más allá de los límites acordados para el MVP (Next.js + FastAPI + Gemini API), evitando la introducción de features fuera de alcance[cite: 1].

# Cuándo usar esta skill
Exclusivamente durante la inicialización del proyecto o al recibir una solicitud para agregar una nueva funcionalidad al repositorio[cite: 1].

# Entradas requeridas
- Especificación funcional del MVP (Fase 2 de la planificación)[cite: 1].
- Archivo `README.md` actual del repositorio[cite: 1].

# Instrucciones de ejecución
1. Leer el archivo de especificación funcional y contrastarlo con los objetivos de optimización biológica (nutrición e hipertrofia)[cite: 1].
2. Verificar si la tarea asignada pertenece a las features prioritarias (Autenticación, Perfil Biométrico, Motor de Síntesis o Chatbot)[cite: 1].
3. Validar explícitamente que la solicitud no involucre elementos fuera de alcance (como integración con wearables, planes de CrossFit o pasarelas de pago)[cite: 1].
4. Emitir un reporte de alineación de alcance en el espacio de trabajo[cite: 1].

# Evidencia esperada
- Archivo temporal o log de auditoría `scope-validation.log` indicando estado de cumplimiento (PASS/FAIL)[cite: 1].

# Criterios de aceptación
- La feature evaluada debe encajar al 100% dentro de las fronteras del MVP sin requerir dependencias de terceros no aprobadas[cite: 1].

# Condiciones de bloqueo
- Detener inmediatamente cualquier avance si la tarea intenta introducir lógicas médicas, prescripción de fármacos o cualquier elemento marcado como fuera de alcance[cite: 1].

# Seguridad y cumplimiento
- Asegurar que las definiciones de alcance no asuman ni expongan datos personales o de infraestructura real del entorno de desarrollo[cite: 1].
```[cite: 1]

#### Skill 2: `skills/design-database-schema/SKILL.md`
```markdown
---
name: design-database-schema
description: Se activa al inicio del Bloque 2 para diseñar e implementar la estructura relacional de BioAxis en SQLAlchemy, controlando tipos de datos biométricos y restricciones de integridad.
---

# Propósito
Garantizar que el modelo de datos de BioAxis sea altamente cohesivo, normalizado y tipado de forma estricta, protegiendo la integridad de los registros de entrenamiento y nutrición de los usuarios[cite: 1].

# Cuándo usar esta skill
Exclusivamente en la fase de inicialización de la capa de persistencia del backend, antes de escribir rutas de API o controladores de servicio[cite: 1].

# Entradas requeridas
- Especificación funcional de features de perfil biométrico e historial de progreso (Fase 2)[cite: 1].
- Archivo `docs/database.md` base[cite: 1].

# Instrucciones de ejecución
1. Analizar los requerimientos de almacenamiento para perfiles de usuario (peso, grasa, perímetros), planes nutricionales y bitácoras de entrenamiento[cite: 1].
2. Diseñar las entidades utilizando SQLAlchemy declarativo, aplicando restricciones de claves primarias, foráneas y campos no nulos (`nullable=False`) en atributos críticos[cite: 1].
3. Incorporar de manera mandatoria el campo `user_id` en cada tabla dependiente para asegurar el aislamiento multi-tenant lógico[cite: 1].
4. Generar los esquemas de validación Pydantic correspondientes a cada modelo para operaciones de lectura (ORM) y escritura[cite: 1].

# Evidencia esperada
- Archivos de python en `backend/app/models/` y `backend/app/schemas/`[cite: 1].
- Script de migración base o archivo de inicialización de tablas[cite: 1].

# Criterios de aceptación
- El código debe pasar el linter sin errores de tipado[cite: 1].
- Todas las tablas deben contar con índices en los campos de búsqueda frecuentes (`user_id`, `date`)[cite: 1].

# Condiciones de bloqueo
- Detener la ejecución si se intenta plantear un esquema donde los datos de múltiples usuarios se mezclen sin un filtro determinista por `user_id`[cite: 1].

# Seguridad y cumplimiento
- Los campos de contraseñas deben definirse para almacenar hashes (ej. utilizando Bcrypt), nunca texto plano[cite: 1].
```[cite: 1]

#### Skill 3: `skills/validate-api-contracts/SKILL.md`
```markdown
---
name: validate-api-contracts
description: Se activa al diseñar o modificar endpoints en FastAPI para asegurar que los request y response cumplan estrictamente los contratos JSON acordados con el frontend Next.js.
---

# Propósito
Evitar desalineaciones de datos entre el cliente web y el servidor mediante la validación automatizada de las cargas útiles de la API a través de Pydantic[cite: 1].

# Cuándo usar esta skill
Cada vez que se cree un nuevo APIRouter en FastAPI o se requiera conectar un nuevo hook de consumo en Next.js[cite: 1].

# Entradas requeridas
- Archivo `docs/api.md` con la especificación de los endpoints esperados[cite: 1].
- Modelos Pydantic desarrollados en el backend[cite: 1].

# Instrucciones de ejecución
1. Revisar que cada ruta en FastAPI declare explícitamente su parámetro `response_model`[cite: 1].
2. Validar que los códigos de estado HTTP devueltos sean semánticamente correctos (200 para éxito, 201 para creación, 400 para errores de cliente, 401 para autenticación)[cite: 1].
3. Inspeccionar que las excepciones lógicas del negocio se transformen en `HTTPException` controladas[cite: 1].
4. Exportar o documentar la estructura exacta del JSON de salida para que el agente frontend configure sus interfaces TypeScript[cite: 1].

# Evidencia esperada
- Rutas implementadas en `backend/app/routers/`[cite: 1].
- Actualización detallada del archivo `docs/api.md`[cite: 1].

# Criterios de aceptación
- Cero rutas que devuelvan diccionarios puros de Python (`dict`) sin un esquema de Pydantic que los gobierne[cite: 1].
- Pruebas de integración que simulen payloads corruptos y verifiquen que la API responda con un estado `422 Unprocessable Entity`[cite: 1].

# Condiciones de bloqueo
- Se bloquea la integración si el backend altera un campo del JSON de respuesta sin actualizar simultáneamente el tipado correspondiente en la documentación de la API[cite: 1].

# Seguridad y cumplimiento
- Ningún contrato de API debe exponer tokens de acceso o contraseñas en los cuerpos de respuesta de los endpoints públicos[cite: 1].
```[cite: 1]

#### Skill 4: `skills/run-security-audit/SKILL.md`
```markdown
---
name: run-security-audit
description: Se activa de manera mandatoria antes de cerrar cada bloque técnico para auditar la exposición de secretos, el manejo de logs y el aislamiento multi-tenant en el código.
---

# Propósito
Garantizar que el código escrito en el backend (FastAPI) y frontend (Next.js) no comprometa la privacidad de las métricas físicas de los usuarios ni exponga las credenciales de infraestructura[cite: 1].

# Cuándo usar esta skill
Al final de cada sprint o bloque de desarrollo, antes de enviar un Pull Request a la rama `develop` o `main`[cite: 1].

# Entradas requeridas
- Código fuente modificado en el bloque actual[cite: 1].
- Archivo `.env.example`[cite: 1].
- Directrices de seguridad en `docs/security.md`[cite: 1].

# Instrucciones de ejecución
1. Escanear todos los archivos modificados buscando cadenas de texto que asemejen tokens de la API de Gemini, contraseñas de bases de datos o llaves JWT[cite: 1].
2. Revisar los controladores y consultas a la base de datos para certificar que todas las peticiones incluyan el filtro mandatorio por el `user_id` del token JWT[cite: 1].
3. Inspeccionar las declaraciones de logging en el backend para comprobar que ningún payload antropométrico sensible o dato en texto plano se esté guardando en los archivos de salida[cite: 1].
4. Validar que las entradas del usuario en el chat pasen por esquemas Pydantic antes de interactuar con las capas internas del software[cite: 1].

# Evidencia esperada
- Reporte técnico de vulnerabilidades de seguridad depositado en `docs/security-audit-report.md`[cite: 1].

# Criterios de aceptación
- Cero llaves privadas expuestas en los commits o código fuente[cite: 1].
- Verificación exitosa de que no existen consultas SQL construidas por concatenación directa de strings[cite: 1].

# Condiciones de bloqueo
- Bloquear de forma absoluta el merge o la entrega si se detecta una sola API key real, un log con información biométrica expuesta o una ruta desprotegida sin validación de identidad[cite: 1].

# Seguridad y cumplimiento
- Esta skill es la máxima salvaguarda de cumplimiento ético y técnico del sistema; sus fallos son de criticidad alta[cite: 1].
```[cite: 1]

#### Skill 5: `skills/update-agent-memory/SKILL.md`
```markdown
---
name: update-agent-memory
description: Se activa al cierre de cada bloque o sprint para consolidar el estado del arte del proyecto, decisiones de diseño, deudas técnicas y directrices de continuidad.
---

# Propósito
Mantener una memoria de largo plazo fidedigna y estructurada para que humanos u otros agentes de IA puedan continuar el desarrollo de BioAxis sin pérdida de contexto técnico[cite: 1].

# Cuándo usar esta skill
Al final de cada ciclo de trabajo o hito importante del desarrollo, antes de entregar los resultados al usuario[cite: 1].

# Entradas requeridas
- Código modificado en el bloque actual[cite: 1].
- Estado previo de `docs/agent-memory.md`[cite: 1].

# Instrucciones de ejecución
1. Realizar una lectura exhaustiva de los cambios realizados en el espacio de trabajo durante el sprint[cite: 1].
2. Identificar qué decisiones técnicas fueron consolidadas (ej. cambios en el ORM, nuevas dependencias de Python o npm)[cite: 1].
3. Clasificar los supuestos que pasaron a estar validados y registrar los nuevos riesgos técnicos descubiertos[cite: 1].
4. Redactar de forma concisa los próximos pasos sugeridos, detallando de qué archivos o módulos deben hacerse cargo los siguientes agentes[cite: 1].

# Evidencia esperada
- Archivo `docs/agent-memory.md` actualizado con un nuevo bloque de historial fechado[cite: 1].

# Criterios de aceptación
- La documentation debe reflejar con total fidelidad el estado actual del código del repositorio. No se permiten hojas de ruta abstractas; deben ser tareas técnicas concretas[cite: 1].

# Condiciones de bloqueo
- Romper el flujo si existen contradicciones entre lo que dice la memoria del agente y lo que realmente está implementado en el backend o frontend[cite: 1].

# Seguridad y cumplimiento
- Prohibido dejar anotaciones en la memoria que hagan alusión a credenciales temporales, accesos de desarrollo reales o datos personales del desarrollador[cite: 1].
```[cite: 1]

---

## 6. Paquete Documental Obligatorio (`docs/`)

Para dar soporte a la continuidad absoluta del desarrollo, el repositorio contará con las siguientes especificaciones técnicas detalladas dentro del directorio de documentación[cite: 1]:

* **`docs/architecture.md`:** Detalla la arquitectura desacoplada, el flujo de datos asíncrono hacia Gemini API y el middleware de manejo de excepciones globales de FastAPI[cite: 1].
* **`docs/setup.md`:** Instrucciones de instalación local, versiones requeridas (Python 3.11+, Node.js 18+) y mecanismos de migración de la base de datos[cite: 1].
* **`docs/development-guide.md`:** Convenciones de estilo de código, requerimiento de nombres en inglés, flujos de ramas Git y linters configurados[cite: 1].
* **`docs/api.md`:** Catálogo de endpoints con ejemplos de peticiones, códigos de respuesta HTTP y contratos JSON gobernados por Pydantic[cite: 1].
* **`docs/database.md`:** Diagrama lógico de entidades, tipos de datos para variables antropométricas y estrategias de indexación[cite: 1].
* **`docs/security.md`:** Políticas de hashing de contraseñas, middleware de sanitización de logs frente a datos biométricos y rate-limiting para llamadas de IA[cite: 1].
* **`docs/testing.md`:** Configuración de Pytest para el backend y Jest para el frontend, definiendo los mocks requeridos para simular las llamadas a Gemini sin consumir cuotas reales[cite: 1].
* **`docs/agent-memory.md`:** Documento vivo de memoria a largo plazo que registra el avance técnico paso a paso para garantizar una transición fluida entre agentes[cite: 1].