# Proposal

## Why

Hoy la instalación vive fuera del proyecto (`npx github:` o clonar y ejecutar `node install.mjs`), y las skills se instalan con el CLI `skills`, que crea `skills-lock.json` y symlinks en varios directorios de agentes además de `.agents/skills`. El usuario quiere instalarlo **como dependencia de `package.json`** (`npm i -D github:urben88/ai-frontend-guide-kit`) y que el setup deje las skills **limpias en `.agents/skills`**, con enlace automático a Claude Code cuando el proyecto lo use.

## What Changes

- El paquete SHALL poder instalarse como dependencia (`github:` ahora; registro npm diferido a petición del usuario) y exponer el bin `ai-frontend-guide-kit`; el setup es **explícito** tras instalar (`npx ai-frontend-guide-kit`), sin `postinstall` automático.
- Nuevo modo por defecto de skills `copy`: copia las 17 skills del paquete a `<destino>/.agents/skills/` **sin `skills-lock.json` ni symlinks**, de forma idempotente y sin tocar skills ajenas.
- Enlace automático a Claude Code: si existe `<destino>/.claude/`, crea `.claude/skills/<name>` (junction en Windows, symlink en POSIX) con fallback a copia.
- `--design-skills` instala las 3 skills externas (impeccable, taste-skill, emilkowalski) vía `npx skills add`; `--skills-mode cli` conserva el flujo CLI completo como opción avanzada; `--no-skills` sigue omitiendo todo.
- `files` del paquete incluye `skills/` para permitir la copia desde `node_modules` sin red; versión `1.1.0`.
- READMEs y ayuda del instalador documentan las vías de instalación.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `kit-distribution`: se añaden el modo de instalación como dependencia, el modo copy limpio de skills y el enlace automático a Claude Code.

## Impact

- Actualizados: `install.mjs`, `package.json` (`files`, versión), `README.md` raíz, `README.md` del kit, `VERIFICATION.md`.
- Sin cambios de catálogo, guías ni esquema. Sin dependencias nuevas. La publicación en npm queda **diferida** (solo `github:` por ahora).
