---
name: technique-layout
description: "Use when choosing or changing how a page is composed: grid, section order, hero composition, sticky elements, density, mobile layout. Triggers: \"layout\", \"maquetación\", \"grid\", \"bento\", \"hero\", \"asimétrico\", \"sticky\", \"cuadrícula\", \"ritmo de secciones\". Finds the layout technique cards of the kit (when to use, when not, steps, check) so you pick one instead of improvising."
---

# Technique: layout

Load this only at the step that composes the page (`compose`, or `tokens` for the layout numbers). The numbers (container, grid, section padding) are in `ai-frontend-guide-kit/experience/LAYOUT-RULES.md`; this skill picks the composition.

## Commands (run them as `flow.mjs next` prints them)

```bash
node ai-frontend-guide-kit/tools/technique.mjs find --area layout --direction <style>   # the chosen direction first
node ai-frontend-guide-kit/tools/technique.mjs find "<need>" --area layout
node ai-frontend-guide-kit/tools/technique.mjs get <id>                                 # one card, under 1 KB
```

## Rules

1. One composition idea per page: a grid and a rhythm. Choose one card for the hero and one for the page rhythm, not five.
2. Design the 360 px column first (`single-column-mobile`), then widen to 768 and 1280.
3. Every card says when not to use it. Read that line before choosing: a bento grid is not for content read in order.
4. A broken or asymmetric grid is allowed once per page, on the signature moment only.
5. After building, run `audit-design.mjs --report`: overflow at the three widths and spacing off the scale are fixed from its list.

Key cards: `bento-grid`, `asymmetric-layout`, `section-rhythm`, `single-column-mobile`, `whitespace-intent`
