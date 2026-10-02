# Tasks

## 1. Capa de conocimiento (`experience/`)

- [x] 1.1 Crear `ai-frontend-guide-kit/experience/EXPERIENCE-DIRECTION.md` (proceso, reglas, arquetipos de experiencia, journey/IA, 3 direcciones, formato de `EXPERIENCE-BRIEF.md` y gate)
- [x] 1.2 Crear `QUESTION-BANK.md` (6 fases, regla adaptativa por rondas, opción "otra", dependencias) y `SITE-ARCHETYPES.md` (8 arquetipos de sitio × 15 de experiencia × tipos de página, con cuándo usar/evitar)
- [x] 1.3 Crear `UX-PHILOSOPHIES.md` (15 filosofías con estructura/navegación/densidad/ritmo/emoción/riesgos) y `STYLE-DIRECTIONS.md` (estilos con límites + anti-genérico P0/P1 + presupuesto de efectos)
- [x] 1.4 Crear `REFERENCE-PROTOCOL.md` (fuentes ponderadas, esquema de ficha, ética, extracción on-demand con Playwright MCP) y `experience-manifest.json` con entradas `kind: archetype|philosophy|style|page-type|question|navigation-model` en el formato del catálogo
- [x] 1.5 Verificar que el manifest parsea, tiene IDs únicos y que cada entrada incluye `name/description/use_case/search_tags` (formato consumible por Laya)

## 2. Extracción y banco de fichas

- [x] 2.1 Extraer fichas completas de las fuentes metodológicas (NN/g heurísticas + journey mapping + IA, GOV.UK step-by-step + question pages, USWDS complex form + in-page nav + a11y, Welie, Laws of UX, IDF 5 elementos, Material 3, W3C) a `experience/references/`
- [x] 2.2 Extraer fichas de producto real (Mobbin, Page Flows, Refero, Gummble, UXMaps, TYPENORM, productonboarding, SaaS UI, UI Patterns, UX Library) y de estilos/anti-genérico (Superdesign, StyleKit, anti-ai-slop P0–P6, Anthropic frontend-design, Vercel guidelines); galerías solo con método + representantes
- [x] 2.3 Crear `references/INDEX.md` ponderado (evidencia UX / producto real / inspiración visual / agentes) con disparadores de consulta por arquetipo/filosofía/estilo/patrón
- [x] 2.4 Verificar el esquema de cada ficha y que no se copia identidad visual ni assets (solo patrones y lecciones)

## 3. Guía 01 y renumerado

- [x] 3.1 Crear `guides/01-EXPERIENCE-DIRECTION.md` (≤ ~120 líneas): intake → preguntas adaptativas → arquetipo/filosofía → journey/IA → 3 direcciones → `EXPERIENCE-BRIEF.md` → gate
- [x] 3.2 Renumerar con `git mv`: `01-UX-FLOWS`→`02`, `02-TOKENS`→`03`, `03-INVENTORY`→`04`, `04-FIND`→`05`, `05-REUSE`→`06`, `06-ADAPT`→`07`, `07-PHILOSOPHY`→`08`, `08-VERIFY`→`09`, `09-ITERATE`→`10`; actualizar títulos y enlaces "Next:" internos
- [x] 3.3 Actualizar referencias cruzadas en `00-START-HERE`, `ADAPTERS`, `AGENTS.md`, `skills/ai-frontend-guide`, `skills/ux-map`, `skills/frontend-polish`, READMEs, `VERIFICATION.md`, `tools/build-kit.mjs`, `tools/build-index.mjs` y docs raíz; `03-TOKENS` consume el brief visual y `08-PHILOSOPHY` amplía anti-genérico

## 4. Laya genérico (preguntas, dirección, componentes)

- [x] 4.1 `tools/laya_select.py`: `--dataset components|experience`, `--kind`, `--task fit|direction|next-question|options` con plantillas de instrucciones por tarea; salida con `task/kind` y reglas de baja confianza; conservar comportamiento de componentes por defecto
- [x] 4.2 Cargador de `experience/experience-manifest.json` con pre-filtro determinista por `kind/phase`; cap 8–12; `--context-file` para el estado del brief
- [x] 4.3 Fallback determinista: árbol de preguntas por fases y tabla heurística de direcciones cuando no hay Laya/Python; consentimiento por sesión documentado (`--confirmed` por llamada)
- [x] 4.4 Pruebas: `--dry-run --json` en components y experience (direction y next-question), regresión del ranking de componentes y códigos de salida (2/3)

## 5. Mapa Excalidraw dirigido por dirección

- [x] 5.1 `skills/ux-map/SKILL.md`: plantillas por `navigation_model` (`one-page`, `flow`, `hub`, `catalog`, `console`, `tree`), áreas/colores desde el brief, filas por etapas del journey y leyenda `Dirección · Navegación · P(fit)`; mantener mantenimiento incremental y fallback
- [x] 5.2 `guides/02-UX-FLOWS.md`: el gate exige mapa coherente con `UX-SPEC.md` (nombres) y `EXPERIENCE-BRIEF.md` (plantilla/áreas/leyenda); camino C conserva baseline
- [x] 5.3 Probar el servidor local con una plantilla `one-page` y una `flow` (nodos por sección/paso, leyenda) y registrar el resultado en `VERIFICATION.md`

## 6. Integración y documentación

- [x] 6.1 `AGENTS.md` del kit + `skills/ai-frontend-guide/SKILL.md`: fase de dirección, `experience/`, datasets/tareas de Laya y consentimiento por sesión
- [x] 6.2 `install.mjs`: assets nuevos (`experience/`) copiados por el kit, mensajes/salida con guía 01 + brief; `tools/build-kit.mjs` exige `experience/EXPERIENCE-DIRECTION.md`, `experience/experience-manifest.json` y `guides/01-EXPERIENCE-DIRECTION.md`; regenerar `manifest/` y `catalog/`
- [x] 6.3 READMEs (raíz y kit), `componentes_reutilizables.md`, `flujo_operativo_*.md` y `VERIFICATION.md` sincronizados con el renumerado y la capa de experiencia

## 7. Verificación y cierre

- [x] 7.1 `node tools/build-kit.mjs`, `node tools/validate.mjs` y `openspec validate add-experience-direction --strict`
- [x] 7.2 E2E en proyecto temporal: instalación (experience/ + guía 01 + renumerado), dry-run de Laya en ambos datasets y mapa direction-aware con el servidor local
- [x] 7.3 Grep de referencias viejas (`01-UX-FLOWS`, `09-ITERATE`…) sin restos fuera de `openspec/changes/archive/`; guías ≤ ~120 líneas; archivar el change y sincronizar specs
