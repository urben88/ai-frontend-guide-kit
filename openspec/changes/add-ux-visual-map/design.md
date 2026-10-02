# Design

## Context

La fase UX (guía `01-UX-FLOWS.md`) ya produce `REPO-CONTEXT.md`, `UX-SPEC.md` y `flow-report.html` en `ai-frontend-output/ux/`. Las skills `userflow`/`flow-*` son vendorizadas (MIT, `tools/sync-ux-skills.mjs` las sobrescribe): la mejora NO puede vivir ahí. El instalador ya tiene un patrón de MCP idempotente por arnés para Playwright (`.claude/` → `.mcp.json`, `opencode.json` → `mcp.playwright`, `--no-mcp` para omitir) y el kit sigue una filosofía de fallback sin bloquear fases.

Servidor elegido: `@cmd8/excalidraw-mcp` (MIT, Node ≥18, local/stdio). Expone `createNode(label, shape?, color?, link?, x?, y?, width?, height?)`, `createEdge(from, to, label?, style?)` (referencias por ID o por etiqueta), `deleteElement(id o etiqueta)` y `getFullDiagramState` (markdown del diagrama). Genera elementos Excalidraw válidos con flechas bindeadas (`startBinding`/`endBinding`, `boundElements`), listos para abrir en excalidraw.com o en la extensión de VS Code. Limitaciones: exige que el archivo `--diagram` exista (hace `readFile` sin crearlo), no crea frames ni nodos solo-texto, y las formas/colores son enums cerrados. El MCP oficial (`mcp.excalidraw.com`) queda descartado: dibuja interactivo dentro del chat (MCP Apps) pero no persiste un archivo en el repo, que es justo el artefacto que se quiere mantener.

## Goals / Non-Goals

**Goals:**

- El mapa visual nace con la fase UX y se mantiene incrementalmente sobre el mismo `.excalidraw`, conservando retoques manuales.
- Receta básica y estable: pantallas = nodos por área con contenido clave; acciones = flechas etiquetadas; nombres = nombres de `UX-SPEC.md`.
- Cero fricción de instalación: mismo merge idempotente que Playwright, scaffold creado por el instalador, `--no-mcp` como escape.
- Fallback documentado si el MCP no está disponible; la fase UX nunca se bloquea.

**Non-Goals:**

- Fuente JSON intermedia + renderer propio (dos fuentes de verdad; el usuario eligió mantenimiento directo por MCP).
- Editar las skills vendorizadas (`userflow`/`flow-*`) o duplicar su contenido.
- Frames de Excalidraw o anatomía sub-pantalla (sub-rectángulos): la receta usa color por área y labels multilínea.
- Vendorizar el servidor MCP: se instala al vuelo con `npx` (red la primera vez), como Playwright.

## Decisions

### D1. Servidor `@cmd8/excalidraw-mcp` file-based

Es el único MCP maduro que escribe un `.excalidraw` persistente en disco con operaciones incrementales (crear nodo/flecha, borrar por etiqueta, leer estado). Alternativas descartadas: MCP oficial (solo render en chat, sin archivo) y tool propio generador (no interactivo, no mantiene retoques manuales). El comando se configura como `npx -y @cmd8/excalidraw-mcp --diagram <ruta>`. Riesgo de tercero joven: el fallback manual está documentado y la config es eliminable sin tocar el kit.

### D2. Mantenimiento incremental, sin fuente JSON intermedia

La fuente de verdad es el propio `ux-map.excalidraw`, mantenido por MCP: `getFullDiagramState` antes de tocar, `createNode`/`createEdge` para añadir y `deleteElement` (por etiqueta) para quitar. Los nombres de pantalla se usan como etiquetas estables (clave de las operaciones por label y espejo de `UX-SPEC.md`). Alternativa descartada: `ux-map.json` canónico + regeneración (perdería retoques manuales y añade deriva). Regla de renombrado: `deleteElement` + `createNode` con el nombre nuevo y recrear las flechas del nodo.

### D3. Receta de layout (en la skill `ux-map`)

- Cuadrícula por áreas en columnas: pública (col 0), auth (col 1), app (col 2), estados/auxiliares (col 3). `x = col * 400`, `y = row * 240`; ancho 280 y alto automático (labels multilínea).
- Colores preset: pública `light-purple`, auth `light-blue`, app `light-green`, estados `light-yellow`; nodo INICIO elipse `yellow`.
- Label de pantalla estable: `{Nombre}\nCTA: {acción primaria}\nBloques: {a} · {b} · {c}`.
- Flechas: `label` = texto real del botón/enlace que navega; `style: dashed` para flujos secundarios (¿olvidaste tu contraseña?, legales). `diamond` solo si hace falta una decisión (p. ej. pago ok/fallo).
- `link` opcional del nodo a la ruta real del repo si la pantalla ya existe.

### D4. Scaffold obligatorio y ruta del diagrama

El servidor falla si el archivo no existe, así que el instalador crea `ai-frontend-output/ux/ux-map.excalidraw` con el scaffold estándar (`{"type":"excalidraw","version":2,...,"elements":[]}`) solo si falta. En la config MCP se escribe la ruta relativa al proyecto (`ai-frontend-output/ux/ux-map.excalidraw`); se verifica en E2E que el cwd de los arneses es la raíz del proyecto; si algún arnés no lo garantiza, se usa la ruta absoluta del destino.

### D5. Skill propia `ux-map`, no receta embebida en la guía

La receta + protocolo viven en `skills/ux-map/SKILL.md` (auto-trigger por `description`: mapa visual, excalidraw, wireframe de navegación, actualizar mapa) porque el mantenimiento ocurre fuera de la fase UX (iteración 09, rediseño). Sigue el precedente de `frontend-polish`; las guías quedan breves y apuntan a la skill. Conteo del kit 18 → 19 actualizado en instalador, READMEs, `build-kit.mjs` y specs.

### D6. Rediseño (camino C) con baseline

Antes de actualizar el mapa, se copia el archivo a `ux-map-baseline.excalidraw` (es JSON: copia directa), en paralelo a `UX-BASELINE.md`/`UX-DIFF.md`. El gate de la guía 01 exige mapa para UX creado o rediseñado; el camino B (resumen as-is) lo documenta como opcional.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| MCP de terceros joven (5★) | Config eliminable y aislada; fallback de edición directa del JSON documentado en la skill; la fase UX no depende de él para cerrar |
| El servidor exige que el archivo exista | Scaffold creado por el instalador (idempotente) y verificado por la skill antes de operar |
| `npx` sin red la primera vez | Mensaje claro y fallback; igual que Playwright MCP |
| cwd del arnés distinto de la raíz del proyecto | Verificación E2E en ambos arneses; ruta absoluta como respaldo |
| Deriva entre `UX-SPEC.md` y el mapa | Regla de nombres exactos de pantalla + verificación con `getFullDiagramState` al cerrar la fase |
| El MCP no crea frames ni texto suelto | Áreas con color + labels multilínea (D3); sin anatomía sub-pantalla |

## Migration Plan

- Aditivo: el instalador añade el servidor `excalidraw` y el scaffold; kit/skills se refrescan re-ejecutando `npx ai-frontend-guide-kit`.
- Proyectos existentes: el mapa se genera en la siguiente pasada UX o al invocar la skill `ux-map`; sin pasos obligatorios.
- Rollback: revertir `install.mjs`, skill, guías y docs; eliminar el servidor `excalidraw` de las configs y, si se quiere, el `.excalidraw` (ambos fuera del kit).
