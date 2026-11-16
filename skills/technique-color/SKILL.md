---
name: technique-color
description: "Use when choosing or adjusting color: palette mood, accents, gradients, duotone images, a real dark mode, states that must not rely on color alone. Triggers: \"color\", \"paleta\", \"gradiente\", \"dark mode\", \"modo oscuro\", \"acento\", \"contraste\". Finds the color technique cards of the kit; the contrast and the ramps are computed by tokens.mjs, not by eye."
---

# Technique: color

Load this only at the step that fixes the visual system (`tokens`) or when a screen needs a color decision. You choose primary, accent and neutral; `tokens.mjs` computes ramps and contrast.

## Commands (run them as `flow.mjs next` prints them)

```bash
node ai-frontend-guide-kit/tools/technique.mjs find --area color --direction <style>
node ai-frontend-guide-kit/tools/technique.mjs find "<need>" --area color
node ai-frontend-guide-kit/tools/technique.mjs get <id>
```

## Rules

1. One dominant color, one accent, neutrals for the rest. Too many colored items means the accent has lost its job (`accent-discipline`).
2. Pick the palette from the mood of the direction (editorial, industrial, premium, brutalist cards), then run `tokens.mjs check`: body text is 4.5:1 or more.
3. A state (error, success, status, chart series, link) always has a second signal: an icon, a label or a shape (`color-not-only`).
4. A dark theme is built with its own surface levels, not by inverting the light one (`dark-mode-elevation`); only when the brief asks for it.
5. A gradient has a purpose (depth or a highlight) and uses token colors; decorative gradients come from `svg.mjs gen gradient-mesh`.

Key cards: `accent-discipline`, `color-not-only`, `dark-mode-elevation`, `purposeful-gradient`, `palette-editorial`
