# Step: tokens

Colors, type, spacing and motion become data. `flow.mjs next` prints the commands; these are the judgment notes.

## Judgment notes

- You choose a few values from the visual brief (primary, accent, neutral, two fonts, radius, density, type ratio). `tokens.mjs init` computes everything else: tonal ramps, semantic colors with text that passes 4.5:1, scales, motion.
- A contrast failure is fixed by changing a flag and running `init` again with `--force`, or by editing that one value in `design-tokens.json`, then `check` again. Never loosen the pair.
- Colors, fonts and sizes later come from the tokens (the Tailwind theme that `css` writes). A hex value typed in a component is a defect that `audit-design.mjs` reports.
- Values read from Figma (when its MCP is connected) go into the `init` flags; do not copy a whole Figma palette.
- A reference system (`find.mjs --type design-system`) is raw material for choosing values, not a file to copy.
- Dark theme only when the brief says so (for example a console).

## Common mistakes

- Writing `DESIGN.md` tables by hand: `tokens.mjs doc` writes them between its markers.
- Hand-writing a color ramp or picking mid-tones by eye.
- Choosing a brand color and a text color without running `check`.
