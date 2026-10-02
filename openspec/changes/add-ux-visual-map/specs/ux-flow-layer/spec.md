# Spec Delta

## MODIFIED Requirements

### Requirement: UX outputs and handoff
Las salidas UX SHALL vivir en `ai-frontend-output/ux/` (preservadas en refrescos del kit) y SHALL incluir `UX-SPEC.md`, `flow-report.html` y el mapa visual `ux-map.excalidraw`. SHALL alimentar la fase de UI: el inventario (`03-INVENTORY`) y los identificadores `--screen/--block` de la memoria SHALL derivarse de `UX-SPEC.md`, de modo que las combinaciones guarden coherencia entre UX y componentes.

#### Scenario: Inventario desde UX
- **WHEN** el agente construye el inventario de componentes
- **THEN** cada fila corresponde a una pantalla/bloque definidos en `UX-SPEC.md`, incluyendo sus estados

#### Scenario: Memoria coherente
- **WHEN** se registra una decisión con `memory.mjs add`
- **THEN** `--screen` y `--block` son los definidos en `UX-SPEC.md`

#### Scenario: Mapa visual en las salidas
- **WHEN** la fase UX termina
- **THEN** existen `UX-SPEC.md`, `flow-report.html` y `ux-map.excalidraw` en `ai-frontend-output/ux/`, y el mapa usa los mismos nombres de pantalla que `UX-SPEC.md`

## ADDED Requirements

### Requirement: Visual screen map (Excalidraw)
La fase UX SHALL producir y mantener un mapa visual de pantallas en `ai-frontend-output/ux/ux-map.excalidraw`, generado con el MCP local de Excalidraw (`@cmd8/excalidraw-mcp`) apuntando a ese archivo. Cada pantalla SHALL ser un nodo con el nombre exacto de `UX-SPEC.md` y su contenido clave (acción primaria y bloques), cada transición SHALL ser una flecha etiquetada con el botón o acción que navega, las pantallas SHALL agruparse visualmente por área (pública, auth, app, estados) con colores distintos y SHALL existir un nodo de inicio. El mantenimiento SHALL ser incremental sobre el mismo archivo: leer el estado (`getFullDiagramState`) antes de tocar, añadir o eliminar nodos y flechas por etiqueta y conservar los ajustes manuales, sin regenerar a ciegas. En rediseño (camino C) SHALL crearse una copia `ux-map-baseline.excalidraw` antes de actualizar el mapa. Si el MCP no está disponible, la fase NO SHALL bloquearse: se usa el fallback documentado (edición directa del JSON) y se deja constancia de la limitación.

#### Scenario: Mapa generado con la fase UX
- **WHEN** la guía `01-UX-FLOWS.md` crea o actualiza `UX-SPEC.md`
- **THEN** existe `ai-frontend-output/ux/ux-map.excalidraw` con nodos por pantalla, flechas etiquetadas por acción y el nodo de inicio, verificable con `getFullDiagramState`

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
- **WHEN** un UX creado o rediseñado no tiene `ux-map.excalidraw`
- **THEN** la guía marca el mapa como pendiente y no cierra la fase
