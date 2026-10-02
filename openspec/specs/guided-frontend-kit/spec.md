# guided-frontend-kit Specification

## Purpose
Empaqueta el catálogo y el flujo de diseño UX/UI estandarizado en una carpeta guiada autocontenida que se copia a cualquier proyecto frontend, para que el agente reutilice componentes existentes antes de crear y aplique la filosofía de diseño con mínimo consumo de tokens.

## Requirements

### Requirement: Self-contained guided folder
El kit SHALL ser una carpeta autocontenida (`ai-frontend-guide-kit/`) copiable sin compilación ni instalación, y SHALL funcionar con rutas relativas dentro del repo destino. Sus herramientas de memoria SHALL escribir en `ai-frontend-output/` (fuera de la carpeta del kit) para sobrevivir al refresco.

#### Scenario: Copia a un proyecto
- **WHEN** el usuario copia la carpeta al repo destino
- **THEN** las guías, el catálogo y las herramientas funcionan sin pasos de build ni dependencias adicionales (salvo Node para `find`/`get`/`memory`)

#### Scenario: Memoria fuera del kit
- **WHEN** el kit se refresca a una versión nueva
- **THEN** el historial y las combinaciones del proyecto permanecen en `ai-frontend-output/`

### Requirement: Awareness entry point
El kit SHALL incluir `AGENTS.md` como capa de conciencia (≤ ~1 página) que declare qué contiene el kit, el alcance del catálogo (nº de fuentes/categorías/entradas), la regla reuse-first y cómo navegar las guías y herramientas.

#### Scenario: Agente entra al repo
- **WHEN** un agente lee `AGENTS.md`
- **THEN** sabe que existe un catálogo con N fuentes y que debe consultarlo antes de crear componentes desde cero

### Requirement: Guided workflow steps
El kit SHALL incluir guías breves (≤ ~120 líneas cada una) numeradas que conduzcan el flujo completo: fase UX (contexto, flujos probados con `userflow`, UX-SPEC y modos resumir/rediseñar), anclaje de negocio, tokens de diseño, inventario de componentes, búsqueda en catálogo, decisión reutilizar/adaptar/crear, instalación, adaptación, filosofía y verificación.

#### Scenario: Flujo completo
- **WHEN** el agente sigue las guías en orden
- **THEN** produce primero la UX-SPEC (pantallas, flujos y estados), luego el inventario de componentes, selecciona candidatos del catálogo, los instala o adapta y verifica con Playwright

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

### Requirement: Generic agent skill
El repositorio SHALL incluir una skill genérica en formato agent-skills (`skills/ai-frontend-guide/SKILL.md`, con frontmatter `name` y `description`) que enseñe a usar la herramienta: principio reuse-first, orden de las guías 00–08, herramientas `find`/`get`, consentimiento previo de Laya (`--confirmed`) y reglas de licencia. La skill SHALL ser instalable con `npx skills add <repo> --skill ai-frontend-guide` y NO SHALL duplicar el contenido completo del kit: SHALL apuntar a `AGENTS.md` y a las guías.

#### Scenario: Instalación de la skill
- **WHEN** un agente o usuario ejecuta `npx skills add urben88/ai-frontend-guide-kit --skill ai-frontend-guide`
- **THEN** la skill queda instalada para los agentes detectados y el agente conoce el flujo y las herramientas del kit

#### Scenario: Uso desde la skill
- **WHEN** un agente lee `SKILL.md`
- **THEN** sabe que debe leer `ai-frontend-guide-kit/AGENTS.md`, seguir las guías en orden y no ejecutar Laya sin `--confirmed`

#### Scenario: Sin duplicación
- **WHEN** el kit evoluciona
- **THEN** la skill sigue siendo un puntero breve (no una copia de las guías) y no requiere actualización de contenido salvo cambios de flujo

### Requirement: Selection memory integration
La integración del kit SHALL documentar el sistema de memoria en la capa de conciencia (`AGENTS.md`), en la skill genérica (`SKILL.md`) y en las guías: comprobar combinaciones guardadas antes de buscar (`04-FIND`) y registrar cada decisión con la herramienta de memoria (`05-REUSE`).

#### Scenario: Agente lee la capa de conciencia
- **WHEN** un agente lee `AGENTS.md` o `SKILL.md`
- **THEN** encuentra los comandos de memoria (`add`, `list`, `summary`, `combo …`) y la regla de registrar cada decisión

#### Scenario: Flujo de búsqueda con memoria
- **WHEN** el agente llega al paso de búsqueda
- **THEN** la guía le indica comprobar `memory.mjs combo list` antes de consultar el catálogo

### Requirement: UX phase integration
La capa de conciencia (`AGENTS.md`) y la skill genérica (`SKILL.md`) SHALL documentar la fase UX como primer paso del flujo, los cuatro caminos (sin UX, resumen, rediseño, auditoría), el comando de contexto (`tools/context.mjs`) y la regla de no rediseñar sin elección explícita del usuario. El mapa de la guía 00 SHALL reflejar el reemplazo de `01-ANCHOR` por `01-UX-FLOWS`.

#### Scenario: Agente entra al repo con UX
- **WHEN** un agente lee `AGENTS.md` o `SKILL.md` en un proyecto con UX existente
- **THEN** sabe que debe analizar el contexto, preguntar el modo (resumir o rediseñar) y registrar los resultados en `ai-frontend-output/ux/`

#### Scenario: Mapa actualizado
- **WHEN** un agente sigue la guía `00-START-HERE.md`
- **THEN** encuentra la fase UX como paso 1 y los cuatro caminos con sus salidas
