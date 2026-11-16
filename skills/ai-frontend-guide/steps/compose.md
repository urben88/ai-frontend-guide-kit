# Step: compose

Build each screen from what exists. `flow.mjs next` prints each part and its exact commands; these are the judgment notes.

## Judgment notes

- Order of preference for every row: a component of this project, an own piece (`pieces.mjs find`), a catalog entry, and only then new code. Reuse, then adapt, then build.
- `find.mjs` ranks the big free sources first (ReUI, shadcn/ui, Shadcn Space): pick from the top and say why when you skip one. A search that was never run is not a reason to build.
- The Query column of the inventory holds the first search words; `--category <Category>` narrows them. When two searches find nothing, build and say so.
- Licenses are facts. Read `license_type` and `commercial_use` before using an entry; `non-commercial` never goes into commercial work, `unknown` is verified on its page first.
- Present 2 or 3 combinations with the facts from `get` before closing a selection. A web-found component stays `provisional` until its license is checked.
- Install with the command `get.mjs` prints, never one typed from memory.
- Adapt: make every piece look like this product (tokens, copy, states) and register it. Keep high-impact animation to 1 or 2 per view and respect the brief's anti-generic list.
- `hallmark` and `design-taste-frontend` build only for a row with decision `build`, and only after the search for that block.

- Technique skills, only here and only for what the screen needs: `technique-layout`, `technique-motion`, `technique-imagery`, `technique-3d` (3D only when asked). `flow.mjs next` proposes the cards that fit the chosen direction.

## Common mistakes

- Writing a component first and searching afterwards.
- Recording the decision at the end instead of right after each row.
- A new piece for a polish request ("more spacing"): edit the file and run `pieces.mjs version`, or add a variant.
- Copying third-party source into the kit or removing license notices.
