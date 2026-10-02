# Proposal

## Why

El sistema `component-manifest-kit` ya genera el catálogo y la carpeta guiada, pero (1) su distribución a un proyecto nuevo es manual (copiar, instalar skills, preparar entorno) y (2) la selección de componentes depende de búsquedas por palabras clave del agente. Este cambio añade una **distribución con un solo comando** y un **motor de decisión local (Laya)** que rankea candidatos con probabilidades calibradas en el propio PC de desarrollo, sin servidor ni datos saliendo de la máquina.

## What Changes

- Nuevo script `ai-frontend-guide/tools/laya_select.py`: chequeo del entorno (`--check`), instalación guiada (`--install`), previsualización del payload (`--dry-run`) y ranking real de candidatos (`--need …`) usando `laya.Router` en local. Sin dependencias Python extra (solo laya + stdlib).
- El filtro determinista (licencia, comercial, categoría, stack) se ejecuta **antes** de Laya; el modelo solo opina sobre encaje semántico y nunca decide hechos.
- Nuevo instalador de repositorio `install.mjs` (+ `package.json` con `bin`, `README.md` raíz y `.gitignore`): un comando copia el kit, instala las skills de diseño (`impeccable`, `taste-skill`, `emilkowalski`) y deja Laya listo o verificado.
- Actualización de `AGENTS.md`, `guides/04-FIND.md`, `README.md` del kit y `VERIFICATION.md` para registrar el paso Laya y su protocolo.
- `tools/build-kit.mjs` verifica la presencia del nuevo script en el kit.
- Sin cambios disruptivos (**BREAKING: ninguno**).

## Capabilities

### New Capabilities
- `laya-ranking`: motor de decisión local (Laya) integrado en el kit para rankear candidatos del catálogo con probabilidades calibradas, con chequeo, instalación guiada, pre-filtro determinista y fallback a `find`/`get`.
- `kit-distribution`: instalación del kit en un proyecto con un solo comando (documentos + skills + verificación de Laya) y empaquetado del repositorio para su uso vía GitHub/npx.

### Modified Capabilities
Ninguna: este cambio añade capacidades nuevas sin modificar los requisitos existentes de `component-catalog` ni `guided-frontend-kit`.

## Impact

- Nuevos archivos: `ai-frontend-guide/tools/laya_select.py`, `install.mjs`, `package.json`, `README.md` (raíz), `.gitignore`.
- Documentos del kit actualizados: `AGENTS.md`, `guides/04-FIND.md`, `README.md`, `VERIFICATION.md`, `tools/build-kit.mjs`.
- Dependencia opcional en el PC de desarrollo: Python ≥ 3.10 + `laya` (arrastra `torch`/`transformers`); la primera consulta descarga checkpoints desde Hugging Face. Todo el cómputo ocurre en local.
- El flujo sin Python sigue funcionando con `find`/`get` (Laya es un acelerador opcional).
