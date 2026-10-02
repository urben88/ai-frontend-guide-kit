# Proposal

## Why

El kit cubre la selección de UI (componentes reales) pero no la capa UX: los agentes inventan flujos plausibles-pero-malos (password en el primer paso, onboarding de 5 pantallas, confirmaciones en vez de undo). El repo MIT `jpoindexter/ux-flow-skills` empaqueta 16 skills con flujos probados (auth, onboarding, checkout, paywall, settings, navegación, tablas, formularios, errores, empty states, AI chat…). Se integran vendorizadas y distribuidas desde este repositorio, con una fase UX previa a la fase UI, y con modos explícitos cuando el repo ya tiene UX: **resumir lo existente** o **rediseño radical** (solo UX, respetando `PRODUCT.md`).

## What Changes

- Vendorizar las 16 UX skills (+ `report-template.html`) en `skills/` con licencia MIT y origen pinneado; script `tools/sync-ux-skills.mjs` para re-sincronizar y `--check`.
- Nueva herramienta `ai-frontend-guide-kit/tools/context.mjs`: analiza el repo (stack, rutas, docs, specs) y genera `ai-frontend-output/ux/REPO-CONTEXT.md` con `ux_present`.
- Nueva guía `01-UX-FLOWS.md` (reemplaza a `01-ANCHOR.md`): contexto → `userflow` (1–4 skills, anti-patrones) → `UX-SPEC.md` + `flow-report.html`; con 4 caminos: sin UX / resumen as-is / rediseño radical / auditoría puntual.
- Modos sobre UX existente: **S · Resumen** (documenta sin cambios, con auditoría PASS/WARN/FAIL) y **R · Rediseño** (baseline obligatorio → UX ideal → `UX-DIFF.md`); se pregunta al usuario, nunca se rediseña en silencio.
- **Adaptación a BMAD y flujos basados en specs:** `context.mjs` detecta si el repo sigue BMAD (PRD/brief/arquitectura/UX docs/stories) y/o OpenSpec; nueva guía `guides/ADAPTERS.md` explica cómo adaptarse (el PRD/brief es el ancla de negocio y los docs UX el estado as-is; los specs son la fuente de verdad del comportamiento) y la memoria gana `--ref` para trazar decisiones a specs/stories. Las skills UX vendorizadas permanecen intactas: la adaptación vive en la capa del kit.
- El instalador instala las 17 skills del repo (workflow + 16 UX) y los siguientes pasos pasan a empezar por la fase UX.
- `AGENTS.md`, `SKILL.md`, guías `00/03/05` y READMEs actualizados; `build-kit` verifica los nuevos activos.

## Capabilities

### New Capabilities
- `ux-flow-layer`: skills UX vendorizadas y sincronizables, análisis de contexto del repo, fase UX con dispatcher y anti-patrones, modos resumir/rediseñar, adaptación a repos BMAD/spec-driven (detección + guía + trazas) y salidas en `ai-frontend-output/ux/` que alimentan el inventario y la memoria de UI.

### Modified Capabilities
- `guided-frontend-kit`: el flujo guiado incorpora la fase UX como primer paso y la capa de conciencia/skill la documentan.
- `kit-distribution`: el instalador instala las 16 UX skills desde este repo (17 en total) y el empaquetado verifica los activos vendorizados.

## Impact

- Nuevos: `skills/userflow/**` + `skills/flow-*/**` (16), `skills/UX-SKILLS-LICENSE`, `skills/UX-SKILLS-ORIGIN.md`, `tools/sync-ux-skills.mjs`, `ai-frontend-guide-kit/tools/context.mjs`, `ai-frontend-guide-kit/guides/01-UX-FLOWS.md`, `ai-frontend-output/ux/` (en proyectos destino).
- Actualizados: `install.mjs`, `tools/build-kit.mjs`, `AGENTS.md`, guías `00/03/05`, `SKILL.md`, READMEs, `VERIFICATION.md`.
- Sin cambios en el catálogo ni en el esquema; sin dependencias nuevas (Node ≥ 18).
