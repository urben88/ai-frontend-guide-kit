# Tasks

## 1. Instalador

- [x] 1.1 Cambiar el default de skills externas a ON en modo copy (`--design-skills` implícito, `--no-design-skills` para omitir), actualizar `parseArgs`, help y mensajes; verificar con `node install.mjs --help` que las banderas se documentan
- [x] 1.2 Implementar el paso Playwright MCP: detección de `.claude/` y `opencode.json`, merge idempotente de `mcpServers.playwright` en `.mcp.json` y de `mcp.playwright` en `opencode.json` (parseo estricto, sin tocar otras claves, aviso si JSON inválido), instrucciones para el resto de arneses y `--no-mcp`; verificar con proyecto temporal que el merge preserva servidores previos y es idempotente
- [x] 1.3 Actualizar `AGENTS_BLOCK` (intake + tres fases + MCP) y la salida final (fase UX primero, MCP y `npx playwright install chromium`); verificar leyendo la salida de una instalación real en temporal

## 2. Skill de pulimiento

- [x] 2.1 Crear `skills/frontend-polish/SKILL.md` (frontmatter `name`/`description` con disparadores de pulido; auditorías externas si están; bucle Playwright MCP con estados/consola/a11y/reduced-motion; regresión `@playwright/test`; fallback 07/08; presupuesto 1–2 efectos) y verificar que la skill se copia a `.agents/skills/frontend-polish/` en una instalación de prueba

## 3. Flujo de tres fases

- [x] 3.1 Reescribir `ai-frontend-guide-kit/guides/00-START-HERE.md` como router: intake obligatorio, tres fases como puntos de entrada, tabla de casuísticas y matriz de herramientas (skills externas ↔ fase, MCP); verificar que las referencias a 01–09 y al gate UX siguen siendo correctas
- [x] 3.2 Crear `ai-frontend-guide-kit/guides/09-ITERATE.md` con el loop mínimo para cambios pequeños y componentes personalizados; verificar que cita `find`/`get`, `memory.mjs`, 07 y `frontend-polish` sin duplicar guías

## 4. Documentación sincronizada

- [x] 4.1 Actualizar `ai-frontend-guide-kit/AGENTS.md` (mapa por fases + intake + MCP) y `skills/ai-frontend-guide/SKILL.md` (fases, intake, externas y pulimiento); verificar coherencia de tablas y punteros
- [x] 4.2 Actualizar `README.md` raíz (default de skills externas + MCP + 18 skills) y `ai-frontend-guide-kit/README.md` (estructura, guía 09, skill de pulimiento); verificar que no queda la afirmación desactualizada del bullet 4

## 5. Empaquetado y verificación

- [x] 5.1 Añadir `skills/frontend-polish/SKILL.md` a `tools/build-kit.mjs` y ajustar el mensaje de conteo; verificar con `node tools/build-kit.mjs`
- [x] 5.2 Verificación end-to-end en proyecto temporal (Windows): install completo (18 skills + externas + MCP), re-ejecución idempotente, `--no-design-skills`, `--no-mcp`, `--no-skills` y `--skills-mode cli`; registrar resultados en `ai-frontend-guide-kit/VERIFICATION.md`
- [x] 5.3 `node tools/validate.mjs` + `openspec validate add-design-phases-and-playwright-mcp --strict`; corregir hasta que ambos pasen
