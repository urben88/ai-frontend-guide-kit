# Tasks

## 1. Instalador

- [ ] 1.1 Configurar el servidor MCP `excalidraw` (`npx -y @cmd8/excalidraw-mcp --diagram ai-frontend-output/ux/ux-map.excalidraw`) en `.mcp.json` y `opencode.json` con el mismo merge idempotente que `playwright` (preservar otros servidores y claves, avisar si el JSON es inválido, no tocar `.jsonc`); `--no-mcp` omite ambos; actualizar help y mensajes
- [ ] 1.2 Crear el scaffold `ai-frontend-output/ux/ux-map.excalidraw` si falta (sin sobrescribir uno existente) y actualizar la salida final con el mapa visual; verificar en proyecto temporal que el merge preserva servidores previos y es idempotente

## 2. Skill ux-map

- [ ] 2.1 Crear `skills/ux-map/SKILL.md` con frontmatter `name`/`description` (disparadores: mapa visual de pantallas, excalidraw, wireframe de navegación, actualizar mapa): receta de layout por áreas/colores/tamaños, formato de label estable, uso de las 4 herramientas MCP, protocolo de mantenimiento incremental (leer estado → add/delete por etiqueta), baseline en rediseño y fallback sin MCP
- [ ] 2.2 Verificar que el instalador copia la skill a `.agents/skills/ux-map/` en una instalación de prueba

## 3. Guías y flujo

- [ ] 3.1 `guides/01-UX-FLOWS.md`: paso del mapa visual (skill `ux-map`), salidas actualizadas y gate con el mapa; camino C con `ux-map-baseline.excalidraw`; verificar que la guía sigue ≤ ~120 líneas
- [ ] 3.2 `guides/00-START-HERE.md` (salidas/matriz de fase 1 + MCP Excalidraw) y `guides/09-ITERATE.md` (actualizar el mapa si el cambio altera pantallas o navegación); verificar referencias cruzadas

## 4. Documentación sincronizada

- [ ] 4.1 Actualizar `ai-frontend-guide-kit/AGENTS.md` y `skills/ai-frontend-guide/SKILL.md` (salida del mapa + MCP Excalidraw + conteo 19), `README.md` raíz y `ai-frontend-guide-kit/README.md`, `ai-frontend-guide-kit/VERIFICATION.md`

## 5. Empaquetado y verificación

- [ ] 5.1 `tools/build-kit.mjs`: añadir `skills/ux-map/SKILL.md` a los activos requeridos y actualizar el mensaje de conteo (19); verificar con `node tools/build-kit.mjs`
- [ ] 5.2 E2E en proyecto temporal (Windows): install completo (19 skills + MCP playwright/excalidraw + scaffold), re-ejecución idempotente, `--no-mcp`; arrancar `@cmd8/excalidraw-mcp` sobre el scaffold y crear nodos/flechas de prueba; registrar resultados en `VERIFICATION.md`
- [ ] 5.3 `node tools/validate.mjs` + `npx openspec validate add-ux-visual-map --strict`; corregir hasta que ambos pasen
