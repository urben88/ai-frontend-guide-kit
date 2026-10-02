# Proposal

## Why

Los agentes de IA que construyen frontends reinventan componentes que ya existen, porque el conocimiento sobre librerías UI (qué hay, dónde está, cómo se instala y bajo qué licencia) vive disperso y se re-investiga en cada proyecto. Este cambio convierte la investigación ya verificada de 16 fuentes en un catálogo normalizado y una carpeta guiada reutilizable, para que cualquier agente encuentre y reutilice código existente antes de crear algo desde cero.

## What Changes

- Pipeline de extracción y normalización de 16 fuentes UI hacia `manifest/`: `schema.json`, índice ligero `component-manifest.json`, `component-manifest.md`, `install-guides.md` y un JSON por fuente en `sources/`.
- Metadatos de decisión por entrada: qué es y para qué sirve (`use_case`, `decision_hints`, `search_tags`), dónde encontrarlo (`docs_url`, `registry_url`), cómo implementarlo (`install_method`, `install_command`, `manual_steps`) y restricciones (`license_type`, `commercial_use`, `free`, `stack`).
- Carpeta guiada autocontenida `ai-frontend-guide/` (contenido en inglés) lista para copiar a cualquier repo frontend: `AGENTS.md`, 9 guías breves del flujo reuse-first, catálogo empaquetado y herramientas locales `find`/`get` para consultar con mínimo consumo de tokens.
- Flujo UX/UI estandarizado de principio a fin (basado en el flujo operativo existente): anclaje de negocio → tokens de diseño (Figma MCP o fallback sin Figma) → inventario de componentes → búsqueda en catálogo → decisión reutilizar/adaptar/crear → instalación → adaptación → filosofía de diseño → verificación con Playwright.
- Actualización de `componentes_reutilizables.md` y `flujo_operativo_creaci_n_de_frontend_con_skills_figma_mcp_y_playwright.md` como punteros al nuevo sistema.
- Sin cambios disruptivos (**BREAKING: ninguno**): el proyecto no tiene código ni specs previas.

## Capabilities

### New Capabilities
- `component-catalog`: extracción, normalización, validación y publicación del catálogo de fuentes UI reutilizables (registro de fuentes, schema, granularidad curada, licencias, índice ligero, fichas por fuente y guías de instalación).
- `guided-frontend-kit`: carpeta guiada copiable con el flujo estándar reuse-first de UX/UI, el protocolo de consulta del catálogo, la filosofía de diseño destilada y la capa de ahorro de tokens.

### Modified Capabilities
Ninguna: el proyecto no tiene especificaciones existentes (`openspec/specs/` está vacío).

## Impact

- Nuevos artefactos en este repo: `manifest/` (catálogo generado), `tools/` (scripts de extracción, validación y empaquetado) y `ai-frontend-guide/` (carpeta guiada).
- Documentos existentes actualizados como referencia: `componentes_reutilizables.md` y `flujo_operativo_creaci_n_de_frontend_con_skills_figma_mcp_y_playwright.md`.
- Dependencias: Node.js ≥ 20 para scripts locales; ningún runtime adicional en los proyectos destino (el kit no vendoriza código de terceros).
- Riesgo externo: las fuentes cambian (precios, licencias, endpoints, componentes nuevos); se mitiga con el campo `verified_at` y scripts de refresco.
- Futuro: el cambio `add-component-mcp-server` consumirá el mismo catálogo sin duplicar datos.
