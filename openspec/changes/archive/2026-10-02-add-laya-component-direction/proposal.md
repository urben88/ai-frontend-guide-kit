# Proposal

## Why

Laya ya rankea preguntas, dirección y componentes, pero el ranking de componentes solo recibe la necesidad y un contexto libre: ignora la **dirección de experiencia elegida** (arquetipo, filosofía, estilo). Dos bloques con la misma necesidad compiten igual aunque el brief pida una consola industrial o un explainer editorial, y el resultado puede ser genérico o incoherente con el UX definido.

## What Changes

- `tools/laya_select.py`: nueva bandera `--direction <id>` que resuelve la entrada del arquetipo/filosofía/estilo en `experience/experience-manifest.json` e inyecta su perfil en el **estado** de Laya (antes del contexto del proyecto), para que el ranking de componentes (y cualquier tarea) valore el encaje con la dirección elegida. Si el id no existe, avisa y continúa sin bloquear.
- Documentación: la guía `05-FIND.md` convierte el ranking con dirección en el paso recomendado tras el shortlist de `find` (`--direction` + `--context-file` del brief + consentimiento de sesión ya establecido en la guía 01); `AGENTS.md`, la skill genérica y los READMEs actualizan sus ejemplos de componentes.
- Verificación: dry-run del payload con dirección, corrida real, regresión sin dirección y registro en `VERIFICATION.md`.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `laya-ranking`: el estado de las preguntas tipadas admite la dirección elegida (`--direction`) y la guía de búsqueda documenta su uso para componentes con el consentimiento por sesión.

## Impact

- `ai-frontend-guide-kit/tools/laya_select.py`, `ai-frontend-guide-kit/guides/05-FIND.md`, `ai-frontend-guide-kit/AGENTS.md`, `skills/ai-frontend-guide/SKILL.md`, `ai-frontend-guide-kit/README.md`, `README.md`, `ai-frontend-guide-kit/VERIFICATION.md`.
- Sin dependencias nuevas ni cambios de esquema; retrocompatible (sin `--direction` el comportamiento es el actual).
