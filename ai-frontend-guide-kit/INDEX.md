# Index: start here

This page is enough on its own. You need no other file to start and to follow a route.

## When it applies

Any request about frontend, UI, UX, design, a screen, a component, styling or polish, however small.
A one-line change is the route `iterate`. The flow is never skipped.

## First command, before any file is read or edited

```bash
node ai-frontend-guide-kit/tools/flow.mjs status
```

- A route is active: run `node ai-frontend-guide-kit/tools/flow.mjs next`.
- No route: ask the user what they want, pick it in the table below, run `node ai-frontend-guide-kit/tools/flow.mjs start <route>`.

Then repeat: run `flow.mjs next`, do exactly what it prints, then run the command it prints.
It gives the goal, the exact commands, the template and the done criteria of one micro-step.
`flow.mjs done` refuses a skipped step, an empty file, a `<…>` left in a file and an unregistered piece: fix what it lists.

## Routes

| Route | Use it for |
|---|---|
| `new` | a new frontend or major build |
| `direction` | experience direction only, no UI |
| `ux` | UX only or UX redesign, no UI work |
| `iterate` | a small change or a custom component |
| `polish` | polish only or visual QA |
| `redesign` | visual redesign of an existing screen |
| `visual-feedback` | point-and-change in the browser (React) |
| `architecture` | folder map, or FSD only when asked |

## Tools (`ai-frontend-guide-kit/tools/`; `flow.mjs next` prints the exact command of each, run it as printed)

- `flow.mjs`: declare, follow and close the flow (texts in `flow-steps.mjs`, content checks in `flow-gates.mjs`; `kit-path.mjs` writes the paths they print).
- `context.mjs`: read the project (stack, screens, UI libraries). `ui-map.mjs`: map the frontend (`build`, `impact`, `have`, `check`).
- `tokens.mjs`: design tokens, contrast, CSS theme, DESIGN.md tables. `recipe.mjs`: sections of each page type, and the inventory.
- `pieces.mjs`: the project's own components (`find` before creating, then `add`, `use`, `version`). `memory.mjs`: record decisions.
- `find.mjs`, `get.mjs`: search the catalog, read one entry, register what landed. `scout.mjs`: study a component site the user links.
- `audit-design.mjs` (`--report`), `audit-a11y.mjs`, `audit-honesty.mjs`, `audit-perf.mjs`: audit before closing.
- `excalidraw-mcp.mjs`: draw the screen map. `laya_select.py`: rank candidates, only after the user agrees.

## Rules that always hold

- Search before building: `find.mjs "<need>"`, then `get.mjs <id>`, and `pieces.mjs find "<need>"` for the project's own pieces. Build only when both found nothing, and say why.
- Choose the experience direction before colors or components.
- Record decisions with `memory.mjs add` and pieces with `pieces.mjs`; never keep them only in chat.
- External design skills never start the work; each runs only at the step `flow.mjs next` names.

## Where things are

- `ai-frontend-guide-kit/HELP.md` (Spanish: `HELP.es.md`): answer "what is this" from it, never by exploring.
- `ai-frontend-guide-kit/guides/FLOWS.md`: every route and step. `AGENTS.md` and the other guides are reference only.
- `ai-frontend-guide-kit/catalog/digest.md`: the best of <!--fig:entries-->7,358<!--/fig--> catalog entries per category.
- `ai-frontend-output/`: this project's memory (decisions, pieces, flow state, UI map).
