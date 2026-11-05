# Index: read this first

This is the single entry point of the AI Frontend Guide kit. Everything else is reached from here.

## When it applies

Any request about frontend, UI, UX, design, a screen, a component, styling or polish, however small.
The flow is not optional and is never skipped, not even for a one-line change (use the route `iterate`).

## First command, before any file is read or edited

```bash
node ai-frontend-guide-kit/tools/flow.mjs status
```

It shows the active route and step. With no route, ask the user what they want, then declare one:
`node ai-frontend-guide-kit/tools/flow.mjs start <route>`. Follow `flow.mjs next` and close each step with
`flow.mjs done <step>`; it refuses a skipped step, a missing artifact, a build with no registered piece and a piece
changed since its last version.

## Routes

| Route | Use it for |
|---|---|
| `new` | a new frontend or major build (intake, direction, ux, tokens, compose, polish) |
| `direction` | experience direction only, no UI |
| `ux` | UX only or UX redesign, no UI work |
| `iterate` | a small change or custom component (intake, iterate, polish) |
| `polish` | polish only or visual QA |
| `redesign` | visual redesign of an existing screen |
| `visual-feedback` | point-and-change in the browser (React) |
| `architecture` | folder map, or FSD only when asked |

Every step, with its guide, skill, tools and output: `ai-frontend-guide-kit/guides/FLOWS.md`.

## Tool for each job (`ai-frontend-guide-kit/tools/`)

| Job | Tool |
|---|---|
| Declare, follow and close the flow | `flow.mjs` |
| Read the project context | `context.mjs` |
| Map the frontend, find owners, users and strays | `ui-map.mjs` (`build`, `impact`, `have`, `check`) |
| Before creating a component: own piece, variant, other project, catalog | `pieces.mjs find "<need>"` |
| Register, use, version and rate the project's pieces | `pieces.mjs` (`add`, `use`, `version`, `like`, `note`) |
| Search the catalog, read one entry, register what landed | `find.mjs`, `get.mjs` (`--landed <path>`) |
| Record every decision and reuse combinations | `memory.mjs` |
| Study a component site the user links | `scout.mjs` |
| Rank candidates (optional, ask the user first) | `laya_select.py` |
| Draw the screen map | `excalidraw-mcp.mjs` |
| Audit before closing | `audit-a11y.mjs`, `audit-honesty.mjs`, `audit-perf.mjs` |

## Rules that always hold

- Reuse, adapt, then build: search before writing any component.
- Choose the experience direction before colors or components.
- Record decisions with `memory.mjs add` and pieces with `pieces.mjs`; never keep them only in chat.
- External design skills never start the work; each runs only at its flow step.

## Where things are

- `ai-frontend-guide-kit/AGENTS.md`: the full rules of the kit.
- `ai-frontend-guide-kit/guides/00-START-HERE.md`: the router; the other guides are numbered 01 to 13.
- `ai-frontend-guide-kit/HELP.md` (Spanish: `HELP.es.md`): answer "what is this" from it, never by exploring.
- `ai-frontend-guide-kit/catalog/digest.md`: the best entries per category; `experience/` holds the direction layer.
- `ai-frontend-output/`: this project's memory (decisions, pieces, flow state, UI map).
