# Design

## Context

Ver `proposal.md`. El kit ya tiene: catálogo, guías 00–08, memoria (`ai-frontend-output/`), instalador con skills vía `npx skills add` y skill genérica propia. `jpoindexter/ux-flow-skills` es MIT, formato Agent Skills, 16 skills + `report-template.html`; su dispatcher `userflow` enruta (máx. 4), aplica anti-patrones y genera `flow-report.html`.

## Goals / Non-Goals

**Goals:**

- Fase UX-first con flujos probados, integrada sin romper la numeración de guías.
- Modos explícitos para UX existente (resumir / rediseño radical solo-UX) con baseline y diff auditables.
- Distribución vendorizada y sincronizable desde este repo.

**Non-Goals:**

- Modificar el contenido de las skills UX (se copian tal cual, con licencia y pin).
- Rediseño de producto (audiencia/conversión): fuera de alcance del modo radical.
- Renumerar las guías existentes.

## Decisions

### D1. Vendorizado con pin + script de sync

`tools/sync-ux-skills.mjs` descarga el árbol del commit de `main` vía API de GitHub (sin clonar), valida licencia MIT y frontmatter, escribe `skills/<name>/**` plano (junto a `skills/ai-frontend-guide/`) y registra repo+commit+fecha en `skills/UX-SKILLS-ORIGIN.md`. `--check` compara el commit pinneado con el último del origen.

- Alternativa descartada: instalar desde el repo original — el usuario pidió distribución desde este repo y el pin protege de cambios/abandonos.
- Nombres planos: compatibilidad garantizada con `npx skills add` (instala las 17 de una vez).

### D2. `context.mjs` sin dependencias y token-efficient

Escanea: manifiesto de paquetes (stack), directorios de rutas/páginas habituales (`app/**/page.*`, `pages/**`, `src/routes/**`…), documentos (`README.md`, `docs/`, `PRODUCT.md`, `DESIGN.md`, `INVENTORY.md`), `openspec/specs` y `ai-frontend-output/ux` previo. Salida ≤ ~150 líneas a `ai-frontend-output/ux/REPO-CONTEXT.md` con `ux_present` y evidencia; `--json` disponible.

### D3. Guía `01-UX-FLOWS` con 4 caminos

- **A · Sin UX** → `userflow` desde cero → UX-SPEC ideal.
- **B · Resumen (UX existente + elección)** → as-is + auditoría, sin cambios.
- **C · Rediseño (UX existente + elección)** → `UX-BASELINE.md` → UX-SPEC ideal → `UX-DIFF.md`; solo UX, `PRODUCT.md` intacto.
- **D · Auditoría puntual** (`/userflow audit …`) → report + hallazgos, sin cambios.
Regla: con `ux_present: true` el agente **pregunta** (una vez) y no rediseña en silencio. Gate: sin `UX-SPEC.md` con pantallas y estados no se pasa a UI. `01-ANCHOR.md` se elimina (su contenido de anclaje se absorbe en la nueva guía).

### D4. Salidas en `ai-frontend-output/ux/`

Junto a la memoria (preservado en refrescos): `REPO-CONTEXT.md`, `UX-SPEC.md`, `flow-report.html`, y según modo `UX-BASELINE.md` / `UX-DIFF.md` / `OPEN-QUESTIONS.md`. `03-INVENTORY` y `memory.mjs --screen/--block` se derivan de la UX-SPEC (coherencia UX↔UI y combinaciones ligadas a estructura real).

### D5. Instalador y empaquetado

La entrada del repo pasa a instalar todas sus skills (`--skill` omitido): 17 totales. El tarball npm sigue sin incluir `skills/` (se instalan desde GitHub, manteniendo el paquete ligero). `build-kit.mjs` verifica activos del kit (`tools/context.mjs`, `guides/01-UX-FLOWS.md`, `guides/ADAPTERS.md`) y del repositorio (`skills/userflow/SKILL.md`, `skills/UX-SKILLS-ORIGIN.md`, `skills/flow-*/SKILL.md`).

### D6. Adaptación BMAD / spec-driven sin tocar lo vendorizado

La detección vive en `context.mjs` (marcadores tolerantes: carpetas BMAD, PRD/brief/arquitectura, documentos UX, stories, `openspec/`), la guía de adaptación en `guides/ADAPTERS.md` (referencia, no paso) y la trazabilidad en `memory.mjs --ref` (campo opcional en el registro y columna en `SUMMARY.md`). Las skills UX vendorizadas NO se modifican (el sync las reescribiría): la adaptación es responsabilidad de la capa del kit (AGENTS/SKILL/guías), que enseña a usar las skills dentro de un repo BMAD o con specs.

- Alternativa descartada: parchear las SKILL.md vendorizadas para mencionar BMAD — rompería el pin de sincronización.
- Alternativa descartada: exigir `PRODUCT.md` siempre — con PRD de BMAD sería una fuente de verdad duplicada.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| El origen (repo nuevo, 4★) cambia o se abandona | Vendorizado pinneado + `--check`; las skills son markdown autocontenido |
| Duplicación de guía de anclaje al reemplazar 01-ANCHOR | La nueva guía absorbe el anclaje y `PRODUCT.md` sigue siendo la entrada |
| Rediseño percibido como ruptura | Modo explícito, baseline y diff obligatorios, límite solo-UX |
| Coste de contexto al analizar repos grandes | `context.mjs` resume a ≤ ~150 líneas; el agente no explora el árbol completo |

## Migration Plan

- Aditivo + reemplazo de una guía; las referencias a `01-ANCHOR` se actualizan en 00/AGENTS/SKILL/README. Rollback: eliminar `skills/flow-*`, `skills/userflow`, el script de sync, `context.mjs` y `01-UX-FLOWS`, restaurando `01-ANCHOR`.
