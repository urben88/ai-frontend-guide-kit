# Spec Delta

## MODIFIED Requirements

### Requirement: Guided workflow steps
El kit SHALL incluir guías breves (≤ ~120 líneas cada una) organizadas en tres fases: **Teoría y UX** (contexto, flujos probados con `userflow`, `UX-SPEC`, tokens), **Composición** (inventario, búsqueda en catálogo, decisión reutilizar/adaptar/crear, instalación, adaptación e interacciones) y **Pulimiento total** (auditorías externas, bucle Playwright MCP y regresión). El router `00-START-HERE.md` SHALL presentar las tres fases como puntos de entrada con su camino mínimo por casuística, y las guías individuales SHALL seguir siendo breves y autocontenidas.

#### Scenario: Flujo completo
- **WHEN** el agente sigue las fases en orden para un proyecto nuevo
- **THEN** produce primero la UX-SPEC (pantallas, flujos y estados), luego el inventario de componentes, selecciona candidatos del catálogo, los instala o adapta y cierra con el pulimiento y la verificación

#### Scenario: Sin Figma
- **WHEN** el proyecto no dispone de Figma MCP
- **THEN** la guía de tokens ofrece el fallback de derivar tokens desde `PRODUCT.md` y la filosofía del kit

### Requirement: Design philosophy distillation
El kit SHALL incluir una guía de filosofía que destile las reglas aplicables de `impeccable` (anti-genérico, auditoría de acabado), `taste-skill` (jerarquía, densidad, proporciones) y `emilkowalski` (springs, micro-feedback, `whileTap`), más las reglas de combinación (p. ej. máximo 1–2 efectos de alto impacto por vista). Cuando las skills externas estén instaladas, el flujo SHALL cargarlas en su fase (emilkowalski al componer interacciones; impeccable/taste al pulir) y SHALL usar la guía destilada como fallback.

#### Scenario: Reglas aplicables sin skills instaladas
- **WHEN** el proyecto destino no tiene las skills instaladas
- **THEN** el agente puede aplicar las reglas destiladas de la guía de filosofía

#### Scenario: Skills externas disponibles
- **WHEN** las skills externas están instaladas
- **THEN** el flujo las invoca en la fase correspondiente (composición o pulimiento) en lugar de depender solo de las reglas destiladas

### Requirement: Generic agent skill
El repositorio SHALL incluir una skill genérica en formato agent-skills (`skills/ai-frontend-guide/SKILL.md`, con frontmatter `name` y `description`) que enseñe a usar la herramienta: principio reuse-first, intake y tres fases on-demand, herramientas `find`/`get`, memoria, consentimiento previo de Laya (`--confirmed`), reglas de licencia y uso de las skills externas y Playwright MCP en el pulimiento. La skill SHALL ser instalable con `npx skills add <repo> --skill ai-frontend-guide` y NO SHALL duplicar el contenido completo del kit: SHALL apuntar a `AGENTS.md` y a las guías.

#### Scenario: Instalación de la skill
- **WHEN** un agente o usuario ejecuta `npx skills add urben88/ai-frontend-guide-kit --skill ai-frontend-guide`
- **THEN** la skill queda instalada para los agentes detectados y el agente conoce el flujo y las herramientas del kit

#### Scenario: Uso desde la skill
- **WHEN** un agente lee `SKILL.md`
- **THEN** sabe que debe leer `ai-frontend-guide-kit/AGENTS.md`, preguntar el intake antes de enrutar, seguir las tres fases y no ejecutar Laya sin `--confirmed`

#### Scenario: Sin duplicación
- **WHEN** el kit evoluciona
- **THEN** la skill sigue siendo un puntero breve (no una copia de las guías) y no requiere actualización de contenido salvo cambios de flujo

### Requirement: UX phase integration
La capa de conciencia (`AGENTS.md`) y la skill genérica (`SKILL.md`) SHALL documentar la fase UX como primera fase del flujo, los cuatro caminos (sin UX, resumen, rediseño, auditoría), el comando de contexto (`tools/context.mjs`) y la regla de no rediseñar sin elección explícita del usuario. El mapa de la guía 00 SHALL reflejar el router de tres fases con la fase UX como primera fase y el intake previo.

#### Scenario: Agente entra al repo con UX
- **WHEN** un agente lee `AGENTS.md` o `SKILL.md` en un proyecto con UX existente
- **THEN** sabe que debe analizar el contexto, preguntar el modo (resumir o rediseñar) y registrar los resultados en `ai-frontend-output/ux/`

#### Scenario: Mapa actualizado
- **WHEN** un agente sigue la guía `00-START-HERE.md`
- **THEN** encuentra el intake, las tres fases como puntos de entrada y los cuatro caminos de la fase UX con sus salidas

## ADDED Requirements

### Requirement: Three-phase on-demand workflow
El kit SHALL organizar el flujo en tres fases (Teoría y UX, Composición, Pulimiento total) que actúan como puntos de entrada independientes. Antes de enrutar, el agente SHALL preguntar al usuario qué busca y SHALL declarar la ruta elegida. Las fases NO SHALL ser obligatoriamente secuenciales y el agente SHALL poder entrar directamente por la fase solicitada (p. ej. solo pulir o solo UX). El kit SHALL documentar las casuísticas con su camino mínimo: proyecto nuevo, cambio pequeño/iteración, componente personalizado, solo pulido y solo UX/rediseño.

#### Scenario: Intake de proyecto nuevo
- **WHEN** el usuario pide un frontend nuevo sin más contexto
- **THEN** el agente pregunta el alcance y propone la ruta Teoría → Composición → Pulimiento antes de tocar código

#### Scenario: Entrada directa
- **WHEN** el usuario pide solo pulir o solo rediseñar la UX
- **THEN** el agente entra directamente por la fase correspondiente sin recorrer las anteriores

#### Scenario: Cambio pequeño
- **WHEN** el usuario pide un cambio puntual en una UI existente
- **THEN** el flujo ofrece el camino de iteración sin rehacer la fase UX

### Requirement: Incremental iteration path
El kit SHALL incluir una guía corta de iteración (`09-ITERATE.md`) para cambios pequeños y añadidos personalizados con el loop mínimo: localizar el bloque en `UX-SPEC`/código, consultar combinaciones y catálogo, decidir reuse/adapt/build, aplicar la filosofía y pulir con la skill de pulimiento, registrando la decisión en memoria. El loop SHALL poder ejecutarse sin repetir las guías completas.

#### Scenario: Cambio pequeño
- **WHEN** el usuario pide ajustar un bloque existente
- **THEN** el agente localiza el bloque, consulta memoria/catálogo, aplica el cambio y lo registra sin rehacer la fase UX

#### Scenario: Componente personalizado
- **WHEN** el usuario pide algo nuevo que no está en el catálogo
- **THEN** el agente busca primero en combinaciones y catálogo, construye custom siguiendo la guía de filosofía y registra la justificación

### Requirement: Total polish phase with Playwright MCP
El kit SHALL incluir una skill de pulimiento (`skills/frontend-polish/SKILL.md`) que: (a) use las skills externas instaladas (impeccable audit/polish, taste-skill, emilkowalski `review-animations`/`improve-animations`) cuando estén disponibles; (b) ejecute un bucle visual con Playwright MCP (navegar, snapshot de accesibilidad, capturas de estados hover/focus/loading/empty/error, consola sin errores, teclado, reduced-motion y responsive) corrigiendo y repitiendo; (c) cierre con la regresión `@playwright/test` de la guía 08; y (d) funcione con fallback (checklist de 07/08) cuando falten herramientas, sin bloquear el flujo. El pulimiento SHALL respetar el presupuesto de 1–2 efectos de alto impacto por vista.

#### Scenario: Pulido con herramientas completas
- **WHEN** el usuario pide pulir una pantalla y las skills externas y Playwright MCP están disponibles
- **THEN** el agente ejecuta las auditorías, recorre los estados con Playwright MCP, corrige los hallazgos y cierra con la regresión y el checklist

#### Scenario: Fallback sin herramientas
- **WHEN** Playwright MCP o las skills externas no están disponibles
- **THEN** el agente aplica el checklist destilado de 07/08 y deja constancia de las herramientas ausentes

#### Scenario: Presupuesto de efectos
- **WHEN** el pulido propone añadir animaciones o efectos
- **THEN** el resultado mantiene máximo 1–2 efectos de alto impacto por vista
