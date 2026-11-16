---
name: svg-craft
description: "Use when the page needs an icon, a spot illustration, a section divider, a pattern, a background shape or any hand-drawn or imported SVG. Triggers: \"icono\", \"ilustración\", \"svg\", \"divisor de sección\", \"patrón\", \"forma decorativa\", \"blob\", \"ola\". Generates deterministic shapes from design-tokens.json with `svg.mjs gen`, gives the grid and the rules to draw a harmonious icon or illustration by hand, and checks every result with `svg.mjs check`."
---

# SVG craft: generate first, draw only on a grid

The tool is `ai-frontend-guide-kit/tools/svg.mjs` (run it as `flow.mjs next` prints it). Colors always come from `design-tokens.json`: `var(--color-primary, #hex)`, so the drawing follows the theme.

## Generate or draw

| Need | Do |
|---|---|
| Divider, blob, pattern, grid, dots, rings, flowing lines, soft color background, arrow, squiggle, badge, frame, underline | `svg.mjs gen <kind>` (`gen --list` shows the kinds). Same seed, same file. Try `--seed 1`, `2`, `3` and keep the best. |
| An icon or a spot illustration of a thing | Draw it by the method below, on the grid of `gen icon-base`. |
| An icon from a set the user chose | Import it, run `check`, do not redraw it. |

## Method for a harmonious drawing (follow it literally)

1. Canvas: icons `0 0 24 24`; spot illustrations 4:3 (`0 0 400 300`) or 16:9 (`0 0 640 360`). Always a `viewBox`, never fixed width/height.
2. Run `svg.mjs gen icon-base --out grid.svg` and draw inside its live area (2 to 22). Keylines: circle diameter 20, square 18, portrait 16x20, landscape 20x16. Pick the keyline that matches the object and fill it.
3. Use only `<path>`, `<circle>`, `<rect>`, `<line>`, `<polyline>`. Coordinates are whole or half numbers on the grid, at most 2 decimals.
4. One stroke width for the whole drawing: 2 on a 24 canvas (1.5 for a light style). Always `stroke-linecap="round" stroke-linejoin="round"` and `fill="none"` for outline icons.
5. Colors: 2 to 3 from the tokens plus one neutral, never more than 5. Write them as `var(--color-<token>, #hex)`; outline icons use `currentColor`.
6. Corner radius from the tokens (`radius.sm`, `radius.md`): the same radius on every rounded corner.
7. Balance: the same visual weight left and right; equal gaps (2 units) between neighbouring strokes; nothing smaller than 1 unit; a circle looks smaller than a square of the same size, so make it a little bigger.
8. Spot illustration: one subject, one ground shape under it, at most 3 depth layers (back, middle, front; the back one is lighter). Leave a margin of 5% on every side.
9. Add `aria-hidden="true"` when it is decoration; otherwise `role="img"` and `<title>text</title>` as first child.

## Never

- Text turned into paths for a label: write real text in the page.
- Gradients as decoration by default, drop-shadow or heavy filters (more than 2 primitives), more than 5 colors.
- Detail smaller than 1 unit, mixed stroke widths, mixed caps or joins.
- Scripts, event handlers, links or images that load from outside the file.

## The loop (every time)

1. Generate or draw into a file.
2. `svg.mjs check <file> --strict`. Fix the findings from the top and run it again until it prints 0 high, 0 medium.
3. `svg.mjs optimize <file>`, then `check` again.
4. Place it: inline in the component, or one file per icon in a folder. For many icons: `svg.mjs sprite <dir> --out sprite.svg`, used as `<svg><use href="#name"/></svg>`.
5. If it will be used again, register it: `pieces.mjs add <name> --level micro --file <path>`.

## Example 1: an icon (arrow right, 24 canvas)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M5 12h14M13 6l6 6-6 6"/>
</svg>
```

Rules used: live area 2 to 22, one stroke width, round caps and joins, the arrow centered on y 12.

## Example 2: a section divider

```bash
svg.mjs gen wave --layers 3 --seed 4 --color surface-raised --out public/divider.svg
svg.mjs check public/divider.svg --strict
```

Place it between two sections with `class="block w-full"`, `preserveAspectRatio="none"` when it must stretch, and `--flip` to mirror it for the section below.
