# Proposal

## Why

La fase UX produce hoy `UX-SPEC.md` y `flow-report.html` (texto): pantallas, flujos y estados, pero no una vista visual de cómo se estructuran y comunican las páginas. El usuario quiere un boceto en red — pantallas como rectángulos con su contenido clave, botones/acciones como flechas etiquetadas — generado y mantenido como un `.excalidraw` editable con un MCP de Excalidraw, para revisar de un vistazo la navegación y conservar los retoques manuales entre iteraciones.

## What Changes

- Nuevo artefacto vivo `ai-frontend-output/ux/ux-map.excalidraw`: cada pantalla es un nodo con el nombre exacto de `UX-SPEC.md` más su acción primaria y bloques clave; cada transición es una flecha etiquetada con el botón/acción que navega; colores por área (pública, auth, app, estados) y nodo de inicio.
- Nueva skill `ux-map` (el kit pasa de 18 a 19 skills) con la receta de layout, el uso de las herramientas MCP (`createNode`, `createEdge`, `deleteElement`, `getFullDiagramState`), el protocolo de mantenimiento incremental por etiqueta y el fallback sin MCP.
- Instalador: configura el servidor MCP local `excalidraw` (`@cmd8/excalidraw-mcp` apuntando al `.excalidraw`) en los mismos arneses que Playwright y con el mismo merge idempotente; crea el scaffold del archivo si falta (el servidor exige que exista); `--no-mcp` omite ambos servidores.
- Guía `01-UX-FLOWS.md`: paso nuevo del mapa visual, gate y salidas; el camino C crea `ux-map-baseline.excalidraw` antes del rediseño. Router `00` y guía `09` actualizados (el mapa se mantiene cuando una iteración cambia pantallas o navegación).
- Documentación sincronizada: `AGENTS.md` del kit, skill genérica, READMEs, ayuda/salida del instalador, `VERIFICATION.md` y `tools/build-kit.mjs` (verifica la skill nueva y reporta 19).

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `ux-flow-layer`: nuevo requisito de mapa visual (generación con MCP, receta por áreas, mantenimiento incremental, baseline en rediseño, fallback y gate) y salidas UX ampliadas.
- `kit-distribution`: setup del MCP Excalidraw y scaffold del `.excalidraw` con el mismo merge idempotente que Playwright, y conteo del kit a 19 skills.
- `guided-frontend-kit`: salida de la fase UX con mapa visual, skill `ux-map` y actualización del mapa en la iteración incremental.

## Impact

- Nuevos: `skills/ux-map/SKILL.md`, `openspec/changes/add-ux-visual-map/`.
- Actualizados: `install.mjs`, `ai-frontend-guide-kit/guides/01-UX-FLOWS.md`, `ai-frontend-guide-kit/guides/00-START-HERE.md`, `ai-frontend-guide-kit/guides/09-ITERATE.md`, `ai-frontend-guide-kit/AGENTS.md`, `skills/ai-frontend-guide/SKILL.md`, `README.md` (raíz y kit), `ai-frontend-guide-kit/VERIFICATION.md`, `tools/build-kit.mjs`.
- Dependencia externa opcional: `npx -y @cmd8/excalidraw-mcp` (red la primera vez); si no está disponible, el flujo degrada al fallback documentado sin bloquear la fase UX.
