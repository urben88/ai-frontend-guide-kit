# Step: board

The design board of the project (Storybook). `flow.mjs next` prints the commands; these are the judgment notes. The method is in the skill `storybook-board` and `guides/14-DESIGN-BOARD.md`.

## Judgment notes

- Storybook is the user's decision. When `board.mjs detect` says it is missing, ask the user whether to install it, show the exact command it prints, and stop until they answer. Never install it on your own, not even "to help".
- A no is a valid answer: close the step with `flow.mjs done board --declined --reason "<their words>"`. The no stays on record in `flow-state.json`; do not ask again unless the user brings it up.
- A yes: run the printed command in the project root, run `flow.mjs next` again, and continue with the board.
- The board shows the project's own presentational components with made-up data. It never changes logic, routes, stores or API calls, and it never uses real data.
- One story per layout version (`v1-sidebar`, `v2-topbar`, `v3-compact`). A new layout is a new version; an existing version is never overwritten.
- Ask which pages go on the board first; the plan (`board.mjs plan`) comes from `ui-map`, so build the map before.
- The step closes only with Storybook installed, at least one board story and `board.mjs check` at 0 findings, or with the recorded no.

## Common mistakes

- Running `npx storybook init` without asking.
- Importing a store, a router or an API client into a story to "make it work" instead of passing mock props.
- Applying a chosen layout to the real page inside this step: that is a separate request.
