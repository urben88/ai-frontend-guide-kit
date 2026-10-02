# Proposal

## Why

Hoy las decisiones de componentes (qué se eligió para cada bloque, con qué licencia y cómo se instala) se pierden al terminar la conversación: no hay historial consultable ni un resumen reutilizable de estilos y componentes. Sin memoria, la skill no puede reutilizar combinaciones ya creadas en proyectos anteriores.

## What Changes

- Nuevo sistema de memoria en `ai-frontend-output/` (fuera de la carpeta del kit, que se refresca al reinstalar): historial append-only de decisiones (`selections.jsonl`), combinaciones nombradas reutilizables (`combinations.json`) y resumen generado (`SUMMARY.md` con estilos y componentes extraídos).
- Nueva herramienta `ai-frontend-guide-kit/tools/memory.mjs` (sin dependencias): `add` (registra una decisión enriquecida desde el catálogo), `list`, `summary`, `combo save|list|show|apply`.
- El instalador crea `ai-frontend-output/` con su README si no existe y NUNCA lo borra al refrescar el kit; el bloque de `AGENTS.md` documenta los comandos de memoria.
- Documentación y skill actualizadas: la guía 04 consulta combinaciones guardadas antes de buscar; la guía 05 exige registrar cada decisión; `AGENTS.md` y `SKILL.md` documentan el flujo de memoria.

## Capabilities

### New Capabilities
- `selection-memory`: historial persistente de decisiones, resumen generado de estilos/componentes y combinaciones nombradas reutilizables entre proyectos.

### Modified Capabilities
- `guided-frontend-kit`: nuevo requisito de integración de la memoria en las guías, `AGENTS.md` y la skill genérica.
- `kit-distribution`: nuevo requisito de aprovisionamiento de `ai-frontend-output/` (crear si falta, preservar al refrescar).

## Impact

- Nuevos: `ai-frontend-guide-kit/tools/memory.mjs`, `ai-frontend-output/` (README + `selections.jsonl` + `combinations.json` + `SUMMARY.md` en cada proyecto destino).
- Actualizados: `install.mjs`, `tools/build-kit.mjs` (activo requerido), `AGENTS.md`, `guides/04-FIND.md`, `guides/05-REUSE.md`, `guides/00-START-HERE.md`, `README.md` del kit y raíz, `skills/ai-frontend-guide/SKILL.md`, `VERIFICATION.md`.
- Sin cambios de catálogo ni de esquema; sin dependencias nuevas.
