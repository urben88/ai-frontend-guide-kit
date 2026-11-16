# weak-model-design: classification of the technique list and the psychology list

Task T11 (S9) and T14 (S12). Every item of `weak-model-design-techniques.md` (sections T1 to T14 and the golden rule, T-oro) and of `weak-model-design-psychology.md` (P1 to P14) has one row. The items are named as in the source; the tables follow its order. Checked by `tests/technique.test.mjs`: every item is in its section, every class is a to d, and every card of `experience/techniques.json` is the target of some row.

| Class | Meaning | Target |
|---|---|---|
| a | A technique the agent applies in code | the card id in `experience/techniques.json` (served by `technique.mjs` from the routing task) |
| b | A check a tool measures | the tool and its check id (`audit-design.mjs`, `audit-honesty.mjs`, `audit-a11y.mjs`, `audit-perf.mjs`, `tokens.mjs`) |
| c | Needs an external tool (image, 3D asset or texture generation, AR, direct manipulation, vision); the kit gives the instruction or prompt | an `ext-` card (kind `external`) |
| d | Already covered by the kit | the file, tool, skill or flow step that covers it |

When an item has a card and a tool measures part of it, the class is a (the card) and the tool is named in the card's `check` line.

## Totals

Rows: 385. Class a: 226. Class b: 47. Class c: 18. Class d: 94.
Cards: see `node ai-frontend-guide-kit/tools/technique.mjs check --json` (by area).

## Decisions

- One new area, `direction` (creativity, iteration, locks, variations), because the lists hold strategy and iteration techniques that fit none of layout, type, color, motion, imagery, 3d, svg, interaction, content, psychology.
- Style directions in the cards are the 24 style ids of `experience/experience-manifest.json` (without `exp-style-`) plus `any`; the validator reads them from there.
- Psychology principles that are also layout or interaction techniques (Z and F pattern, progressive disclosure, single column, asymmetry) point to the one card of that technique; they are not duplicated in the area psychology.
- The two reference documents (`reference-laws-of-ux.md`, `reference-deceptive-patterns.md`) are cited from the cards through `refs`; their content is not copied.

## Open items (what no tool measures yet, said plainly)

- One focal point: left by hand (polish question 2). Attention depends on images, color, contrast and space; a size-only heuristic would give false confidence. External option: `ext-attention-map`.
- Legal text that contradicts the interface: semantic, not detectable in source; by hand with `reference-deceptive-patterns.md`.
- Originality score: no numeric score; the anti-slop taxonomy and the two tests of `STYLE-DIRECTIONS.md` are the measure.
- Still measurable and not yet in `audit-design.mjs` (from LAYOUT-RULES section 9): hero height, image width and height, control height and gap, at most 3 text sizes per view.
- Contrast over image backgrounds: `audit-design.mjs` skips them; use `tokens.mjs` contrast on the worst point.
- Keyboard navigation and screen reader behavior: axe covers part; the rest is the "Keyboard only" line of the polish report and `ext-screen-reader-test`.
- The 3D cards give the rules; the skill `scene-3d` and SCENE-SPEC.md belong to the 3D task and build on them.

## T1 Estrategia y concepto

| Item | Class | Target |
|---|---|---|
| Brief guiado | d | `flow.mjs` step direction.questions with `QUESTION-BANK.md` |
| Moodboard automático | d | `flow.mjs` step direction.directions (3 directions) with `STYLE-DIRECTIONS.md`; image tiles: `ext-moodboard-images` |
| Referencias anotadas | d | `scout.mjs`, `REFERENCE-PROTOCOL.md`, `flow.mjs` step direction.references |
| Referencias positivas y negativas | d | `REFERENCE-PROTOCOL.md` (positive and negative references), `flow.mjs` step direction.references |
| Positioning visual | d | `STYLE-DIRECTIONS.md` (24 styles), `UX-PHILOSOPHIES.md` |
| Mapa de mensajes | d | PRODUCT.md structure (`flow.mjs` step ux.product) and the narrative of each section in `page-recipes.json` |
| Definición de CTA principal | d | PRODUCT.md G1 (gated) and `audit-design.mjs` multiple-primary |
| Arquetipos de marca | d | `SITE-ARCHETYPES.md`, `UX-PHILOSOPHIES.md` |
| Análisis de competencia | d | `scout.mjs`, `DISCOVERY-LOOP.md` |
| Naming de secciones | a | `section-naming` |

## T2 Arquitectura de información

| Item | Class | Target |
|---|---|---|
| Sitemap | d | UX-SPEC Screens table (gated), skill `ux-map`, `ui-map.mjs` |
| User flows | d | UX-SPEC Flows (gated), skill `userflow` |
| Card sorting | a | `card-sorting` |
| Content inventory | d | INVENTORY.md written by `recipe.mjs` inventory |
| Priority matrix | d | INVENTORY Priority column (must, should, nice), gated in `flow-gates.mjs` |
| Jerarquía de información | b | `audit-design.mjs` heading-skip, multiple-h1; section order from `recipe.mjs` |
| Progressive disclosure | a | `progressive-disclosure` |
| Navegación persistente | d | UX-SPEC Navigation (gated), skills `flow-navigation`, `flow-search` |
| Mapa de conversiones | d | PRODUCT.md ids G, O, P and the Serves column of UX-SPEC (gated in `flow-gates.mjs`) |
| Diagramas de estados | d | UX-SPEC empty, loading and error columns (gated), skills `flow-empty-states`, `flow-errors` |

## T3 Wireframes y maquetación

| Item | Class | Target |
|---|---|---|
| Wireframes low-fidelity | d | skill `ux-map` (screen map) and UX-SPEC; no styled wireframe tool is needed |
| Wireframes mid-fidelity | d | INVENTORY layout column from `recipe.mjs`, `LAYOUT-RULES.md` |
| Grid system | d | `LAYOUT-RULES.md` (12-column grid, container, spans at 360, 768 and 1280) |
| Layout modular | a | `bento-grid` |
| Layout asimétrico | a | `asymmetric-layout` |
| Broken grid controlado | a | `broken-grid` |
| Espaciado escalable | d | `tokens.mjs` spacing scale; measured by `audit-design.mjs` spacing-off-scale |
| Whitespace intencional | a | `whitespace-intent` |
| Ritmo visual | a | `section-rhythm` |
| Z-pattern y F-pattern | a | `z-f-pattern` |
| Sticky elements | a | `sticky-header-cta` |
| Responsive breakpoints | d | `LAYOUT-RULES.md` collapse order; measured by `audit-design.mjs` overflow-x at 360, 768, 1280 |
| Fluid layout | a | `fluid-layout` |
| Container queries | a | `container-queries` |
| Auto-layout | d | `LAYOUT-RULES.md` section 8 (responsive collapse order) |
| Density control | a | `density-modes` |
| Empty states | d | skill `flow-empty-states`, UX-SPEC empty state column (gated) |
| Skeletons | a | `skeleton-loading` |
| Sticky/fixed sections | a | `sticky-header-cta` |
| Scroll snapping | a | `scroll-snap` |
| Multi-column layouts | a | `bento-grid` |
| Overlapping layers | a | `overlap-layers` |
| Full-bleed sections | a | `full-bleed` |
| Split-screen layouts | a | `split-screen` |
| Sticky sidebars | a | `sticky-sidebar` |

## T4 Tipografía

| Item | Class | Target |
|---|---|---|
| Escala tipográfica | d | `tokens.mjs` type scale (font-size tokens) |
| Pareo tipográfico | a | `type-pairing` |
| Tipografía variable | a | `variable-font` |
| Kinetic typography | a | `kinetic-type` |
| Oversized headlines | a | `oversized-headline` |
| Fluid type | a | `fluid-type` |
| Medida de línea | b | `audit-design.mjs` line-length (45 to 90 characters) |
| Interlineado | a | `line-height-tracking` |
| Tracking | a | `line-height-tracking` |
| Contraste tipográfico | a | `type-weight-contrast` |
| Jerarquía por peso | a | `type-weight-contrast` |
| Texto sobre imagen | a | `text-on-image` |
| Números tabulares | a | `tabular-numbers` |
| Jerarquía de enlaces | a | `link-states` |
| Tipografía accesible | b | `audit-design.mjs` contrast-low, `tokens.mjs` check |
| Fallback fonts | a | `font-fallback` |
| Anti-“AI font” | a | `avoid-default-fonts` |

## T5 Color y contraste

| Item | Class | Target |
|---|---|---|
| Paleta primaria | d | `tokens.mjs` init (OKLCH ramps from one primary) |
| Neutros | d | `tokens.mjs` init (neutral ramp and semantic surface, text, border tokens) |
| Tokens semánticos | d | `tokens.mjs` init (semantic colors) |
| Modo claro y oscuro | a | `dark-mode-elevation` |
| Contraste AA | b | `tokens.mjs` check and contrast, `audit-design.mjs` contrast-low |
| Contraste no dependiente del color | a | `color-not-only` |
| Color como acento | a | `accent-discipline` |
| Degradados con propósito | a | `purposeful-gradient` |
| Gradientes accesibles | a | `purposeful-gradient` |
| Duotono | a | `duotone-image` |
| Paleta editorial | a | `palette-editorial` |
| Paleta industrial | a | `palette-industrial` |
| Paleta premium | a | `palette-premium` |
| Paleta brutalista | a | `palette-brutalist` |
| Dark mode real | a | `dark-mode-elevation` |
| Color-blind safety | a | `color-not-only`, `ext-colorblind-sim` |
| Color tokens exportables | d | `tokens.mjs` css (Tailwind v4 theme and CSS variables) and the JSON file |

## T6 Componentes y UI

| Item | Class | Target |
|---|---|---|
| Design tokens | d | `tokens.mjs` (the design-tokens.json file: color, type, spacing, radius, motion) |
| Botones | d | catalog: `find.mjs` and `get.mjs` (category button) |
| Inputs | d | catalog: `find.mjs`; skill `flow-forms` |
| Cards | d | catalog: `find.mjs` (category card) |
| Navigation | d | catalog: `find.mjs`; skill `flow-navigation` |
| Modales y drawers | a | `accessible-overlay` |
| Tooltips y popovers | a | `accessible-overlay` |
| Tabs y acordeones | a | `progressive-disclosure` |
| Tables | d | skill `flow-tables`, catalog `find.mjs` |
| Forms | d | skill `flow-forms`; principles in `minimal-form` and `form-feedback` |
| Badges y tags | d | catalog: `find.mjs` (category badge) |
| Avatares e imágenes | a | `smart-placeholder` |
| Icon system | a | `icon-system` |
| Illustration system | a | `illustration-system` |
| Component variants | d | `pieces.mjs` (variants and versions of the project's own components) |
| Component constraints | d | `tokens.mjs` and `audit-design.mjs` (values outside the tokens are findings) |
| Design review automático | b | `audit-design.mjs` (static and rendered layers, numbered fixes) |

## T7 Imagen, ilustración y arte

| Item | Class | Target |
|---|---|---|
| Art direction | a | `art-direction` |
| Image prompts | c | `ext-image-prompt` |
| Image editing | c | `ext-image-editing` |
| Moodboard visual | c | `ext-moodboard-images` |
| Consistencia de personajes/productos | c | `ext-image-consistency` |
| Ilustración vectorial | d | `svg.mjs` gen and skill `svg-craft`; system rules in `illustration-system` |
| Generative fill | c | `ext-image-editing` |
| Background removal | c | `ext-background-removal` |
| Image-to-UI | c | `ext-screenshot-to-code` |
| Screenshot-to-code | c | `ext-screenshot-to-code` |
| Brand asset extraction | c | `ext-screenshot-to-code` |
| Placeholder inteligente | a | `smart-placeholder` |
| Lazy loading | a | `responsive-images` |
| Responsive images | a | `responsive-images` |
| Alt text generado | a | `alt-text` |

## T8 Motion y microinteracciones

| Item | Class | Target |
|---|---|---|
| Motion principles | a | `motion-purpose` |
| Microinteractions | a | `microinteractions` |
| Entrance animations | a | `entrance-stagger` |
| Scroll-driven animations | a | `scroll-driven-css` |
| Scrollytelling | a | `scroll-driven-css` |
| Hover states | a | `hover-states` |
| Page transitions | a | `view-transitions` |
| Loading animations | a | `skeleton-loading` |
| Cursor effects | a | `magnetic-cursor` |
| Magnetic buttons | a | `magnetic-cursor` |
| Text reveal | a | `text-reveal` |
| Parallax | a | `parallax-layers` |
| Lottie animations | a | `lottie-animation` |
| Reduced motion | b | `audit-design.mjs` no-reduced-motion |
| Performance budget | b | `audit-design.mjs` animate-layout, transition-all; `audit-perf.mjs` |
| Motion tokens | d | `tokens.mjs` motion tokens (durations, easings) |
| Narrative motion | a | `motion-purpose` |

## T9 3D, WebGL y profundidad

| Item | Class | Target |
|---|---|---|
| 3D hero object | a | `3d-hero-object` |
| Product viewer | a | `3d-product-viewer` |
| Scene builder | a | `3d-scene-setup` |
| Material editor | a | `3d-materials` |
| Lighting presets | a | `3d-lighting-presets` |
| Camera paths | a | `3d-camera-scroll` |
| Scroll-linked 3D | a | `3d-camera-scroll` |
| Interactive 3D | a | `3d-interactive` |
| 3D-to-2D fallback | a | `3d-fallback` |
| Lazy 3D loading | a | `3d-perf-budget` |
| Performance controls | a | `3d-perf-budget` |
| Depth without 3D | a | `depth-without-3d` |
| AR preview | c | `ext-ar-preview` |
| 3D asset generation | c | `ext-3d-asset` |
| Texture generation | c | `ext-texture` |
| Scene composition | a | `3d-scene-setup` |
| Accessibility fallback | a | `3d-fallback` |

## T10 Creatividad y anti-genérico

| Item | Class | Target |
|---|---|---|
| Style transfer | a | `style-transfer` |
| Creative direction agent | d | `flow.mjs` step direction.directions: safe, differentiated and experimental concepts |
| Moodboard-to-design | d | `flow.mjs` step direction.references then `tokens.mjs` init; method in `style-transfer` |
| Design DNA | d | DESIGN.md with design-tokens.json (`tokens.mjs`) and `memory.mjs` |
| Variation generator | a | `variation-set` |
| Constraint-based creativity | a | `constraint-creativity` |
| Anti-pattern detection | d | `reference-anti-ai-slop-taxonomy.md` and the two tests in `STYLE-DIRECTIONS.md` |
| Originality score | d | no numeric score by design: the anti-slop taxonomy and the two tests of `STYLE-DIRECTIONS.md` stand in (see Open items) |
| Brand consistency check | b | `audit-design.mjs` color-literal, font-size-off-scale, too-many-font-families |
| Serendipity engine | a | `mood-mixing` |
| Mood mixing | a | `mood-mixing` |
| Reference blending | a | `mood-mixing` |
| Content-aware design | d | `recipe.mjs` (recipe per page type), `SITE-ARCHETYPES.md` |
| Persona-based design | a | `persona-pass` |
| A/B creative variants | a | `ab-variants` |

## T11 Accesibilidad y calidad

| Item | Class | Target |
|---|---|---|
| Contrast checker | b | `tokens.mjs` contrast, `audit-design.mjs` contrast-low |
| Focus visible | b | `audit-design.mjs` outline-removed |
| Keyboard navigation | b | `audit-a11y.mjs` (axe) and the "Keyboard only" line of the polish report |
| Semantic HTML | b | `audit-a11y.mjs` (axe) |
| Heading hierarchy | b | `audit-design.mjs` heading-skip, multiple-h1 |
| Alt text | b | `audit-design.mjs` img-no-alt (presence); quality in `alt-text` |
| Touch targets | b | `audit-design.mjs` target-small |
| Reduced motion | b | `audit-design.mjs` no-reduced-motion |
| Screen reader testing | c | `ext-screen-reader-test` |
| Color-blind simulation | c | `ext-colorblind-sim` |
| Responsive audit | b | `audit-design.mjs` overflow-x at 360, 768 and 1280 |
| Performance audit | b | `audit-perf.mjs` (LCP, CLS, TBT) |
| SEO basics | a | `seo-basics` |
| Content readability | a | `scannable-copy` |
| Accessibility report | b | `audit-a11y.mjs` and `audit-design.mjs` --report (numbered fixes) |

## T12 Iteración y control humano

| Item | Class | Target |
|---|---|---|
| Design history | d | git history and `memory.mjs` |
| Version branches | d | git branches and `memory.mjs` combo save and apply |
| Section-level editing | d | `pieces.mjs` version and variants |
| Lock elements | a | `lock-decisions` |
| Selective regeneration | d | route `iterate` of `flow.mjs` with `pieces.mjs` |
| Visual diff | c | `ext-visual-diff` |
| Critique mode | d | skill `frontend-polish`, `audit-design.mjs` numbered fixes |
| Rubric scoring | b | `audit-design.mjs` counts by severity and the polish report |
| Reference adherence | d | `REFERENCE-PROTOCOL.md`, `scout.mjs` |
| Prompt memory | d | `memory.mjs` (decisions) and `pieces.mjs` (history) |
| Feedback in natural language | a | `feedback-to-change` |
| Direct manipulation | c | `ext-direct-manipulation` |
| Sketch-to-design | c | `ext-screenshot-to-code` |
| Comment-to-change | d | `11-VISUAL-FEEDBACK.md` (point in the browser and describe the change) |
| Human-in-the-loop | d | `flow.mjs` step direction.choose asks the user; every route ends with the user's decision |

## T13 Exportación y producción

| Item | Class | Target |
|---|---|---|
| Exportar a HTML/CSS/JS limpio. | d | `STACK-RECIPES.md` (compose step builds in the project stack) |
| Exportar a React, Vue, Svelte o Astro. | d | `STACK-RECIPES.md`, `context.mjs` (detects the stack) |
| Tailwind CSS y CSS variables. | d | `tokens.mjs` css |
| Design tokens en JSON, CSS o Figma variables. | d | `tokens.mjs` (design-tokens.json, css, doc) |
| Componentes reutilizables. | d | `pieces.mjs` |
| Responsive code real, no solo una vista estática. | b | `audit-design.mjs` overflow-x at three widths |
| Accesibilidad integrada en el código. | b | `audit-a11y.mjs` |
| SEO semántico. | a | `seo-basics` |
| Animaciones optimizadas. | b | `audit-design.mjs` animate-layout, transition-all |
| Imágenes optimizadas y responsive. | a | `responsive-images` |
| Fuentes autohospedadas o con fallback. | a | `font-fallback` |
| Dark mode funcional. | d | `tokens.mjs` init --dark; method in `dark-mode-elevation` |
| CMS-ready blocks | a | `cms-ready-blocks` |
| Design-to-code fidelity | b | `audit-design.mjs` color-literal, arbitrary-value, spacing-off-scale (code against the tokens) |
| Code review | d | skill `frontend-polish`, `audit-design.mjs`, `audit-a11y.mjs`, `audit-perf.mjs` |

## T14 Módulos que yo añadiría

| Item | Class | Target |
|---|---|---|
| Brand Brain | d | DESIGN.md, design-tokens.json (`tokens.mjs`), `memory.mjs` |
| Reference Analyzer | d | `scout.mjs`, `REFERENCE-PROTOCOL.md` |
| Concept Generator | d | `flow.mjs` step direction.directions |
| Wireframe Engine | d | skill `ux-map`, `recipe.mjs` |
| Design System Builder | d | `tokens.mjs` |
| Visual Composer | d | `recipe.mjs`, `LAYOUT-RULES.md` |
| Art Director | d | `STYLE-DIRECTIONS.md`; image rules in `art-direction` |
| Motion Director | a | `motion-purpose` |
| 3D Studio | a | `3d-scene-setup`, `3d-fallback` (the scene-3d skill of the 3D task builds on these) |
| Accessibility Auditor | b | `audit-a11y.mjs` |
| Critique Agent | d | skill `frontend-polish` |
| Code Generator | d | `flow.mjs` step compose with `STACK-RECIPES.md` |
| Design QA | b | `audit-design.mjs` with the polish gate of `flow.mjs` |
| Iteration Memory | d | `memory.mjs`, `pieces.mjs` |

## T-oro Regla de oro

| Item | Class | Target |
|---|---|---|
| ¿Qué sensación debe transmitir? | d | `QUESTION-BANK.md` (feeling and tone questions) |
| ¿A quién le habla? | d | PRODUCT.md Audience (gated) |
| ¿Qué debe hacer el usuario? | d | PRODUCT.md Primary action G1 (gated) |
| ¿Qué referencias te gustan y por qué? | d | `flow.mjs` step direction.references |
| ¿Qué quieres evitar? | d | `REFERENCE-PROTOCOL.md` (negative references) |
| ¿Qué elementos son intangibles de marca? | d | `QUESTION-BANK.md` brand questions, DESIGN.md Visual intent |
| ¿Qué secciones cambian y cuáles se bloquean? | a | `lock-decisions` |
| ¿Qué versión prefieres y por qué? | d | `flow.mjs` step direction.choose and `memory.mjs` add |

## P1 Atención y jerarquía visual

| Item | Class | Target |
|---|---|---|
| Jerarquía visual | a | `visual-hierarchy` |
| Atención selectiva | a | `single-focal-point` |
| Ley de Fitts | a | `cta-size-placement` |
| Ley de Hick | a | `hicks-choice-limit` |
| Ley de Proximidad | a | `gestalt-grouping` |
| Ley de Similitud | a | `gestalt-grouping` |
| Ley de Continuidad | a | `gestalt-grouping` |
| Ley de Cierre | a | `figure-ground` |
| Figura-fondo | a | `figure-ground` |
| Zona de lectura | a | `z-f-pattern` |

## P2 Carga cognitiva

| Item | Class | Target |
|---|---|---|
| Una idea por bloque | a | `one-idea-per-block` |
| Máximo 3–4 grupos de información por pantalla | a | `one-idea-per-block` |
| Progresión por pasos | a | `multi-step-form` |
| Valores por defecto inteligentes | a | `smart-defaults` |
| Mostrar, no obligar a recordar | a | `smart-defaults` |
| Etiquetas familiares | a | `familiar-patterns` |
| Modelos mentales existentes | a | `familiar-patterns` |
| Eliminar ruido visual | a | `single-focal-point` |
| Chunking | a | `one-idea-per-block` |
| Progresiva | a | `progressive-disclosure` |
| Feedback inmediato | a | `immediate-feedback` |
| Prevención de errores | a | `error-prevention` |

## P3 Recompensa y motivación

| Item | Class | Target |
|---|---|---|
| Progreso visible | a | `multi-step-form` |
| Recompensa inmediata | a | `completion-moment` |
| Recompensa variable | a | `curated-recommendations`, `bounded-feed` |
| Curiosidad | a | `cta-promise` |
| Logro | a | `completion-moment` |
| Momentum | a | `user-control-exits` |
| Autonomía | a | `user-control-exits` |
| Pérdida aversiva | a | `real-urgency` |
| Prueba social | a | `specific-social-proof` |
| Compromiso progresivo | a | `progressive-commitment` |

## P4 Emoción y primera impresión

| Item | Class | Target |
|---|---|---|
| Claridad antes que originalidad | a | `clarity-first` |
| Una emoción dominante | a | `one-emotion` |
| Coherencia sensorial | a | `one-emotion` |
| Contraste emocional | a | `section-rhythm` |
| Rostro humano | a | `human-face` |
| Imágenes específicas | a | `human-face` |
| Microcopy humano | a | `clarity-first` |
| Reducción de incertidumbre | a | `cta-promise` |
| Confianza visual | a | `specific-social-proof`, `essentials-visible` |
| Peak-End rule | a | `completion-moment` |

## P5 Distribución de la página

| Item | Class | Target |
|---|---|---|
| Un mensaje principal, no tres propuestas compitiendo. | a | `hero-focus` |
| Un CTA principal, no cinco botones. | a | `one-primary-action` |
| Una imagen o visual que explique el beneficio, no que solo decore. | a | `hero-focus` |
| Prueba de valor cercana | a | `hero-focus` |
| Evitar el hero centrado genérico si buscas personalidad. | a | `hero-focus` |
| Alternar ritmo | a | `section-rhythm` |
| Usar una idea por sección. | a | `one-idea-per-block` |
| Colocar la información crítica antes de pedir scroll excesivo. | a | `essentials-visible` |
| Repetir el CTA cuando el usuario ya tiene contexto, no cada dos líneas. | a | `contextual-cta` |
| Usar testimonios cerca de la objeción que resuelven | a | `proof-near-objection` |
| Terminar cada bloque con una microacción clara. | a | `contextual-cta` |
| Z-pattern | a | `z-f-pattern` |
| F-pattern | a | `z-f-pattern` |
| Columna única en móvil | a | `single-column-mobile` |
| Retícula modular | d | `LAYOUT-RULES.md` (grid and layouts), `recipe.mjs` sections |
| Asimetría controlada | a | `asymmetric-layout` |
| Espacio en blanco | a | `whitespace-intent` |
| Punto focal único | a | `single-focal-point` |
| Progresión descendente | a | `scroll-narrative` |

## P6 Formularios y conversión

| Item | Class | Target |
|---|---|---|
| Menos campos al inicio | a | `minimal-form` |
| Un campo por línea en móvil. | a | `minimal-form` |
| Etiquetas siempre visibles | a | `minimal-form` |
| Validación en tiempo real | a | `form-feedback` |
| Mensajes útiles | a | `form-feedback` |
| Autocompletado | a | `minimal-form` |
| Barra de progreso honesta. | a | `multi-step-form` |
| Botón con verbo concreto | a | `cta-promise` |
| Reassurance cerca del CTA | a | `cta-promise` |
| Error recuperable | a | `form-feedback` |
| Recompensa al completar | a | `completion-moment` |

## P7 Navegación y decisiones

| Item | Class | Target |
|---|---|---|
| Menú corto | b | `audit-design.mjs` nav-long (more than 7 items) |
| Una acción primaria | b | `audit-design.mjs` multiple-primary |
| Acciones secundarias menos visibles | a | `one-primary-action` |
| Agrupar por intención | a | `group-by-intent` |
| Breadcrumbs | a | `current-location` |
| Búsqueda visible si hay mucho contenido. | d | skill `flow-search` |
| Filtros progresivos | a | `hicks-choice-limit` |
| Estado actual claro | a | `current-location` |
| Salidas claras | a | `user-control-exits` |
| Defaults útiles | a | `smart-defaults` |

## P8 Confianza y seguridad

| Item | Class | Target |
|---|---|---|
| Prueba social específica | a | `specific-social-proof` |
| Prueba de competencia | a | `specific-social-proof` |
| Transparencia de precio | a | `price-transparency` |
| Política clara | a | `risk-reversal` |
| Fotos reales | a | `human-face` |
| Testimonios con contexto | a | `specific-social-proof` |
| Errores humanos visibles | a | `human-face` |
| Consistencia | a | `one-emotion` |
| Riesgo reducido | a | `risk-reversal` |

## P9 Movimiento y recompensa sensorial

| Item | Class | Target |
|---|---|---|
| Animar solo lo importante | a | `motion-purpose` |
| Duraciones cortas | a | `motion-purpose` |
| Movimiento con propósito | a | `motion-purpose` |
| Momentum | a | `microinteractions` |
| Feedback táctil | a | `microinteractions` |
| Recompensa de finalización | a | `completion-moment` |
| Sin movimiento constante | a | `motion-purpose` |
| Reduced motion | b | `audit-design.mjs` no-reduced-motion |
| Coherencia | d | `tokens.mjs` motion tokens |

## P10 Personalización y relevancia

| Item | Class | Target |
|---|---|---|
| Segmentar por intención | a | `intent-segmentation` |
| Contenido dinámico | a | `intent-segmentation` |
| Recordar preferencias | a | `remember-preferences` |
| Recomendaciones útiles | a | `curated-recommendations` |
| Evitar personalización invasiva | a | `curated-recommendations` |
| Contexto en cada pantalla | a | `curated-recommendations` |
| Control del usuario | a | `curated-recommendations` |

## P11 Psicología del scroll

| Item | Class | Target |
|---|---|---|
| Ganchos por sección | a | `section-hook` |
| Reveal progresivo | a | `scroll-driven-css` |
| Ritmo de lectura | a | `section-rhythm` |
| Anclas visuales | a | `section-hook` |
| CTA contextual | a | `contextual-cta` |
| No esconder lo esencial | a | `essentials-visible` |
| Final con cierre | a | `contextual-cta` |

## P12 Reglas anti-manipulación

| Item | Class | Target |
|---|---|---|
| Urgencia falsa | b | `audit-honesty.mjs` fake-scarcity, urgency-copy, countdown-timer, fomo-activity |
| Suscripciones ocultas o cancelación difícil. | b | `audit-honesty.mjs` subscription-no-cancel, hard-cancel |
| Botones de aceptar enormes y rechazar diminutos. | b | `audit-honesty.mjs` consent-asymmetry, tiny-decline |
| Precios confusos o cargos ocultos. | b | `audit-honesty.mjs` hidden-fee |
| Consentimiento por defecto. | b | `audit-honesty.mjs` prechecked-extra, prechecked-component |
| Popups que impiden cerrar fácilmente. | b | `audit-honesty.mjs` modal-no-close |
| Texto legal que contradice la interfaz. | d | `reference-deceptive-patterns.md`; no static rule (the contradiction is semantic, see Open items) |
| Gamificación sin valor real. | a | `completion-moment` |
| Scroll infinito sin límites ni control. | b | `audit-honesty.mjs` infinite-scroll |
| “FOMO” artificial. | b | `audit-honesty.mjs` fomo-activity, countdown-timer |
| Urgencia real y verificable. | a | `real-urgency` |
| Cancelación en un clic. | a | `easy-cancel` |
| Elección equilibrada. | a | `balanced-consent` |
| Precios transparentes. | a | `price-transparency` |
| Consentimiento explícito. | a | `balanced-consent` |
| Recompensas basadas en valor. | a | `completion-moment` |
| Progreso honesto. | a | `multi-step-form` |
| Control total del usuario. | a | `user-control-exits` |

## P13 Checklist psicológico para cada pantalla

| Item | Class | Target |
|---|---|---|
| ¿Se entiende en 3 segundos qué es y para quién es? | d | Psychology question 1 of the polish report in `flow-steps.mjs`; `clarity-first` |
| ¿Hay un solo punto focal principal? | d | Psychology question 2 of the polish report in `flow-steps.mjs`; `single-focal-point` (no tool measures attention, see Open items) |
| ¿Hay una sola acción prioritaria? | b | `audit-design.mjs` multiple-primary |
| ¿El CTA es grande, visible y comprensible? | b | `audit-design.mjs` target-small (size); the "understandable" half is question 3 |
| ¿El usuario sabe qué pasará al pulsar? | d | Psychology question 3 of the polish report in `flow-steps.mjs`; `cta-promise` |
| ¿Hay menos de 5 decisiones visibles? | b | `audit-design.mjs` choices-many (more than 5 side by side) |
| ¿La información está agrupada por relación? | d | Psychology question 4 of the polish report in `flow-steps.mjs`; `gestalt-grouping` |
| ¿Hay espacio suficiente entre bloques? | d | Psychology question 4 of the polish report in `flow-steps.mjs`; spacing on the scale is measured by `audit-design.mjs` spacing-off-scale |
| ¿El contraste cumple accesibilidad? | b | `audit-design.mjs` contrast-low, `tokens.mjs` check |
| ¿El texto principal es legible en móvil? | b | `audit-design.mjs` text-small, line-length at 360 px |
| ¿El formulario pide lo mínimo? | b | `audit-design.mjs` form-long |
| ¿Hay feedback inmediato tras cada acción? | d | Psychology question 5 of the polish report in `flow-steps.mjs`; `immediate-feedback` |
| ¿La prueba social es específica y creíble? | d | Psychology question 6 of the polish report in `flow-steps.mjs`; `audit-honesty.mjs` placeholder-proof, unverified-metric |
| ¿El usuario puede volver, cancelar o deshacer? | d | Psychology question 7 of the polish report in `flow-steps.mjs`; `user-control-exits` |
| ¿La recompensa es real y proporcional? | d | Psychology question 8 of the polish report in `flow-steps.mjs`; `completion-moment` |
| ¿La página termina con una acción clara? | d | Psychology question 9 of the polish report in `flow-steps.mjs`; `contextual-cta` |

## P14 Cómo integrarlo en una herramienta IA

| Item | Class | Target |
|---|---|---|
| Attention Map | c | `ext-attention-map` |
| Cognitive Load Analyzer | b | `audit-design.mjs` form-long, nav-long, choices-many, too-many-font-sizes, text-small |
| Decision Optimizer | a | `hicks-choice-limit` |
| Motivation Designer | a | `completion-moment`, `progressive-commitment` |
| Emotion Mapper | a | `one-emotion` |
| Trust Auditor | b | `audit-honesty.mjs` and psychology question 6 of the polish report |
| Friction Detector | b | `audit-design.mjs` form-long |
| Ethical Persuasion Guard | b | `audit-honesty.mjs` (all anti-manipulation rules) |
| Scroll Narrative Engine | d | `recipe.mjs` narrative per section; `scroll-narrative` |
| Persona Simulator | a | `persona-pass` |
