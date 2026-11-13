# 03 — Design tokens

Purpose: fix the visual system (color, type, radius, spacing) **before** choosing components, so every reused piece inherits your identity instead of the library's defaults.

The tokens live as data in `design-tokens.json` (W3C Design Tokens format, project root, next to `DESIGN.md`). **You only choose a few values; `tools/tokens.mjs` computes the rest** (tonal ramps, text colors that pass 4.5:1, type scale, spacing, radii, motion, breakpoints) and writes the CSS and the `DESIGN.md` tables from it. Same choices, same bytes.

## The path

1. Choose: primary, accent and neutral color (hex), display and body font, radius (`none|small|medium|large`), density (`compact|regular|spacious`), type ratio (`1.2|1.25|1.333`), motion (`calm|snappy|playful`).
2. `node tools/tokens.mjs init --primary <hex> --font-display <name> ...` (add `--dark` for dashboards and dev tools). It refuses to overwrite an existing file unless `--force`.
3. `node tools/tokens.mjs check`: every `$value` parses, references resolve, and every declared text/background pair reaches its ratio. One numbered line per failure; fix it and run it again.
4. `node tools/tokens.mjs css --out <file>`: the Tailwind v4 `@theme` block (`--color-primary`, `--color-surface`, `--font-display`, `--text-*`, `--spacing-*`, `--radius-*`, `--ease-*`), a dark block when dark tokens exist, and a `prefers-reduced-motion` block. Import it from the global CSS.
5. `node tools/tokens.mjs doc`: the token tables of `DESIGN.md` between `<!-- tokens:start -->` and `<!-- tokens:end -->`; what you write outside the markers is never touched. Write the "Visual intent" paragraph there.

`node tools/tokens.mjs contrast <fg> <bg>` answers AA for any two colors (hex or token names). Never edit the generated CSS or the marked block: change `design-tokens.json` (or the init flags) and run the commands again.

## Source of the choices

**Figma MCP available:** ask the agent to inspect the file and extract the colors, fonts, radius and spacing density. They become the flags of `init`; extra tokens go into `design-tokens.json` by hand, never straight into CSS.

**No Figma:** derive them from the **visual brief** of `ai-frontend-output/ux/EXPERIENCE-BRIEF.md` (style, palette intent, typography personality, composition, motion, anti-generic list) plus `PRODUCT.md`: brand adjectives, competitor contrast, audience expectations. For a system-level reference, search the catalog's design systems:

```bash
node tools/find.mjs --type design-system
node tools/get.mjs <id>   # docs + Figma kit link
```

## Rules

- Semantic names only (`--color-primary`, `--color-surface`), never palette names in components.
- Dark mode from day one if the product is a dashboard or dev tool.
- Contrast: body text ≥ 4.5:1; `check` measures it, the `tokens` step does not close while it fails.
- Motion personality here decides how springs feel in `08-PHILOSOPHY.md`.

## Deliverables

- `design-tokens.json` and `DESIGN.md` with the token tables.
- Tailwind v4 `@theme` block in the global CSS.
- A one-paragraph "visual intent" you can quote when choosing components.

Next: `04-INVENTORY.md`.
