# ux-flow-layer Specification

## Purpose
Integra en el kit una capa UX basada en flujos probados (ux-flow-skills, MIT): analiza el contexto del repositorio, genera una especificación UX completa con anti-patrones auditados, y ofrece modos explícitos —resumir lo existente o rediseño radical (solo UX)— para que el inventario de UI y la memoria de componentes partan de una estructura validada.

## Requirements

### Requirement: Vendored UX skills
El repositorio SHALL incluir las 16 skills UX de `jpoindexter/ux-flow-skills` (`userflow` + 15 `flow-*`) y su `report-template.html` en `skills/<name>/`, sin modificar su contenido, junto con la licencia MIT del origen y un archivo de origen con el commit pinneado. SHALL existir un script de sincronización (`tools/sync-ux-skills.mjs`) que re-descargue la versión más reciente, verifique la licencia y el frontmatter (`name`, `description`) de cada skill, y permita comprobar diferencias con `--check`.

#### Scenario: Vendorizado verificado
- **WHEN** se ejecuta el script de sincronización
- **THEN** las 16 skills quedan en `skills/` con frontmatter válido, la licencia MIT y el origen (repo + commit + fecha) registrados

#### Scenario: Diferencia con el origen
- **WHEN** se ejecuta `sync-ux-skills.mjs --check` y el origen tiene un commit nuevo
- **THEN** el script lo reporta sin modificar archivos y sin salir con error

### Requirement: Repository context analysis
La herramienta `tools/context.mjs` SHALL analizar el repositorio destino (stack desde el manifiesto de paquetes, rutas/pantallas, documentación, specs de OpenSpec, artefactos UX previos) y SHALL escribir un resumen compacto en `ai-frontend-output/ux/REPO-CONTEXT.md` que incluya `ux_present` (si hay UX existente) y su evidencia.

#### Scenario: Repo con UX
- **WHEN** el repositorio tiene rutas/páginas o documentos de producto/UX existentes
- **THEN** el contexto reporta `ux_present: true` con la evidencia (rutas encontradas, documentos detectados)

#### Scenario: Repo sin UX
- **WHEN** el repositorio no tiene pantallas ni documentos de UX
- **THEN** el contexto reporta `ux_present: false` y el flujo usa el camino "UX desde cero"

#### Scenario: Salida compacta
- **WHEN** el agente necesita contexto
- **THEN** lee `REPO-CONTEXT.md` (≤ ~150 líneas) en lugar de explorar el repo completo

### Requirement: UX flow phase

La guía `02-UX-FLOWS.md` SHALL conducir la fase UX antes de cualquier trabajo de UI: consumir `ai-frontend-output/ux/EXPERIENCE-BRIEF.md` (arquetipo, filosofía, journey e IA elegidos en la guía 01), invocar el dispatcher `userflow` (cargando las skills seleccionadas, máximo 4, nunca de memoria), aplicar sus anti-patrones y producir en `ai-frontend-output/ux/` una `UX-SPEC.md` (pantallas, bloques por pantalla, flujos numerados con acciones primarias y ramas, estados empty/loading/error) y un `flow-report.html`. NO SHALL permitirse pasar a la fase de UI sin `UX-SPEC.md` con pantallas y estados.

#### Scenario: Fase completa

- **WHEN** el agente ejecuta la guía 02
- **THEN** quedan `REPO-CONTEXT.md`, `UX-SPEC.md` y `flow-report.html` en `ai-frontend-output/ux/`, con los anti-patrones verificados y coherentes con el arquetipo del brief

#### Scenario: Brief como entrada

- **WHEN** el brief define un arquetipo (p. ej. workflow o storyteller) y su modelo de navegación
- **THEN** la selección de flujos `flow-*` y el orden de pantallas respetan esa dirección

#### Scenario: Gate hacia UI

- **WHEN** no existe `UX-SPEC.md` o le faltan pantallas/estados
- **THEN** la guía bloquea el paso a tokens/inventario

### Requirement: Existing UX handling
Cuando `REPO-CONTEXT.md` reporte `ux_present: true`, la guía SHALL exigir una elección explícita del usuario entre **resumir** y **rediseñar**, y el agente NO SHALL rediseñar en silencio. El modo resumen SHALL documentar el UX actual sin proponer cambios (con auditoría de anti-patrones PASS/WARN/FAIL). El modo rediseño SHALL capturar primero `UX-BASELINE.md`, diseñar el UX ideal con los flujos probados y documentar el impacto en `UX-DIFF.md`; el rediseño SHALL ser solo de UX, respetando objetivo, audiencia y conversión de `PRODUCT.md`.

#### Scenario: Resumen as-is
- **WHEN** el usuario elige resumir
- **THEN** `UX-SPEC.md` describe el estado actual con su auditoría y no incluye cambios propuestos

#### Scenario: Rediseño con baseline
- **WHEN** el usuario elige rediseño radical
- **THEN** existen `UX-BASELINE.md` (lo que había), `UX-SPEC.md` (UX ideal) y `UX-DIFF.md` (pantallas/flujos añadidos, eliminados y reestructurados)

#### Scenario: Límite del rediseño
- **WHEN** el rediseño propone cambios de producto (audiencia, conversión, alcance)
- **THEN** quedan fuera de alcance y se marcan como preguntas abiertas, manteniendo `PRODUCT.md`

### Requirement: UX outputs and handoff

Las salidas UX SHALL vivir en `ai-frontend-output/ux/` (preservadas en refrescos del kit) y SHALL incluir `EXPERIENCE-BRIEF.md` (dirección elegida, journey, IA y brief visual), `UX-SPEC.md` (pantallas y estados), `flow-report.html` y el mapa visual `ux-map.excalidraw`. SHALL alimentar la fase de UI: el inventario (`04-INVENTORY`) y los identificadores `--screen/--block` de la memoria SHALL derivarse de `UX-SPEC.md`, los tokens (`03-TOKENS`) del brief visual, y el mapa de la estructura del brief, de modo que las combinaciones guarden coherencia entre dirección, UX y componentes.

#### Scenario: Inventario desde UX

- **WHEN** el agente construye el inventario de componentes
- **THEN** cada fila corresponde a una pantalla/bloque definidos en `UX-SPEC.md`, incluyendo sus estados

#### Scenario: Tokens desde el brief

- **WHEN** la guía de tokens deriva el sistema visual
- **THEN** parte de la sección visual de `EXPERIENCE-BRIEF.md` (estilo, paleta, tipografía, composición, motion y anti-genérico a evitar)

#### Scenario: Memoria coherente

- **WHEN** se registra una decisión con `memory.mjs add`
- **THEN** `--screen` y `--block` son los definidos en `UX-SPEC.md` y la dirección puede citarse con `--ref "direction:<id>"`

#### Scenario: Mapa visual en las salidas

- **WHEN** la fase UX termina
- **THEN** existen `EXPERIENCE-BRIEF.md`, `UX-SPEC.md`, `flow-report.html` y `ux-map.excalidraw` en `ai-frontend-output/ux/`, y el mapa usa los mismos nombres de pantalla que `UX-SPEC.md` y la plantilla del brief

### Requirement: Framework adaptation (BMAD / spec-driven)
La herramienta de contexto SHALL detectar si el repositorio sigue BMAD (PRD, brief, arquitectura, documentos UX, stories, carpetas BMAD) y/o un flujo basado en specs (`openspec/`), y SHALL reportar el framework detectado con su evidencia. El kit SHALL documentar en `guides/ADAPTERS.md` cómo adaptarse a cada uno: con BMAD, el PRD/brief es el ancla de negocio y los documentos UX existentes son el estado as-is, sin crear fuentes de verdad duplicadas; con specs, los specs son la fuente de verdad del comportamiento. La memoria SHALL aceptar una referencia (`--ref`) para trazar decisiones a specs o stories, y el resumen SHALL mostrarla.

#### Scenario: Detección BMAD
- **WHEN** el repositorio contiene PRD/brief/arquitectura, documentos UX o stories
- **THEN** el contexto reporta framework BMAD con la evidencia y la guía indica anclar desde el PRD/brief existente

#### Scenario: Detección spec-driven
- **WHEN** el repositorio contiene `openspec/` con specs
- **THEN** el contexto reporta flujo basado en specs y la guía exige referenciar las capacidades y no contradecir los specs

#### Scenario: Trazabilidad
- **WHEN** se registra una decisión con `--ref "spec:<capability>"` o `--ref "story:<id>"`
- **THEN** el registro guarda la referencia y el resumen la muestra junto a la decisión

#### Scenario: Sin duplicar fuentes de verdad
- **WHEN** existe PRD de BMAD
- **THEN** `PRODUCT.md` es opcional y, si se crea, apunta al PRD en lugar de reescribir audiencia/conversión

### Requirement: Visual screen map (Excalidraw)

La fase UX SHALL producir y mantener un mapa visual en `ai-frontend-output/ux/ux-map.excalidraw`, generado con el MCP local de Excalidraw incluido en el kit (`ai-frontend-guide-kit/tools/excalidraw-mcp.mjs`, sin dependencias) apuntando a ese archivo. El mapa SHALL elegir su plantilla según el `navigation_model` de `EXPERIENCE-BRIEF.md` (`one-page`, `flow`, `hub`, `catalog`, `console`, `tree`): nodos por sección en `one-page`, pasos con diamantes de decisión en `flow`, hub con clústeres por área en `hub`, ciclo con retornos en `catalog`, módulos en `console` y jerarquía por profundidad en `tree`. Cada nodo SHALL llevar el nombre exacto de la pantalla o sección de `UX-SPEC.md` y su contenido clave (acción primaria y bloques); cada transición SHALL ser una flecha etiquetada con el botón o acción que navega; las áreas y colores SHALL derivarse de la arquitectura de información del brief (paleta preset rotativa, sin áreas fijas) y las filas SHALL seguir las etapas del journey cuando existan. El mapa SHALL incluir una leyenda con la dirección elegida y, cuando Laya puntuó, su `P(fit)` relativa. El mantenimiento SHALL ser incremental sobre el mismo archivo: leer el estado (`getFullDiagramState`) antes de tocar, añadir o eliminar nodos y flechas por etiqueta y conservar los ajustes manuales, sin regenerar a ciegas. En rediseño (camino C) SHALL crearse una copia `ux-map-baseline.excalidraw` antes de actualizar el mapa. Si el MCP no está disponible, la fase NO SHALL bloquearse: se usa el fallback documentado (edición directa del JSON) y se deja constancia de la limitación.

#### Scenario: Mapa generado con la fase UX

- **WHEN** la guía `02-UX-FLOWS.md` crea o actualiza `UX-SPEC.md`
- **THEN** existe `ai-frontend-output/ux/ux-map.excalidraw` con la plantilla del brief, nodos por pantalla/sección, flechas etiquetadas por acción y la leyenda de dirección, verificable con `getFullDiagramState`

#### Scenario: Plantilla por modelo de navegación

- **WHEN** el brief define `single-page-anchors` o `linear/wizard`
- **THEN** el mapa usa `one-page` (columna de secciones con anclas) o `flow` (pasos y decisiones) respectivamente, no una rejilla fija de áreas

#### Scenario: Leyenda con dirección

- **WHEN** la dirección fue elegida (con o sin ranking de Laya)
- **THEN** el mapa incluye una leyenda `Dirección · Navegación · P(fit)` y la etiqueta `P(fit)` solo aparece si Laya puntuó

#### Scenario: Mantenimiento incremental

- **WHEN** una iteración posterior cambia pantallas o transiciones
- **THEN** el agente lee el estado actual, añade o elimina solo los nodos y flechas afectados y conserva los ajustes manuales del archivo

#### Scenario: Rediseño con baseline

- **WHEN** el camino C rediseña el UX
- **THEN** antes de actualizar el mapa existe `ux-map-baseline.excalidraw` con el estado previo y `UX-DIFF.md` refleja los cambios de pantallas y transiciones

#### Scenario: Sin MCP disponible

- **WHEN** el MCP de Excalidraw no está instalado o falla
- **THEN** la fase UX continúa con el fallback documentado y deja constancia de la limitación

#### Scenario: Gate del mapa

- **WHEN** un UX creado o rediseñado no tiene `ux-map.excalidraw` o su plantilla/áreas no cuadran con el brief
- **THEN** la guía marca el mapa como pendiente y no cierra la fase
