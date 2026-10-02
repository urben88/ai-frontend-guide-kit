# Proposal

## Why

El kit decide hoy la UX con flujos probados (`userflow`/`flow-*`) pero salta de `PRODUCT.md` a `UX-SPEC.md` sin elegir **qué tipo de experiencia** se construye: ni arquetipo, ni filosofía, ni dirección creativa, ni extracción de ideas de referencias. El resultado tiende al patrón genérico (hero con gradiente, tres tarjetas, testimonios) y Laya solo participa en la fase de componentes.

El usuario quiere una capa previa de **dirección de experiencia** que: pregunte de forma adaptativa (cada pregunta abre las siguientes), use a Laya como motor local de decisión para elegir qué preguntar y qué arquetipo/filosofía/estilo/componente encaja (sobre datos de manifest estructurados), guarde un banco de ideas extraídas de fuentes reales para reutilizarlas, y aterrice la dirección en el mapa Excalidraw (plantillas por modelo de navegación + leyenda), antes de tocar componentes y colores.

## What Changes

- **Nueva capa `ai-frontend-guide-kit/experience/`**: manifiesto `EXPERIENCE-DIRECTION.md` (proceso, arquetipos, reglas, formato de salida), `QUESTION-BANK.md` (árbol adaptativo con `phase/depends_on/unlocks/options`), `SITE-ARCHETYPES.md` (arquetipos de sitio, de experiencia y tipos de página), `UX-PHILOSOPHIES.md` (filosofías con estructura/navegación/densidad/emoción/riesgos), `STYLE-DIRECTIONS.md` (estilos con límites + anti-genérico P0/P1), `REFERENCE-PROTOCOL.md` (fuentes ponderadas, esquema de ficha, ética y extracción on-demand), `experience-manifest.json` (legible por Laya) y banco de fichas `references/` + `references/INDEX.md`.
- **Nueva guía `01-EXPERIENCE-DIRECTION.md`** y **renumerado** `01-UX-FLOWS` → `02-UX-FLOWS` … `09-ITERATE` → `10-ITERATE`: preguntas adaptativas por rondas → arquetipo/filosofía → journey/IA → 3 direcciones (segura/diferenciada/experimental) → `ai-frontend-output/ux/EXPERIENCE-BRIEF.md` como gate antes de la fase de flujos.
- **Laya generalizado**: `--dataset components|experience`, `--kind archetype|philosophy|style|question|page-type`, `--task fit|direction|next-question|options`; rankea preguntas siguientes, direcciones y componentes con las mismas preguntas tipadas (`noul` + `choice`); consentimiento una vez por sesión registrado en el brief; fallback determinista por árbol y `find`/`get`.
- **Mapa Excalidraw dirigido por la dirección**: la skill `ux-map` gana plantillas por `navigation_model` (`one-page`, `flow`, `hub`, `catalog`, `console`, `tree`), áreas/colores desde el brief, filas por etapas del journey y leyenda con `Dirección · Navegación · P(fit)`; el gate de `02-UX-FLOWS` exige coherencia con `UX-SPEC.md` y `EXPERIENCE-BRIEF.md`.
- **Extracción curada + on-demand** de las fuentes aportadas por el usuario: fichas completas de las metodológicas (NN/g, GOV.UK, USWDS, Welie, Laws of UX, IDF, Material 3, W3C), representantes de producto real (Mobbin, Page Flows, Refero, UXMaps…) y galerías (Awwwards, SiteInspire, Lapa, Land-book, Dribbble…); fichas nuevas con Playwright MCP sobre URLs concretas; nunca identidad visual, solo patrones y lecciones.
- **Integración**: router `00`, `02-UX-FLOWS` (consume el brief), `03-TOKENS` (tokens desde el brief visual), `08-PHILOSOPHY` (anti-genérico ampliado), `AGENTS.md`, skill genérica `ai-frontend-guide`, `frontend-polish` y `ux-map` (referencias renumeradas), READMEs, `VERIFICATION.md`, `tools/build-kit.mjs` y docs raíz.

## Capabilities

### New Capabilities

- `experience-direction`: capa de conocimiento, preguntas adaptativas, banco de fichas de ideas, tres direcciones y `EXPERIENCE-BRIEF.md` con gate.

### Modified Capabilities

- `laya-ranking`: datasets/tareas genéricas sobre manifest, ranking de preguntas y dirección, consentimiento por sesión y documentación renumerada.
- `ux-flow-layer`: el brief de dirección alimenta los flujos; el mapa visual pasa a plantillas por modelo de navegación con leyenda y áreas del brief.
- `guided-frontend-kit`: guía `01-EXPERIENCE-DIRECTION`, renumerado `01–10`, assets de `experience/` verificados por el empaquetado y skill `ux-map` ampliada.
- `kit-distribution`: la salida final del instalador menciona la nueva guía 01 y el brief de experiencia.

## Impact

- Nuevos: `ai-frontend-guide-kit/experience/**`, `ai-frontend-guide-kit/guides/01-EXPERIENCE-DIRECTION.md`, `openspec/changes/add-experience-direction/**`.
- Renombrados (renumerado): `ai-frontend-guide-kit/guides/01-UX-FLOWS.md` → `02-UX-FLOWS.md` … `09-ITERATE.md` → `10-ITERATE.md`.
- Actualizados: `install.mjs`, `ai-frontend-guide-kit/AGENTS.md`, `ai-frontend-guide-kit/README.md`, `ai-frontend-guide-kit/VERIFICATION.md`, `README.md`, `skills/ai-frontend-guide/SKILL.md`, `skills/ux-map/SKILL.md`, `skills/frontend-polish/SKILL.md`, `tools/build-kit.mjs`, `tools/build-index.mjs`, `tools/laya_select.py`, `componentes_reutilizables.md`, `flujo_operativo_*.md` y los índices generados (`manifest/`, `catalog/`).
- Sin dependencias nuevas: todo corre con Node (y Python/Laya opcional); la extracción on-demand usa el Playwright MCP ya configurado.
