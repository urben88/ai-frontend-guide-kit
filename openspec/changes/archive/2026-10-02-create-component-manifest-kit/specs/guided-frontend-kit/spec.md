# Spec Delta

## Purpose

Empaqueta el catálogo y el flujo de diseño UX/UI estandarizado en una carpeta guiada autocontenida que se copia a cualquier proyecto frontend, para que el agente reutilice componentes existentes antes de crear y aplique la filosofía de diseño con mínimo consumo de tokens.

## ADDED Requirements

### Requirement: Self-contained guided folder
El kit SHALL ser una carpeta autocontenida (`ai-frontend-guide/`) copiable sin compilación ni instalación, y SHALL funcionar con rutas relativas dentro del repo destino.

#### Scenario: Copia a un proyecto
- **WHEN** el usuario copia la carpeta al repo destino
- **THEN** las guías, el catálogo y las herramientas funcionan sin pasos de build ni dependencias adicionales (salvo Node para `find`/`get`)

### Requirement: Awareness entry point
El kit SHALL incluir `AGENTS.md` como capa de conciencia (≤ ~1 página) que declare qué contiene el kit, el alcance del catálogo (nº de fuentes/categorías/entradas), la regla reuse-first y cómo navegar las guías y herramientas.

#### Scenario: Agente entra al repo
- **WHEN** un agente lee `AGENTS.md`
- **THEN** sabe que existe un catálogo con N fuentes y que debe consultarlo antes de crear componentes desde cero

### Requirement: Guided workflow steps
El kit SHALL incluir guías breves (≤ ~120 líneas cada una) numeradas que conduzcan el flujo completo: anclaje de negocio, tokens de diseño, inventario de componentes, búsqueda en catálogo, decisión reutilizar/adaptar/crear, instalación, adaptación, filosofía y verificación.

#### Scenario: Flujo completo
- **WHEN** el agente sigue las guías en orden
- **THEN** produce el inventario de componentes, selecciona candidatos del catálogo, los instala o adapta y verifica con Playwright

#### Scenario: Sin Figma
- **WHEN** el proyecto no dispone de Figma MCP
- **THEN** la guía de tokens ofrece el fallback de derivar tokens desde `PRODUCT.md` y la filosofía del kit

### Requirement: Reuse-first decision
El flujo SHALL exigir consultar el catálogo antes de crear cualquier componente y SHALL aplicar un árbol de decisión explícito: reutilizar (licencia y stack compatibles), adaptar (tokens/tema) o crear solo si no existe alternativa adecuada, registrando la justificación.

#### Scenario: Componente existente compatible
- **WHEN** el inventario identifica una necesidad cubierta por el catálogo con licencia y stack compatibles
- **THEN** el agente reutiliza o adapta ese componente en lugar de crearlo desde cero

#### Scenario: Nada compatible
- **WHEN** ningún componente del catálogo cumple los requisitos
- **THEN** el agente crea el componente siguiendo la filosofía del kit y documenta por qué no reutilizó

### Requirement: Design philosophy distillation
El kit SHALL incluir una guía de filosofía que destile las reglas aplicables de `impeccable` (anti-genérico, auditoría de acabado), `taste-skill` (jerarquía, densidad, proporciones) y `emilkowalski` (springs, micro-feedback, `whileTap`), más las reglas de combinación (p. ej. máximo 1–2 efectos de alto impacto por vista).

#### Scenario: Reglas aplicables sin skills instaladas
- **WHEN** el proyecto destino no tiene las skills instaladas
- **THEN** el agente puede aplicar las reglas destiladas de la guía de filosofía

### Requirement: Token-efficient query tools
El kit SHALL incluir herramientas locales (`tools/find.*`, `tools/get.*`) que consulten el catálogo con salidas mínimas: `find` filtra por categoría/stack/licencia/free y devuelve IDs con resúmenes cortos; `get` devuelve la ficha de una entrada con su comando de instalación. Las guías NO SHALL requerir cargar todos los JSON de fuentes.

#### Scenario: Búsqueda filtrada
- **WHEN** el agente ejecuta `find --category hero --stack react --commercial`
- **THEN** recibe una lista corta de candidatos compatibles

#### Scenario: Ficha de implementación
- **WHEN** el agente ejecuta `get <id>`
- **THEN** recibe descripción, licencia, dependencias, comando de instalación y enlaces de la entrada

### Requirement: No third-party code vendoring
El kit SHALL contener únicamente metadatos, guías y enlaces; NO SHALL incluir código fuente de componentes de terceros.

#### Scenario: Distribución del kit
- **WHEN** el kit se copia o comparte
- **THEN** ninguna porción de código de componentes de terceros viaja con él

### Requirement: MCP-forward data contract
Los datos y la semántica de consulta del kit (índice, fichas, `find`/`get`) SHALL ser estables y reutilizables por el futuro servidor MCP sin transformación de esquema.

#### Scenario: Futuro MCP
- **WHEN** se implemente el cambio `add-component-mcp-server`
- **THEN** el servidor expone las mismas consultas (list/find/get) leyendo los mismos archivos del catálogo
