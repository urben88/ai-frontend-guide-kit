# Step: architecture

Where code goes. `flow.mjs next` prints the commands; these are the judgment notes.

## Judgment notes

- The default is `map`: it records folder roles in `ai-frontend-output/architecture.json` and never moves or renames anything.
- `fsd-new` (new project) and `fsd-refactor` (existing one) run only when the user asks, through the `frontend-refactor` skill, one approved slice at a time. Never apply FSD unasked or silently, not even on a greenfield repo.
- Never rename FSD layers onto the kit's roles or component types.
- After each slice run `ui-map.mjs build` and `ui-map.mjs check`: the map shows what moved and what is now a stray or an unresolved import.
- Existing violations of the separation philosophy (`guides/08-PHILOSOPHY.md`) are recorded, not changed, unless the user asks.

## Common mistakes

- Treating "organize the folders" as a request for FSD. Ask which one the user means.
- Moving several slices at once and losing which one broke the imports.
