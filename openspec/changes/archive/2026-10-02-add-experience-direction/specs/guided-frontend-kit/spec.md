# guided-frontend-kit Specification

## MODIFIED Requirements

### Requirement: Guided workflow steps

El kit SHALL incluir guías breves (≤ ~120 líneas cada una) organizadas en tres fases: **Teoría y UX** (dirección de experiencia `01-EXPERIENCE-DIRECTION`, contexto, flujos probados con `userflow` en `02-UX-FLOWS`, tokens en `03-TOKENS`), **Composición** (inventario `04`, búsqueda `05`, decisión `06`, adaptación `07`) y **Pulimiento total** (`08-PHILOSOPHY`, `09-VERIFY`, auditorías externas, bucle Playwright MCP y regresión). El router `00-START-HERE.md` SHALL presentar las tres fases como puntos de entrada con su camino mínimo por casuística, y las guías individuales SHALL seguir siendo breves y autocontenidas.

#### Scenario: Flujo completo

- **WHEN** el agente sigue las fases en orden para un proyecto nuevo
- **THEN** produce primero `EXPERIENCE-BRIEF.md` (arquetipo, filosofía y dirección), luego `UX-SPEC` (pantallas, flujos y estados), después el inventario de componentes, selecciona candidatos del catálogo, los instala o adapta y cierra con el pulimiento y la verificación

#### Scenario: Sin Figma

- **WHEN** el proyecto no dispone de Figma MCP
- **THEN** la guía de tokens ofrece el fallback de derivar tokens desde el brief visual, `PRODUCT.md` y la filosofía del kit

### Requirement: Generic agent skill

El repositorio SHALL incluir una skill genérica en formato agent-skills (`skills/ai-frontend-guide/SKILL.md`, con frontmatter `name` y `description`) que enseñe a usar la herramienta: principio reuse-first, intake y tres fases on-demand, herramientas `find`/`get`, memoria, consentimiento de Laya una vez por sesión (`--confirmed` por llamada), reglas de licencia y uso de las skills externas, del mapa visual con el MCP Excalidraw y de Playwright MCP en el pulimiento, además de la fase de dirección de experiencia (`experience/`, `EXPERIENCE-BRIEF.md`) y de los usos de Laya para preguntas, dirección y componentes. La skill SHALL ser instalable con `npx skills add <repo> --skill ai-frontend-guide` y NO SHALL duplicar el contenido completo del kit: SHALL apuntar a `AGENTS.md` y a las guías.

#### Scenario: Instalación de la skill

- **WHEN** un agente o usuario ejecuta `npx skills add urben88/ai-frontend-guide-kit --skill ai-frontend-guide`
- **THEN** la skill queda instalada para los agentes detectados y el agente conoce el flujo y las herramientas del kit

#### Scenario: Uso desde la skill

- **WHEN** un agente lee `SKILL.md`
- **THEN** sabe que debe leer `ai-frontend-guide-kit/AGENTS.md`, preguntar el intake antes de enrutar, empezar un proyecto nuevo por la dirección de experiencia, actualizar el mapa visual con la skill `ux-map` y pedir consentimiento de Laya una vez por sesión

#### Scenario: Sin duplicación

- **WHEN** el kit evoluciona
- **THEN** la skill sigue siendo un puntero breve (no una copia de las guías) y no requiere actualización de contenido salvo cambios de flujo

### Requirement: Selection memory integration

La integración del kit SHALL documentar el sistema de memoria en la capa de conciencia (`AGENTS.md`), en la skill genérica (`SKILL.md`) y en las guías: comprobar combinaciones guardadas antes de buscar (`05-FIND`) y registrar cada decisión con la herramienta de memoria (`06-REUSE`), pudiendo citar la dirección elegida con `--ref "direction:<id>"`.

#### Scenario: Agente lee la capa de conciencia

- **WHEN** un agente lee `AGENTS.md` o `SKILL.md`
- **THEN** encuentra los comandos de memoria (`add`, `list`, `summary`, `combo …`) y la regla de registrar cada decisión

#### Scenario: Flujo de búsqueda con memoria

- **WHEN** el agente llega al paso de búsqueda
- **THEN** la guía le indica comprobar `memory.mjs combo list` antes de consultar el catálogo

### Requirement: UX phase integration

La capa de conciencia (`AGENTS.md`) y la skill genérica (`SKILL.md`) SHALL documentar la fase UX como primera fase del flujo, la dirección de experiencia (`01-EXPERIENCE-DIRECTION`) como su primer paso, los cuatro caminos de los flujos (sin UX, resumen, rediseño, auditoría) en `02-UX-FLOWS`, el comando de contexto (`tools/context.mjs`), las salidas (`EXPERIENCE-BRIEF.md`, `ux-map.excalidraw`) y la regla de no rediseñar sin elección explícita del usuario. El mapa de la guía 00 SHALL reflejar el router de tres fases con la fase UX como primera fase, el intake previo y la dirección de experiencia entre las salidas de la fase.

#### Scenario: Agente entra al repo con UX

- **WHEN** un agente lee `AGENTS.md` o `SKILL.md` en un proyecto con UX existente
- **THEN** sabe que debe analizar el contexto, preguntar el modo (resumir o rediseñar) y registrar los resultados en `ai-frontend-output/ux/`, incluidos el brief de dirección y el mapa visual

#### Scenario: Mapa actualizado

- **WHEN** un agente sigue la guía `00-START-HERE.md`
- **THEN** encuentra el intake, las tres fases como puntos de entrada, la dirección de experiencia con su brief y los cuatro caminos de los flujos con sus salidas

### Requirement: Incremental iteration path

El kit SHALL incluir una guía corta de iteración (`10-ITERATE.md`) para cambios pequeños y añadidos personalizados con el loop mínimo: localizar el bloque en `UX-SPEC`/código, consultar combinaciones y catálogo, decidir reuse/adapt/build, aplicar la filosofía y pulir con la skill de pulimiento, registrando la decisión en memoria. Si el cambio altera pantallas o navegación, el loop SHALL actualizar el mapa visual con la skill `ux-map`. El loop SHALL poder ejecutarse sin repetir las guías completas.

#### Scenario: Cambio pequeño

- **WHEN** el usuario pide ajustar un bloque existente
- **THEN** el agente localiza el bloque, consulta memoria/catálogo, aplica el cambio y lo registra sin rehacer la fase UX

#### Scenario: Componente personalizado

- **WHEN** el usuario pide algo nuevo que no está en el catálogo
- **THEN** el agente busca primero en combinaciones y catálogo, construye custom siguiendo la guía de filosofía y registra la justificación

#### Scenario: Cambio que toca la navegación

- **WHEN** el cambio añade, elimina o renombra pantallas o transiciones
- **THEN** el agente actualiza `ux-map.excalidraw` de forma incremental con la skill `ux-map` antes de cerrar la iteración

### Requirement: Total polish phase with Playwright MCP

El kit SHALL incluir una skill de pulimiento (`skills/frontend-polish/SKILL.md`) que: (a) use las skills externas instaladas (impeccable audit/polish, taste-skill, emilkowalski `review-animations`/`improve-animations`) cuando estén disponibles; (b) ejecute un bucle visual con Playwright MCP (navegar, snapshot de accesibilidad, capturas de estados hover/focus/loading/empty/error, consola sin errores, teclado, reduced-motion y responsive) corrigiendo y repitiendo; (c) cierre con la regresión `@playwright/test` de la guía `09-VERIFY`; y (d) funcione con fallback (checklist de `08-PHILOSOPHY`/`09-VERIFY`) cuando falten herramientas, sin bloquear el flujo. El pulimiento SHALL respetar el presupuesto de 1–2 efectos de alto impacto por vista y la lista anti-genérica del brief.

#### Scenario: Pulido con herramientas completas

- **WHEN** el usuario pide pulir una pantalla y las skills externas y Playwright MCP están disponibles
- **THEN** el agente ejecuta las auditorías, recorre los estados con Playwright MCP, corrige los hallazgos y cierra con la regresión y el checklist

#### Scenario: Fallback sin herramientas

- **WHEN** Playwright MCP o las skills externas no están disponibles
- **THEN** el agente aplica el checklist destilado de `08-PHILOSOPHY`/`09-VERIFY` y deja constancia de las herramientas ausentes

#### Scenario: Presupuesto de efectos

- **WHEN** el pulido propone añadir animaciones o efectos
- **THEN** el resultado mantiene máximo 1–2 efectos de alto impacto por vista

### Requirement: Visual UX map skill

El repositorio SHALL incluir la skill `skills/ux-map/SKILL.md` (frontmatter `name`/`description` con disparadores de mapa visual de pantallas, excalidraw, wireframe de navegación y actualización del mapa) que contenga: la receta direction-aware (plantillas por `navigation_model`: `one-page`, `flow`, `hub`, `catalog`, `console`, `tree`; áreas/colores desde la IA del brief; filas por etapas del journey; formato estable de etiqueta con el nombre exacto de `UX-SPEC.md`; leyenda `Dirección · Navegación · P(fit)`), el uso de las herramientas del MCP de Excalidraw local (`createNode`, `createEdge`, `deleteElement`, `getFullDiagramState`), el protocolo de mantenimiento incremental (leer estado antes de tocar, operar por etiqueta, conservar retoques manuales), el snapshot `ux-map-baseline.excalidraw` en rediseño y el fallback de edición directa del JSON sin MCP. La skill NO SHALL modificar las skills vendorizadas (`userflow`/`flow-*`) y SHALL instalarse como parte de las skills del kit.

#### Scenario: Skill instalada

- **WHEN** se ejecuta el instalador sin `--no-skills`
- **THEN** `.agents/skills/ux-map/SKILL.md` existe y describe las plantillas direction-aware, el mantenimiento y el fallback

#### Scenario: Uso desde la skill

- **WHEN** el agente necesita generar o actualizar el mapa visual
- **THEN** lee `EXPERIENCE-BRIEF.md` y `UX-SPEC.md`, elige la plantilla del `navigation_model`, aplica áreas/colores del brief y verifica el resultado con `getFullDiagramState`

#### Scenario: Skills vendorizadas intactas

- **WHEN** se actualiza la skill `ux-map`
- **THEN** las skills `userflow`/`flow-*` permanecen sin cambios y el script de sincronización no se ve afectado
