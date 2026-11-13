# Step: iterate

A small change or a custom component, without repeating the UX phase. `flow.mjs next` prints the commands; these are the judgment notes.

## Judgment notes

- Locate first. `ui-map.mjs impact` lists the owner, users, routes and strays of what you change: change every one it lists, none may be left out. Unresolved imports are never assumed fine.
- Reuse first: `ui-map.mjs have "<name>"` (it resolves aliases: `modal` finds a `Dialog`), then `pieces.mjs find "<need>"`, then the catalog. Build only when the searches found nothing, and say so.
- "More spacing", "bigger image" and similar mean editing the piece's file and recording `pieces.mjs version <name>`, or adding a variant. They never mean a new piece.
- Record without waiting to be asked: `pieces.mjs use` when a piece goes in, `version` after an edit, `like` or `dislike` when the user reacts, `note` for any remark.
- A catalog component that landed in the project is registered with `get.mjs <id> --landed <path>`, so its origin is kept.
- Keep the change inside what the user asked: existing violations of the separation rules are recorded, never fixed unasked.

## Common mistakes

- Changing the component and forgetting its other users.
- Closing the step with a build decision that has no registered piece: `done` refuses it.
- Writing the report with every line marked done and no result. Each line needs its result or its reason.
