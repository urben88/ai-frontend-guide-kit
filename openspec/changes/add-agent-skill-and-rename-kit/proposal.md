# Proposal

## Why

Hoy el agente descubre el kit leyendo `AGENTS.md`; una **skill genérica** (formato agent-skills con `SKILL.md`, compatible con Codex/OpenAI, Claude Code, OpenCode y otros) enseña el uso de la herramienta de forma portable y automática. Además, el nombre de la carpeta del kit no coincide con el del repositorio/paquete (`ai-frontend-guide-kit`), lo que confunde en instalaciones y documentación.

## What Changes

- Nueva skill genérica `skills/ai-frontend-guide/SKILL.md` que enseña: principio reuse-first, guías 00–08, `find`/`get`, consentimiento de Laya (`--confirmed`) y reglas de licencia. Instalable con `npx skills add urben88/ai-frontend-guide-kit --skill ai-frontend-guide`.
- El instalador instala también la skill propia (4ª instalación) e indica la ruta a `AGENTS.md`.
- Renombrar la carpeta del kit `ai-frontend-guide/` → `ai-frontend-guide-kit/` en repo, instalador, empaquetado y documentación; el instalador elimina la carpeta legada si existe.
- Documentación actualizada al repositorio real `github.com/urben88/ai-frontend-guide-kit`.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `guided-frontend-kit`: la carpeta autocontenida pasa a llamarse `ai-frontend-guide-kit/`; se añade el requisito de skill genérica.
- `kit-distribution`: el instalador usa la nueva carpeta, limpia la legada e instala la skill propia además de las tres de diseño.

## Impact

- Renombrado: `ai-frontend-guide/` → `ai-frontend-guide-kit/` (36 archivos) y sus referencias en `install.mjs`, `tools/build-kit.mjs`, `package.json`, `README.md`, `componentes_reutilizables.md`, `flujo_operativo_...md` y `VERIFICATION.md`.
- Nuevo: `skills/ai-frontend-guide/SKILL.md`.
- Los cambios archivados de OpenSpec se dejan intactos (histórico).
