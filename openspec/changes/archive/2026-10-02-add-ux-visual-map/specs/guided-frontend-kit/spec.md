# Spec Delta

## MODIFIED Requirements

### Requirement: Generic agent skill
El repositorio SHALL incluir una skill genérica en formato agent-skills (`skills/ai-frontend-guide/SKILL.md`, con frontmatter `name` y `description`) que enseñe a usar la herramienta: principio reuse-first, intake y tres fases on-demand, herramientas `find`/`get`, memoria, consentimiento previo de Laya (`--confirmed`), reglas de licencia y uso de las skills externas, del mapa visual con el MCP Excalidraw y de Playwright MCP en el pulimiento. La skill SHALL ser instalable con `npx skills add <repo> --skill ai-frontend-guide` y NO SHALL duplicar el contenido completo del kit: SHALL apuntar a `AGENTS.md` y a las guías.

#### Scenario: Instalación de la skill
- **WHEN** un agente o usuario ejecuta `npx skills add urben88/ai-frontend-guide-kit --skill ai-frontend-guide`
- **THEN** la skill queda instalada para los agentes detectados y el agente conoce el flujo y las herramientas del kit

#### Scenario: Uso desde la skill
- **WHEN** un agente lee `SKILL.md`
- **THEN** sabe que debe leer `ai-frontend-guide-kit/AGENTS.md`, preguntar el intake antes de enrutar, seguir las tres fases, actualizar el mapa visual con la skill `ux-map` y no ejecutar Laya sin `--confirmed`

#### Scenario: Sin duplicación
- **WHEN** el kit evoluciona
- **THEN** la skill sigue siendo un puntero breve (no una copia de las guías) y no requiere actualización de contenido salvo cambios de flujo

### Requirement: UX phase integration
La capa de conciencia (`AGENTS.md`) y la skill genérica (`SKILL.md`) SHALL documentar la fase UX como primera fase del flujo, los cuatro caminos (sin UX, resumen, rediseño, auditoría), el comando de contexto (`tools/context.mjs`), la salida del mapa visual (`ux-map.excalidraw`) con el MCP Excalidraw y la regla de no rediseñar sin elección explícita del usuario. El mapa de la guía 00 SHALL reflejar el router de tres fases con la fase UX como primera fase, el intake previo y el mapa visual entre las salidas de la fase.

#### Scenario: Agente entra al repo con UX
- **WHEN** un agente lee `AGENTS.md` o `SKILL.md` en un proyecto con UX existente
- **THEN** sabe que debe analizar el contexto, preguntar el modo (resumir o rediseñar) y registrar los resultados en `ai-frontend-output/ux/`, incluido el mapa visual

#### Scenario: Mapa actualizado
- **WHEN** un agente sigue la guía `00-START-HERE.md`
- **THEN** encuentra el intake, las tres fases como puntos de entrada, los cuatro caminos de la fase UX con sus salidas y el mapa visual con su MCP

### Requirement: Incremental iteration path
El kit SHALL incluir una guía corta de iteración (`09-ITERATE.md`) para cambios pequeños y añadidos personalizados con el loop mínimo: localizar el bloque en `UX-SPEC`/código, consultar combinaciones y catálogo, decidir reuse/adapt/build, aplicar la filosofía y pulir con la skill de pulimiento, registrando la decisión en memoria. Si el cambio altera pantallas o navegación, el loop SHALL actualizar el mapa visual con la skill `ux-map`. El loop SHALL poder ejecutarse sin repetir las guías completas.

#### Scenario: Cambio pequeño
- **WHEN** el usuario pide ajustar un bloque existente
- **THEN** el agente localiza el bloque, consulta memoria/catálogo, aplica el cambio y lo registra sin rehacer la fase UX

#### Scenario: Componente personalizado
- **WHEN** el usuario pide algo nuevo que no está en el catálogo
- **THEN** el agente busca primero en combinaciones y catálogo, construye custom siguiendo la guía de filosofía y registra la justificación

#### Scenario: Cambio que toca la navegación
- **WHEN** el cambio añade, elimina o renombra pantallas o transiciones
- **THEN** el agente actualiza `ux-map.excalidraw` de forma incremental con la skill `ux-map` antes de cerrar la iteración

## ADDED Requirements

### Requirement: Visual UX map skill
El repositorio SHALL incluir la skill `skills/ux-map/SKILL.md` (frontmatter `name`/`description` con disparadores de mapa visual de pantallas, excalidraw, wireframe de navegación y actualización del mapa) que contenga: la receta de layout (columnas por área, tamaños, colores preset, formato estable de etiqueta con el nombre exacto de `UX-SPEC.md`), el uso de las herramientas del MCP de Excalidraw (`createNode`, `createEdge`, `deleteElement`, `getFullDiagramState`), el protocolo de mantenimiento incremental (leer estado antes de tocar, operar por etiqueta, conservar retoques manuales), el snapshot `ux-map-baseline.excalidraw` en rediseño y el fallback de edición directa del JSON sin MCP. La skill NO SHALL modificar las skills vendorizadas (`userflow`/`flow-*`) y SHALL instalarse como parte de las skills del kit.

#### Scenario: Skill instalada
- **WHEN** se ejecuta el instalador sin `--no-skills`
- **THEN** `.agents/skills/ux-map/SKILL.md` existe y describe la receta, el mantenimiento y el fallback

#### Scenario: Uso desde la skill
- **WHEN** el agente necesita generar o actualizar el mapa visual
- **THEN** sigue la receta (áreas, colores, etiquetas con nombres de `UX-SPEC.md`) y el protocolo incremental, verificando el resultado con `getFullDiagramState`

#### Scenario: Skills vendorizadas intactas
- **WHEN** se actualiza la skill `ux-map`
- **THEN** las skills `userflow`/`flow-*` permanecen sin cambios y el script de sincronización no se ve afectado
