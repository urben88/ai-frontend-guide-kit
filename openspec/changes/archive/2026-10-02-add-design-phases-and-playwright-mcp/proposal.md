# Proposal

## Why

El flujo actual (guías 00–08) es lineal y las tres skills externas de diseño (impeccable, taste-skill, emilkowalski) solo se instalan con `--design-skills`; además el kit no incluye una fase de pulimiento con Playwright MCP ni una vía clara para cambios pequeños o componentes personalizados. El usuario quiere un flujo unificado en tres fases on-demand (teoría UX → composición → pulimiento total) con las herramientas siempre disponibles, y la spec `kit-distribution` hoy se contradice (un requisito exige instalar las skills externas por defecto vía CLI y otro describe un modo copy limpio que las omite).

## What Changes

- Las skills externas `pbakaus/impeccable`, `Leonxlnx/taste-skill` y `emilkowalski/skills` se instalan **por defecto** vía `npx skills add` (requiere red; si falla, avisa y el kit sigue funcional). `--no-design-skills` las omite; `--no-skills` y `--skills-mode cli` se conservan.
- Nuevo paso de **Playwright MCP** en el instalador: configuración idempotente por arnés detectado (`.claude/` → `.mcp.json`; `opencode.json` → `mcp.playwright`; otros → instrucciones impresas), sin crear configs de arneses inexistentes, sin tocar otros servidores y con `--no-mcp` para omitir.
- Nueva skill del kit `frontend-polish` (Fase 3): orquesta auditorías externas si están disponibles, el bucle visual con Playwright MCP, la regresión `@playwright/test` y un fallback sin herramientas.
- Flujo reorganizado en **tres fases on-demand** con intake obligatorio (el agente pregunta qué busca el usuario antes de enrutar) y tabla de casuísticas: proyecto nuevo, cambio pequeño, añadido personalizado, solo pulir, solo UX/rediseño. Se añade `guides/09-ITERATE.md` para cambios incrementales y se reescribe `guides/00-START-HERE.md` como router.
- Reconciliación de `kit-distribution`: default único de skills y `Target safety` ampliado para permitir la configuración de MCP; conteo del kit pasa a 18 skills.
- Documentación sincronizada: `AGENTS.md` del kit, skill `ai-frontend-guide`, README raíz, README del kit, ayuda/salida del instalador y `VERIFICATION.md`.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `kit-distribution`: default de skills externas por CLI, setup de Playwright MCP por arnés, seguridad de destino ampliada (configs MCP) y nueva skill `frontend-polish` en el kit (18 skills).
- `guided-frontend-kit`: intake + tres fases on-demand (teoría UX / composición / pulimiento total), casuísticas de cambios pequeños y personalizados, y fase de pulimiento con Playwright MCP.

## Impact

- Actualizados: `install.mjs`, `ai-frontend-guide-kit/guides/00-START-HERE.md`, `ai-frontend-guide-kit/AGENTS.md`, `skills/ai-frontend-guide/SKILL.md`, `README.md` (raíz y kit), `tools/build-kit.mjs`, `ai-frontend-guide-kit/VERIFICATION.md`.
- Nuevos: `skills/frontend-polish/SKILL.md`, `ai-frontend-guide-kit/guides/09-ITERATE.md`.
- Sin dependencias nuevas de runtime; `npx skills add` y `npx @playwright/mcp@latest` requieren red (ya ocurría en modo CLI).
