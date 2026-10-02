# component-catalog Specification

## Purpose
Define y publica el catálogo normalizado de fuentes de componentes UI reutilizables: qué fuentes existen, qué ofrecen, con qué licencia, dónde encontrarlas y cómo implementarlas, en un formato ligero y fiable para agentes de IA.

## Requirements

### Requirement: Source registry
El catálogo SHALL registrar cada fuente con su URL oficial, URL del catálogo, categorías, modelo de coste (free/paid), licencia, método de obtención de código, canal de extracción y granularidad acordada.

#### Scenario: Fuente registrada
- **WHEN** se añade una fuente al catálogo
- **THEN** el registro incluye official_url, catalog_url, categories, free/paid, license_type, code_retrieval_method, extraction_channel y granularity
- **AND** la fuente queda fechada con `verified_at`

#### Scenario: Fuente no verificable
- **WHEN** una fuente candidata no puede verificarse en su sitio oficial
- **THEN** no se publica en el índice maestro y queda registrada como pendiente (TODO)

### Requirement: Normalized entry schema
Cada entrada SHALL cumplir `manifest/schema.json` y contener al menos: `id`, `name`, `source`, `entry_type` (component | block | design-system), `category` (taxonomía normalizada), `description`, `use_case`, `search_tags`, `docs_url`, `stack`, `dependencies`, `install_method`, `install_command`, `registry_url` (si aplica), `license_type`, `commercial_use`, `free` y `verified_at`.

#### Scenario: Entrada válida
- **WHEN** una entrada se genera con todos los campos requeridos
- **THEN** pasa la validación automatizada contra `schema.json`

#### Scenario: Entrada incompleta
- **WHEN** una entrada carece de un campo requerido
- **THEN** la validación falla y la entrada no se publica

#### Scenario: Decision-support metadata
- **WHEN** un agente consulta una entrada
- **THEN** obtiene respuesta a "qué es / para qué sirve" (`description`, `use_case`, `decision_hints`), "dónde buscarlo" (`source`, `docs_url`, `registry_url`) y "cómo implementarlo" (`install_method`, `install_command`, `manual_steps`, `dependencies`)

### Requirement: License and usage metadata
El catálogo SHALL distinguir la licencia (`license_type`: MIT | Apache-2.0 | proprietary | custom | non-commercial | unknown) y la viabilidad comercial (`commercial_use`: true | false | conditional). Las entradas no redistribuibles NO SHALL transportar código fuente de terceros.

#### Scenario: Componente no comercial
- **WHEN** una entrada proviene de una fuente con licencia no comercial (p. ej. código original de Agents Kit)
- **THEN** queda marcada `license_type: non-commercial` y `commercial_use: false`, con nota de permiso escrito requerido

#### Scenario: Licencia desconocida
- **WHEN** la licencia por entrada no es verificable
- **THEN** se marca `license_type: unknown` y el kit advierte revisión manual antes de usarla

### Requirement: Extraction per channel
El pipeline SHALL soportar extracción por canal: registry JSON compatible con shadcn, `llms.txt`/sitemap, GitHub raw/tree API, endpoints públicos documentados y navegación asistida por agente para páginas sin estructura. La extracción SHALL respetar `robots.txt` y los ToS de cada fuente.

#### Scenario: Fuente con registry
- **WHEN** la fuente expone un registry JSON (p. ej. `/r/registry.json`)
- **THEN** la extracción es automatizada y filtra entradas premium o no accesibles

#### Scenario: Fuente sin datos estructurados
- **WHEN** la fuente no expone endpoints estructurados
- **THEN** la extracción la realiza un subagente de investigación y cada entrada registra la URL de evidencia

#### Scenario: Restricción de ToS
- **WHEN** una fuente prohíbe el scraping o la recolección automatizada
- **THEN** solo se usan canales sancionados (sitemap, markdown público, API oficial, GitHub) y nunca rastreo masivo

### Requirement: Curated granularity
El catálogo SHALL indexar completo cada fuente de hasta ~200 entradas y SHALL curar por categoría (top configurable, por defecto 30) las fuentes masivas, indicando cómo ampliar al inventario completo.

#### Scenario: Fuente masiva
- **WHEN** una fuente supera el umbral de entradas indexables
- **THEN** se indexan las top N por categoría y el índice documenta la URL para ampliar

### Requirement: Two-layer catalog
El catálogo SHALL publicarse en dos capas: un índice ligero (`component-manifest.json` con fuentes, conteos, categorías y rutas) y fichas por fuente (`sources/<source>.json`), de modo que un agente conozca el alcance total sin cargar todas las entradas.

#### Scenario: Consulta ligera
- **WHEN** un agente lee el índice maestro
- **THEN** conoce fuentes, conteos y rutas de detalle sin cargar los JSON completos

### Requirement: Install guides
El catálogo SHALL incluir guías de instalación por fuente (`install-guides.md`) con prerequisitos, comandos exactos npm/CLI, procedimiento de copia manual, dependencias, compatibilidad de stack/Tailwind y limitaciones del plan gratuito.

#### Scenario: Instalación documentada
- **WHEN** el agente decide usar un componente
- **THEN** la guía de su fuente ofrece el comando exacto o el procedimiento manual y las dependencias necesarias

#### Scenario: Límite gratuito
- **WHEN** la fuente limita el uso gratuito (p. ej. cuota de copias diaria)
- **THEN** la guía lo documenta explícitamente

### Requirement: Validation
El pipeline SHALL validar el catálogo antes de publicarlo: schema, enlaces por muestreo e instalación real de una muestra de componentes en un proyecto sandbox.

#### Scenario: Validación de publicación
- **WHEN** se genera una versión del catálogo
- **THEN** las validaciones de schema y enlaces pasan y la muestra de instalación compila en el sandbox

### Requirement: Refresh
Cada entrada SHALL registrar `verified_at` y el catálogo SHALL poder regenerarse por fuente mediante scripts de refresco, sin edición manual de los JSON.

#### Scenario: Refresco de una fuente
- **WHEN** se ejecuta el script de refresco de una fuente
- **THEN** se actualizan únicamente `sources/<source>.json` y el índice, conservando el schema
