# Step: redesign

A visual redesign of an existing screen: new look, same flows, content and wiring. `flow.mjs next` prints the commands; these are the judgment notes.

## Judgment notes

- Agree the redesign with the user before touching code: what changes (look, spacing, hierarchy) and what must not (routes, data, behavior, copy that carries meaning).
- The `design-taste-frontend` skill runs here in its redesign mode, inside the project's stack, keeping brand values. It needs Node 22 or later and Chrome, Edge or Chromium.
- Locate everything the screen touches with `ui-map.mjs impact` and change every owner and user it lists.
- New visuals come from the tokens and the brief, not from the skill's defaults. If the skill contradicts `PRODUCT.md`, `DESIGN.md` or the brief, the kit's files win.
- Record the change with `memory.mjs add ... --decision adapt --notes "<what changed>"` and `pieces.mjs version` after editing a registered piece.

## Common mistakes

- Changing behavior or wiring because the new design "needs" it. Ask first.
- Redesigning the next screen too, because it looked similar. One screen per run of the route.
- Skipping polish: the route continues into `polish`, which measures the result.
