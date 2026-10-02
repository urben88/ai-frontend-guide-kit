# Proposal

## Why

Laya es un motor opcional, pero hoy el kit lo presenta como acelerador disponible y el agente podría ejecutarlo sin consultar. El usuario quiere que su uso sea siempre una decisión explícita: el agente debe preguntar antes de usar Laya y no invocarlo por defecto.

## What Changes

- El ranking real de `laya_select.py` exigirá una confirmación explícita (`--confirmed`); sin ella no cargará el modelo, explicará que debe pedirse permiso al usuario y terminará con código de salida propio.
- `AGENTS.md` y `guides/04-FIND.md` añaden la regla de consentimiento: preguntar al usuario antes de usar Laya; `find`/`get` siguen siendo la vía por defecto.
- Los `README.md` (kit y raíz), el mensaje final de `install.mjs` y `VERIFICATION.md` reflejan la regla.
- `--check`, `--install` y `--dry-run` no cambian: no ejecutan el modelo y no requieren confirmación.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `laya-ranking`: se añade el requisito "Consent before use" — el agente debe pedir permiso antes de ejecutar el ranking y el script debe exigir confirmación explícita.

## Impact

- Archivos afectados: `ai-frontend-guide/tools/laya_select.py`, `ai-frontend-guide/AGENTS.md`, `ai-frontend-guide/guides/04-FIND.md`, `ai-frontend-guide/README.md`, `README.md` (raíz), `install.mjs`, `ai-frontend-guide/VERIFICATION.md`.
- Sin cambios de catálogo, esquema ni comportamiento del flujo sin Laya.
