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

El kit SHALL incluir guías breves (≤ ~120 líneas cada una) organizadas en tres fases: **Teoría y UX** (dirección de experiencia `01-EXPERIENCE-DIRECTION`, contexto, flujos probados con `userflow` en `02-UX-FLOWS`, tokens en `03-TOKENS`), **Composición** (inventario `04`, búsqueda `05`, decisión `06`, adaptación `07`) y **Pulimiento total** (`08-PHILOSOPHY`, `09-VERIFY`, auditorías externas, bucle Playwright MCP y regresión). El router `00-START-HERE.md` SHALL presentar las tres fases como puntos de entrada con su camino mínimo por casuística, y las guías individuales SHALL seguir siendo breves y autocontenidas.

#### Scenario: Flujo completo

- **WHEN** el agente sigue las fases en orden para un proyecto nuevo
- **THEN** produce primero `EXPERIENCE-BRIEF.md` (arquetipo, filosofía y dirección), luego `UX-SPEC` (pantallas, flujos y estados), después el inventario de componentes, selecciona candidatos del catálogo, los instala o adapta y cierra con el pulimiento y la verificación

#### Scenario: Sin Figma

- **WHEN** el proyecto no dispone de Figma MCP
- **THEN** la guía de tokens ofrece el fallback de derivar tokens desde el brief visual, `PRODUCT.md` y la filosofía del kit

### Requirement: Reuse-first decision
El flujo SHALL exigir consultar el catálogo antes de crear cualquier componente y SHALL aplicar un árbol de decisión explícito: reutilizar (licencia y stack compatibles), adaptar (tokens/tema) o crear solo si no existe alternativa adecuada, registrando la justificación.

#### Scenario: Componente existente compatible
- **WHEN** el inventario identifica una necesidad cubierta por el catálogo con licencia y stack compatibles
- **THEN** el agente reutiliza o adapta ese componente en lugar de crearlo desde cero

#### Scenario: Nada compatible
- **WHEN** ningún componente del catálogo cumple los requisitos
- **THEN** el agente crea el componente siguiendo la filosofía del kit y documenta por qué no reutilizó

### Requirement: Design philosophy distillation
El kit SHALL incluir una guía de filosofía que destile las reglas aplicables de `impeccable` (anti-genérico, auditoría de acabado), `taste-skill` (jerarquía, densidad, proporciones) y `emilkowalski` (springs, micro-feedback, `whileTap`), más las reglas de combinación (p. ej. máximo 1–2 efectos de alto impacto por vista). Cuando las skills externas estén instaladas, el flujo SHALL cargarlas en su fase (emilkowalski al componer interacciones; impeccable/taste al pulir) y SHALL usar la guía destilada como fallback.

#### Scenario: Reglas aplicables sin skills instaladas
- **WHEN** el proyecto destino no tiene las skills instaladas
- **THEN** el agente puede aplicar las reglas destiladas de la guía de filosofía

#### Scenario: Skills externas disponibles
- **WHEN** las skills externas están instaladas
- **THEN** el flujo las invoca en la fase correspondiente (composición o pulimiento) en lugar de depender solo de las reglas destiladas

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

### Requirement: Discovery loop integration

La capa de conciencia (`AGENTS.md`) y la skill genérica (`SKILL.md`) SHALL documentar el loop de descubrimiento (`experience/DISCOVERY-LOOP.md`): idea deck y ronda de navegación en la guía 01 antes de las tres direcciones, y combinaciones de componentes y candidatos web verificados en la guía 05. La guía 00 SHALL reflejar el loop en su tabla de herramientas y sus casuísticas. `experience/DISCOVERY-LOOP.md` SHALL ser un activo requerido del build del kit (`tools/build-kit.mjs`). El loop SHALL respetar la disciplina de tokens (escribir a archivos y no volcar el catálogo) y NO SHALL introducir dependencias nuevas.

#### Scenario: Documentación enlazada

- **WHEN** un agente lee `AGENTS.md` o `SKILL.md`
- **THEN** encuentra el loop de descubrimiento con sus dos fases y la ruta a `experience/DISCOVERY-LOOP.md`

#### Scenario: Activo requerido del build

- **WHEN** se ejecuta `node tools/build-kit.mjs`
- **THEN** el build falla si `experience/DISCOVERY-LOOP.md` no existe en el kit

#### Scenario: Guía 01 con descubrimiento

- **WHEN** el agente sigue `guides/01-EXPERIENCE-DIRECTION.md`
- **THEN** encuentra el paso de descubrimiento de referencias entre el journey/IA y las tres direcciones, con su salida en `EXPERIENCE-BRIEF.md`

#### Scenario: Guía 00 actualizada

- **WHEN** un agente lee el router `guides/00-START-HERE.md`
- **THEN** la tabla de herramientas y las casuísticas mencionan el descubrimiento de referencias y combinaciones

### Requirement: Component combination proposals

En el paso de búsqueda (guía 05), el agente SHALL presentar combinaciones de componentes (2–3 conjuntos con un propósito, p. ej. nav + hero + fondo) antes de cerrar la selección, cada una con el racional del encaje (densidad, presupuesto de motion, personalidad), los ids del catálogo y sus hechos (licencia, comando de instalación) tomados de `get`, y SHALL pedir la reacción del usuario (elegir o intercambiar piezas) iterando variantes. Para componentes fuera del catálogo, el agente SHALL buscar en internet y NO SHALL proponerlos como usables sin verificar su licencia en la página de origen; los candidatos web SHALL marcarse como provisionales hasta confirmarla y NO SHALL añadirse automáticamente al catálogo. Las elecciones SHALL registrarse en la memoria y la combinación aceptada SHALL poder guardarse con `combo save`.

#### Scenario: Combinaciones razonadas

- **WHEN** existen candidatos en el catálogo para los bloques de una pantalla
- **THEN** el agente presenta 2–3 combinaciones con su racional y los hechos de `get`, y pide al usuario elegir o intercambiar antes de decidir

#### Scenario: Candidato web sin licencia verificada

- **WHEN** un componente descubierto en internet no está en el catálogo
- **THEN** el agente lo marca como provisional, verifica su licencia en la página de origen antes de proponerlo como usable y no lo añade al catálogo

#### Scenario: Elección registrada

- **WHEN** el usuario acepta o modifica una combinación
- **THEN** cada decisión queda en memoria y la combinación final puede guardarse con `combo save`
