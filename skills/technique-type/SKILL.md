---
name: technique-type
description: "Use when choosing fonts, the type scale or the look of headlines and text: pairing, fluid type, oversized or kinetic headlines, text over images, numbers in tables. Triggers: \"tipografía\", \"fuente\", \"font\", \"titular\", \"type scale\", \"legibilidad\", \"headline\", \"text on image\". Finds the type technique cards of the kit so you choose with a reason and a check."
---

# Technique: type

Load this only at the step that fixes the visual system (`tokens`) or when a headline needs a distinctive treatment. The scale itself comes from `tokens.mjs init`; you choose the two fonts and the ratio.

## Commands (run them as `flow.mjs next` prints them)

```bash
node ai-frontend-guide-kit/tools/technique.mjs find --area type --direction <style>
node ai-frontend-guide-kit/tools/technique.mjs find "<need>" --area type
node ai-frontend-guide-kit/tools/technique.mjs get <id>
```

## Rules

1. Two families at most: one display, one body. Avoid the default AI picks when the brief asks for personality (`avoid-default-fonts`).
2. At most 3 text sizes visible at once; rank levels by size and weight, never by color alone.
3. Sizes, line height and tracking come from the tokens; a font size typed in a component is a defect that the design audit reports.
4. Text over an image needs a scrim or a solid area behind it, and a contrast check (`tokens.mjs contrast`).
5. Every web font has a fallback and is self-hosted when the project allows it; numbers that line up use tabular figures.

Key cards: `type-pairing`, `fluid-type`, `type-weight-contrast`, `text-on-image`, `tabular-numbers`
