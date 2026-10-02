# Design

## Context

La fase UX (guía `01-UX-FLOWS.md`) ya produce `REPO-CONTEXT.md`, `UX-SPEC.md` y `flow-report.html` en `ai-frontend-output/ux/`. Las skills `userflow`/`flow-*` son vendorizadas (MIT, `tools/sync-ux-skills.mjs` las sobrescribe): la mejora NO puede vivir ahí. El instalador ya tiene un patrón de MCP idempotente por arnés para Playwright (`.claude/` → `.mcp.json`, `opencode.json` → `mcp.playwright`, `--no-mcp` para omitir) y el kit sigue una filosofía de fallback sin bloquear fases.

Servidor: MCP propio del kit, `ai-frontend-guide-kit/tools/excalidraw-mcp.mjs` (Node ≥18, stdio, cero dependencias, offline). Expone `createNode(label, shape?, color?, x?, y?, width?, height?, link?)`, `createEdge(from, to, label?, style?)` (referencias por ID o por etiqueta), `deleteElement(id o etiqueta)` y `getFullDiagramState` (markdown del diagrama). Genera elementos Excalidraw válidos con flechas bindeadas (`startBinding`/`endBinding`, `boundElements`), listos para abrir en excalidraw.com o en la extensión de VS Code, y crea el archivo si falta. E2E (2026-10-02): `@cmd8/excalidraw-mcp` quedó descartado — su 1.2.0 publica ESM con alias `@/` y extensionless imports irresolubles (no arranca en Node 24) y 1.1.x solo expone `getFullDiagramState`; el MCP oficial (`mcp.excalidraw.com`) dibuja interactivo dentro del chat (MCP Apps) pero no persiste un archivo en el repo, que es justo el artefacto que se quiere mantener.

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

### D1. Servidor MCP propio, file-based (sin dependencias)

El kit implementa su propio servidor MCP stdio (`tools/excalidraw-mcp.mjs`, solo built-ins de Node) que escribe un `.excalidraw` persistente en disco con operaciones incrementales (crear nodo/flecha, borrar por etiqueta, leer estado) y crea el archivo si falta. Alternativas descartadas: `@cmd8/excalidraw-mcp` (roto en su versión con herramientas: alias `@/` + imports sin extensión; las versiones que arrancan son de solo lectura), MCP oficial (solo render en chat, sin archivo) y un generador one-shot (no interactivo, no mantiene retoques manuales). El comando se configura como `node ai-frontend-guide-kit/tools/excalidraw-mcp.mjs --diagram <ruta>`. Ventaja: offline, sin red en el primer uso y sin riesgo de deriva del tercero; coste: mantener un servidor pequeño (~370 líneas) con la API ya documentada en la skill.

### D2. Mantenimiento incremental, sin fuente JSON intermedia

La fuente de verdad es el propio `ux-map.excalidraw`, mantenido por MCP: `getFullDiagramState` antes de tocar, `createNode`/`createEdge` para añadir y `deleteElement` (por etiqueta) para quitar. Los nombres de pantalla se usan como etiquetas estables (clave de las operaciones por label y espejo de `UX-SPEC.md`). Alternativa descartada: `ux-map.json` canónico + regeneración (perdería retoques manuales y añade deriva). Regla de renombrado: `deleteElement` + `createNode` con el nombre nuevo y recrear las flechas del nodo.

### D3. Receta de layout (en la skill `ux-map`)

- Cuadrícula por áreas en columnas: pública (col 0), auth (col 1), app (col 2), estados/auxiliares (col 3). `x = col * 400`, `y = row * 240`; ancho 280 y alto automático (labels multilínea).
- Colores preset: pública `light-purple`, auth `light-blue`, app `light-green`, estados `light-yellow`; nodo INICIO elipse `yellow`.
- Label de pantalla estable: `{Nombre}\nCTA: {acción primaria}\nBloques: {a} · {b} · {c}`.
- Flechas: `label` = texto real del botón/enlace que navega; `style: dashed` para flujos secundarios (¿olvidaste tu contraseña?, legales). `diamond` solo si hace falta una decisión (p. ej. pago ok/fallo).
- `link` opcional del nodo a la ruta real del repo si la pantalla ya existe.

### D4. Scaffold y ruta del diagrama

El servidor crea el archivo si falta, pero el instalador crea igualmente `ai-frontend-output/ux/ux-map.excalidraw` con el scaffold estándar (`{"type":"excalidraw","version":2,...,"elements":[]}`) solo si no existe: garantiza el artefacto desde el minuto cero y evita depender del primer tool call. En la config MCP se escriben rutas relativas al proyecto (script y `--diagram`) y se verifica en E2E que el cwd de los arneses es la raíz del proyecto; si algún arnés no lo garantiza, se usan rutas absolutas del destino.

### D5. Skill propia `ux-map`, no receta embebida en la guía

La receta + protocolo viven en `skills/ux-map/SKILL.md` (auto-trigger por `description`: mapa visual, excalidraw, wireframe de navegación, actualizar mapa) porque el mantenimiento ocurre fuera de la fase UX (iteración 09, rediseño). Sigue el precedente de `frontend-polish`; las guías quedan breves y apuntan a la skill. Conteo del kit 18 → 19 actualizado en instalador, READMEs, `build-kit.mjs` y specs.

### D6. Rediseño (camino C) con baseline

Antes de actualizar el mapa, se copia el archivo a `ux-map-baseline.excalidraw` (es JSON: copia directa), en paralelo a `UX-BASELINE.md`/`UX-DIFF.md`. El gate de la guía 01 exige mapa para UX creado o rediseñado; el camino B (resumen as-is) lo documenta como opcional.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| MCP propio con mantenimiento del kit | API mínima y estable (4 herramientas) documentada en la skill; fallback de edición directa del JSON si faltara; la fase UX no depende de él para cerrar |
| El servidor debe resolver bindings y texto por etiqueta | IDs deterministas y protocolo de mantenimiento por etiqueta ya fijados en la skill; E2E crea/borra nodos y flechas sobre el scaffold |
| Sin red en el primer uso | El servidor es local y sin dependencias; no requiere `npx` ni descargas |
| cwd del arnés distinto de la raíz del proyecto | Verificación E2E en ambos arneses; ruta absoluta como respaldo |
| Deriva entre `UX-SPEC.md` y el mapa | Regla de nombres exactos de pantalla + verificación con `getFullDiagramState` al cerrar la fase |
| El MCP no crea frames ni texto suelto | Áreas con color + labels multilínea (D3); sin anatomía sub-pantalla |

## Migration Plan

- Aditivo: el instalador añade el servidor `excalidraw` y el scaffold; kit/skills se refrescan re-ejecutando `npx ai-frontend-guide-kit`.
- Proyectos existentes: el mapa se genera en la siguiente pasada UX o al invocar la skill `ux-map`; sin pasos obligatorios.
- Rollback: revertir `install.mjs`, skill, guías y docs; eliminar el servidor `excalidraw` de las configs y, si se quiere, el `.excalidraw` (ambos fuera del kit).
